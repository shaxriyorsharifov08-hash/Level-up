/* Laps, the alarm, and uploaded sounds. The rules that matter: audio bytes
   never enter the save, a session ends itself when its laps are done, and the
   alarm is scheduled on the audio clock rather than fired by a timer. */
const { test, expect } = require("@playwright/test");
const { bootAsGuest, drainAnnouncements } = require("./helpers");

async function startGrind(page, opts) {
  await page.evaluate((o) => {
    state.quests = [makeQuest("🏃", "Morning run", "d", "daily", [], "easy", "END", "", false, 1)];
    state.focus.mode = "grind";
    state.focus.work = o.work; state.focus.rest = o.rest; state.focus.laps = o.laps;
    save();
    startTimer(state.quests[0].id);
  }, opts);
  await page.waitForSelector("#focusOv.show");
}

/* build a real audio file inside the page and push it through the real path */
async function uploadSound(page, seconds, start, len) {
  return page.evaluate(async (a) => {
    const ctx = audio();
    const n = Math.round(ctx.sampleRate * a.seconds);
    const ab = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = ab.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.sin(i * 0.05) * 0.4;
    const wav = wavFromBuffer(ab);
    const bin = atob(wav.split(",")[1]);
    const u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    trimOpen(new File([u8], "my-song.wav", { type: "audio/wav" }));
    await new Promise((r) => setTimeout(r, 700));
    document.getElementById("foTrimStart").value = String(a.start);
    document.getElementById("foTrimLen").value = String(a.len);
    trimUpdate();
    document.getElementById("foTrimSave").click();
    await new Promise((r) => setTimeout(r, 1400));
    return { sounds: state.focus.sounds, alarm: state.focus.alarm };
  }, { seconds, start, len });
}

test.describe("laps", () => {
  test("the lap count is editable, by preset and by hand", async ({ page }) => {
    await bootAsGuest(page);
    await startGrind(page, { work: 25, rest: 5, laps: 4 });
    await page.click("#foCfgBtn");
    await page.waitForTimeout(250);
    await page.click('#foLapChips [data-lap="6"]');
    await page.waitForTimeout(150);
    expect(await page.evaluate(() => [fo().laps, state.activeTimer.laps])).toEqual([6, 6]);

    await page.fill("#foLaps", "3");
    await page.dispatchEvent("#foLaps", "change");
    await page.waitForTimeout(150);
    expect(await page.evaluate(() => fo().laps)).toBe(3);

    /* nonsense is clamped, never left to break the cycle maths */
    await page.fill("#foLaps", "999");
    await page.dispatchEvent("#foLaps", "change");
    await page.waitForTimeout(150);
    expect(await page.evaluate(() => fo().laps)).toBe(24);
  });

  test("the window counts the lap you are on", async ({ page }) => {
    await bootAsGuest(page);
    await startGrind(page, { work: 25, rest: 5, laps: 4 });
    await page.evaluate(() => { state.activeTimer.accumulated = 62 * 60; renderFocus(); });
    await page.waitForTimeout(200);
    expect(await page.textContent("#foPhase")).toBe("WORK · CYCLE 3 / 4");
  });

  test("the session ends itself once the laps are done", async ({ page }) => {
    await bootAsGuest(page);
    await startGrind(page, { work: 25, rest: 5, laps: 2 });
    const r = await page.evaluate(() => {
      state.timeHistory = {}; state.timeBy = {};
      const before = grindDone(state.activeTimer);
      state.activeTimer.accumulated = 60 * 60;   /* two whole 25/5 cycles */
      const done = grindDone(state.activeTimer);
      grindTick();
      return { before: before, done: done, running: !!state.activeTimer,
               logged: state.timeHistory[todayStr()] };
    });
    await drainAnnouncements(page);
    expect(r.before).toBe(false);
    expect(r.done).toBe(true);
    expect(r.running).toBe(false);
    expect(r.logged).toBe(2 * 25 * 60);   /* rest still not counted as work */
  });

  test("ENDLESS never ends itself", async ({ page }) => {
    await bootAsGuest(page);
    await startGrind(page, { work: 25, rest: 5, laps: 0 });
    const r = await page.evaluate(() => {
      state.activeTimer.accumulated = 20 * 3600;   /* twenty hours in */
      grindTick();
      return { done: grindDone(state.activeTimer), running: !!state.activeTimer };
    });
    expect(r.done).toBe(false);
    expect(r.running).toBe(true);
  });
});

