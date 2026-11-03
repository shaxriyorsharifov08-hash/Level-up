// Records the LEVEL UP video guide from the real app (README 4v).
// Frames come from Chrome's screencast at 2x phone resolution; captions are
// logged with the same clock so the subtitles line up with what is on screen.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const OUT = path.resolve(process.argv[2] || 'video-work');
fs.rmSync(OUT + '/frames', { recursive: true, force: true }); fs.mkdirSync(OUT + '/frames', { recursive: true });
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.route(/^https?:\/\//, r => /fonts\.(googleapis|gstatic)\.com/.test(r.request().url()) ? r.continue() : r.abort());
  await page.goto('file://' + path.resolve(__dirname, '..', 'index.html'), { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.state && window.switchPage);
  await page.waitForTimeout(1500); // fonts
  const frames = [], caps = [];
  const cdp = await ctx.newCDPSession(page);
  let n = 0;
  cdp.on('Page.screencastFrame', async f => {
    const file = path.join(OUT, 'frames', String(n++).padStart(5, '0') + '.jpg');
    fs.writeFileSync(file, Buffer.from(f.data, 'base64'));
    frames.push({ file, t: f.metadata.timestamp });
    try { await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }); } catch (e) {}
  });
  const injectTap = () => page.evaluate(() => {
    window.__tap = (x, y) => {
      const d = document.createElement('div');
      d.style.cssText = `position:fixed;left:${x - 24}px;top:${y - 24}px;width:48px;height:48px;border-radius:50%;background:rgba(255,255,255,.45);border:3px solid #fff;box-shadow:0 0 18px rgba(0,209,255,.9);z-index:99999;pointer-events:none;transition:transform .55s ease,opacity .55s ease`;
      document.body.appendChild(d);
      requestAnimationFrame(() => requestAnimationFrame(() => { d.style.transform = 'scale(1.9)'; d.style.opacity = '0'; }));
      setTimeout(() => d.remove(), 700);
    };
    // a moving "keep painting" dot so quiet moments still produce frames
    if (!document.getElementById('__tick')) { const t = document.createElement('div'); t.id = '__tick'; t.style.cssText = 'position:fixed;left:0;top:0;width:1px;height:1px;opacity:.01;z-index:99999;pointer-events:none'; document.body.appendChild(t); setInterval(() => { t.style.left = (Math.random() * 2) + 'px'; }, 40); }
  });
  const now = () => Date.now() / 1000;
  const cap = (text) => caps.push({ t: now(), text });
  const wait = (ms) => page.waitForTimeout(ms);
  async function tap(sel, opts) {
    const loc = page.locator(sel).first();
    await loc.scrollIntoViewIfNeeded().catch(() => {});
    const bx = await loc.boundingBox();
    const x = bx.x + bx.width / 2, y = bx.y + bx.height / 2;
    await page.evaluate(([x, y]) => window.__tap && window.__tap(x, y), [x, y]);
    await wait(260);
    await page.mouse.click(x, y);
    await wait((opts && opts.after) || 500);
  }
  async function closeAnnouncements(pause) {
    for (let i = 0; i < 8; i++) {
      const open = await page.evaluate(() => document.getElementById('announceOv').classList.contains('show'));
      if (!open) return;
      await wait(pause || 1800);
      await tap('#annOk', { after: 700 });
    }
  }
  await injectTap();
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 88, maxWidth: 780, maxHeight: 1688, everyNthFrame: 1 });
  const t0 = now();
  // 1. start
  cap('Open LEVEL UP and tap START. No account is needed.');
  await wait(2800);
  await tap('#entGuestBtn', { after: 300 });
  await page.evaluate(() => { state.tutorialDone = true; save(); }); // the video shows the app itself
  await page.waitForSelector('#announceOv.show', { timeout: 5000 }).catch(() => {});
  cap('The System welcomes you and gives you your first quest.');
  await wait(2600);
  await closeAnnouncements(400);
  await injectTap();
  // 2. today + complete
  cap('TODAY shows your Daily Quest: small tasks that reset every day.');
  await wait(3200);
  cap('Do the task for real, then tap COMPLETE to earn XP.');
  await tap('#pkgList .pkg-btn', { after: 2200 });
  await closeAnnouncements();
  // 3. add a quest
  cap('Tap + to add your own goal.');
  await wait(800);
  await tap('#fab', { after: 900 });
  cap('Name it, pick an icon and how hard it is, then save. Daily quests unlock as you level up.');
  await page.locator('#qmName').click();
  await page.keyboard.type('Read one book', { delay: 90 });
  await wait(500);
  await tap('#qmEmoji .emoji-opt:has-text("📚")', { after: 500 });
  await tap('#qmFreq .seg-btn[data-v="longterm"]', { after: 500 });
  await tap('#qmTier .seg-btn[data-v="medium"]', { after: 500 });
  await tap('#qmStat .seg-btn[data-v="INT"]', { after: 500 });
  await tap('#qmSave', { after: 1500 });
  await closeAnnouncements();
  // 4. quests tab, complete it
  cap('Your quests and goals live in QUESTS.');
  await tap('#nav .nav-btn[data-tab="quests"]', { after: 1200 });
  const qid = await page.evaluate(() => state.quests.filter(q => q.name === 'Read one book')[0].id);
  await page.locator(`.btn-complete[data-id="${qid}"]`).scrollIntoViewIfNeeded();
  await wait(900);
  // 5. focus timer
  cap('Tap the timer to time your focus. Real work time is saved.');
  await tap(`[data-act="timer"][data-id="${qid}"]`, { after: 6500 });
  await tap('#foFinish', { after: 1800 });
  cap('Done? Tap COMPLETE. Harder goals give more XP.');
  await tap(`.btn-complete[data-id="${qid}"]`, { after: 2200 });
  await closeAnnouncements();
  // 6. level up (demo account: the bar is nearly full)
  cap('Fill the XP bar to LEVEL UP. Each level brings rewards and opens new parts of the app.');
  await page.evaluate(() => { state.xp = xpForLevel(state.level) - 4; save(); switchPage('home'); });
  await injectTap();
  await wait(1500);
  await tap('#pkgList .pkg-btn:not([disabled])', { after: 1200 });
  await closeAnnouncements(2600);
  // 7. progress
  cap('PROGRESS: your hero, the level road with its rewards, and your stats.');
  await tap('#nav .nav-btn[data-tab="progress"]', { after: 1500 });
  await tap('#subnav .sub-btn[data-page="story"]', { after: 2600 });
  // 8. more
  cap('MORE: Learn & Grow, Clan, Budget, this Guide and Settings.');
  await tap('#nav .nav-btn[data-tab="more"]', { after: 2600 });
  await tap('#moreList .more-row[data-page="guide"]', { after: 1200 });
  cap('Watch this video and replay the tour any time in MORE → GUIDE.');
  await wait(3000);
  await tap('#nav .nav-btn[data-tab="today"]', { after: 600 });
  cap('That is all. Now it is your turn. Good luck, Hero!');
  await wait(3200);
  const tEnd = now();
  await cdp.send('Page.stopScreencast');
  await wait(300);
  fs.writeFileSync(OUT + '/timeline.json', JSON.stringify({ t0, tEnd, frames, caps }, null, 1));
  console.log('frames', frames.length, 'seconds', (tEnd - t0).toFixed(1), 'captions', caps.length);
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