test.describe("the alarm", () => {
  test("every built-in tone exists and is choosable", async ({ page }) => {
    await bootAsGuest(page);
    await startGrind(page, { work: 25, rest: 5, laps: 4 });
    await page.click("#foCfgBtn");
    await page.waitForTimeout(250);
    const keys = await page.evaluate(() =>
      Array.from(document.querySelectorAll("#foToneChips [data-tone]")).map((b) => b.getAttribute("data-tone")));
    expect(keys.length).toBe(6);
    for (const k of keys) {
      await page.click('#foToneChips [data-tone="' + k + '"]');
      await page.waitForTimeout(60);
      expect(await page.evaluate(() => fo().alarm)).toBe(k);
    }
  });

  test("it is scheduled on the audio clock, not fired by a timer", async ({ page }) => {
    await bootAsGuest(page);
    await startGrind(page, { work: 25, rest: 5, laps: 4 });
    /* a throttled or sleeping tab would never run a setTimeout callback, so the
       sound has to be handed to the audio hardware the moment the phase starts */
    const r = await page.evaluate(() => {
      alarmDisarm();
      state.activeTimer.accumulated = 0;
      alarmArm(true);
      const armedCount = alarmNodes.length;
      const tag = armedFor;
      return { armedCount: armedCount, tag: tag, oscillatorsUsed: armedCount === 0 };
    });
    /* built-in tones schedule oscillators through sfxTone rather than buffers,
       so what we can assert here is that arming happened and is tagged */
    expect(r.tag).toContain(":work:");

    /* an uploaded sound schedules real buffer sources we can count */
    await uploadSound(page, 4, 0, 3);
    const n = await page.evaluate(() => new Promise((res) => {
      alarmDisarm();
      alarmArm(true);
      setTimeout(() => res(alarmNodes.length), 500);
    }));
    expect(n).toBeGreaterThan(0);
  });

  test("re-arming cancels what was already scheduled", async ({ page }) => {
    await bootAsGuest(page);
    await startGrind(page, { work: 25, rest: 5, laps: 4 });
    await uploadSound(page, 4, 0, 3);
    const r = await page.evaluate(() => new Promise((res) => {
      alarmDisarm();
      alarmArm(true);
      setTimeout(() => {
        const first = alarmNodes.length;
        alarmArm(true);
        setTimeout(() => res({ first: first, second: alarmNodes.length }), 400);
      }, 400);
    }));
    /* not first+second: the old voices were stopped and dropped */
    expect(r.second).toBe(r.first);
  });

  test("stopping the timer disarms the alarm and drops the keep-alive", async ({ page }) => {
    await bootAsGuest(page);
    await startGrind(page, { work: 25, rest: 5, laps: 4 });
    const r = await page.evaluate(() => {
      grindTick();
      const aliveDuring = !!keepAliveSrc;
      stopTimer(true);
      return { aliveDuring: aliveDuring, aliveAfter: !!keepAliveSrc, armed: armedFor, nodes: alarmNodes.length };
    });
    await drainAnnouncements(page);
    expect(r.aliveDuring).toBe(true);
    expect(r.aliveAfter).toBe(false);
    expect(r.armed).toBe("");
    expect(r.nodes).toBe(0);
  });

  test("the settings tell the truth about when it cannot ring", async ({ page }) => {
    await bootAsGuest(page);
    const txt = await page.evaluate(() => alarmReachText());
    expect(txt).toContain("force-close");
    expect(txt).toContain("power the phone off");
    /* no weasel wording: it must not claim to work when the phone is off */
    expect(txt.toLowerCase()).not.toContain("even when your phone is off");
  });

  test("volume and repeat count are kept", async ({ page }) => {
    await bootAsGuest(page);
    await startGrind(page, { work: 25, rest: 5, laps: 4 });
    await page.click("#foCfgBtn");
    await page.waitForTimeout(250);
    await page.fill("#foRepeat", "5");
    await page.dispatchEvent("#foRepeat", "change");
    await page.evaluate(() => {
      const v = document.getElementById("foVol");
      v.value = "40"; v.dispatchEvent(new Event("input"));
    });
    await page.waitForTimeout(150);
    expect(await page.evaluate(() => [fo().alarmRepeat, Math.round(fo().alarmVol * 100)])).toEqual([5, 40]);

    /* absurd repeat counts are clamped */
    await page.fill("#foRepeat", "99");
    await page.dispatchEvent("#foRepeat", "change");
    await page.waitForTimeout(150);
    expect(await page.evaluate(() => fo().alarmRepeat)).toBe(6);
  });
});

test.describe("uploaded sounds", () => {
  test("a song is trimmed to the chosen part and stored in the vault only", async ({ page }) => {
    await bootAsGuest(page);
    await startGrind(page, { work: 25, rest: 5, laps: 4 });
    const r = await uploadSound(page, 12, 4, 6);
    expect(r.sounds.length).toBe(1);
    expect(r.sounds[0].name).toBe("my-song");
    expect(r.sounds[0].sec).toBe(6);                       /* the slice, not the song */
    expect(Object.keys(r.sounds[0]).sort()).toEqual(["id", "name", "sec"]);
    expect(r.alarm).toBe("snd:" + r.sounds[0].id);         /* and it becomes the alarm */

    const clean = await page.evaluate(() => ({
      save: JSON.stringify(state).indexOf("data:audio") !== -1,
      local: (localStorage.getItem(SKEY) || "").indexOf("data:audio") !== -1
    }));
    expect(clean.save).toBe(false);
    expect(clean.local).toBe(false);
  });

  test("the stored clip really is the length that was chosen", async ({ page }) => {
    await bootAsGuest(page);
    await startGrind(page, { work: 25, rest: 5, laps: 4 });
    const r = await uploadSound(page, 12, 2, 5);
    const dur = await page.evaluate((id) => new Promise((res) => {
      sndBufCache = {};                       /* force a real read and decode */
      sndLoadBuf(id, (ab) => res(ab ? ab.duration : 0));
    }), r.sounds[0].id);
    expect(dur).toBeGreaterThan(4.5);
    expect(dur).toBeLessThan(5.5);
  });

  test("the slice can never exceed 30 seconds", async ({ page }) => {
    await bootAsGuest(page);
    await startGrind(page, { work: 25, rest: 5, laps: 4 });
    const r = await uploadSound(page, 60, 0, 120);
    expect(r.sounds[0].sec).toBe(30);
  });

  test("deleting the sound that was the alarm falls back to a built-in", async ({ page }) => {
    await bootAsGuest(page);
    await startGrind(page, { work: 25, rest: 5, laps: 4 });
    const r = await uploadSound(page, 6, 0, 3);
    const after = await page.evaluate(async (id) => {
      sndRemove(id);
      await new Promise((res) => setTimeout(res, 200));
      const gone = await new Promise((res) => { sndBufCache = {}; sndLoadBuf(id, res); });
      return { alarm: state.focus.alarm, sounds: state.focus.sounds.length, gone: !gone };
    }, r.sounds[0].id);
    expect(after.alarm).toBe("chime");
    expect(after.sounds).toBe(0);
    expect(after.gone).toBe(true);
  });

  test("an older save with no sound settings still opens", async ({ page }) => {
    await bootAsGuest(page);
    const r = await page.evaluate(() => {
      const old = JSON.parse(localStorage.getItem(SKEY));
      old.focus = { theme: "void" };
      localStorage.setItem(SKEY, JSON.stringify(old));
      load();
      return { alarm: state.focus.alarm, laps: state.focus.laps,
               sounds: state.focus.sounds.length, rep: state.focus.alarmRepeat };
    });
    expect(r.alarm).toBe("chime");
    expect(r.sounds).toBe(0);
    expect(typeof r.laps).toBe("number");
  });
});
