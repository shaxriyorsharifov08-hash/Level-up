/* THE SYSTEM AGENT (README 4aa): scripts/nightly-report.mjs.
   It runs here in plain Node against a fake GitHub, a fake live site and a
   fake model, so every path is proven without a network: one issue is opened
   for a broken night, updated (not duplicated) on the next, closed when all
   is well; the AI summary is optional and only ever sees test names and
   errors; and the script holds no secret and needs no package. */
const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");
const { test, expect } = require("@playwright/test");

const SRC = path.resolve(__dirname, "..", "scripts", "nightly-report.mjs");
const WF = path.resolve(__dirname, "..", ".github", "workflows", "nightly.yml");
let mod;

/* the shape Playwright's JSON reporter writes */
function results(fails, opts) {
  const o = opts || {};
  const spec = (title, status, msg) => ({
    title, file: "mentor.spec.js", line: 12,
    tests: [{ status, results: status === "unexpected"
      ? [{ status: "failed", error: { message: "\u001b[31mError: " + msg + "\u001b[39m\n\nExpected: 1\nReceived: 2" } }]
      : [{ status: "passed" }] }]
  });
  const specs = [spec("answers in three languages", "expected"), spec("reads the record", o.flaky ? "flaky" : "expected")];
  (fails || []).forEach((f) => specs.push(spec(f, "unexpected", f + " broke")));
  return { suites: [{ title: "mentor.spec.js", file: "mentor.spec.js", specs: [], suites: [{ title: "the Mentor", file: "mentor.spec.js", specs }] }], errors: o.errors || [], stats: {} };
}
/* a fake GitHub (issues + comments), a fake live site and a fake model */
function world(opts) {
  const o = opts || {};
  const issues = (o.issues || []).map((i) => Object.assign({ state: "open", labels: [{ name: "nightly-tests" }] }, i));
  const calls = [], comments = [], labels = [];
  let next = 100;
  const fetch = async (url, init) => {
    const method = (init && init.method) || "GET";
    const body = init && init.body ? JSON.parse(init.body) : null;
    calls.push({ url: String(url), method, body, headers: (init && init.headers) || {} });
    const res = (status, j) => new Response(j === undefined ? null : JSON.stringify(j), { status, headers: { "content-type": "application/json" } });
    if (String(url).startsWith("https://live.example")) {
      if (o.liveDown) return new Response("Not Found", { status: 404 });
      return new Response("<!doctype html><title>LEVEL UP</title>", { status: 200 });
    }
    if (String(url).startsWith("https://models.example")) {
      if (o.aiFails) return res(500, { error: "x" });
      return res(200, { choices: [{ message: { content: "Probably a date issue in mentorPlan." } }] });
    }
    const m = /\/repos\/me\/app(\/.*)$/.exec(String(url));
    if (!m) throw new Error("unexpected fetch " + url);
    const p = m[1];
    if (method === "GET" && p.startsWith("/issues?")) return res(200, issues.filter((i) => i.state === "open"));
    if (method === "POST" && p === "/labels") { if (o.labelExists) return res(422, { message: "already_exists" }); labels.push(body); return res(201, body); }
    if (method === "POST" && p === "/issues") { const i = { number: next++, title: body.title, body: body.body, state: "open", labels: body.labels }; issues.push(i); return res(201, i); }
    let mm = /^\/issues\/(\d+)\/comments$/.exec(p);
    if (mm && method === "POST") { comments.push({ n: +mm[1], body: body.body }); return res(201, { id: comments.length }); }
    mm = /^\/issues\/(\d+)$/.exec(p);
    if (mm && method === "PATCH") { const i = issues.find((x) => x.number === +mm[1]); Object.assign(i, body); return res(200, i); }
    return res(404, {});
  };
  return { fetch, issues, calls, comments, labels };
}
const ENV = { GITHUB_TOKEN: "gh-test-token", GITHUB_REPOSITORY: "me/app", GITHUB_API_URL: "https://api.example", GITHUB_RUN_ID: "42", GITHUB_SERVER_URL: "https://github.example", GITHUB_REF_NAME: "main", LIVE_URL: "https://live.example/app/", MODELS_URL: "https://models.example/chat" };
const NOW = new Date("2026-11-08T01:23:00Z");
async function night(w, report, env) {
  const readFile = async () => { if (report === null) throw new Error("ENOENT"); return JSON.stringify(report); };
  return mod.run({ env: Object.assign({}, ENV, env || {}), fetch: w.fetch, readFile, now: NOW });
}
test.describe("the nightly system agent", () => {
  test.beforeAll(async () => { mod = await import(pathToFileURL(SRC).href); });

  test("reads Playwright's results: failures with clean messages, flaky tests, a crashed run", () => {
    const s = mod.summarize(results(["keeps the streak"], { flaky: true }));
    expect([s.total, s.passed, s.failed.length, s.flaky.length]).toEqual([3, 2, 1, 1]);
    expect(s.failed[0].title).toBe("the Mentor › keeps the streak");
    expect(s.failed[0].where).toBe("mentor.spec.js:12");
    expect(s.failed[0].error.split("\n")[0]).toBe("Error: keeps the streak broke"); /* colour codes stripped */
    expect(mod.summarize(null).crashed[0]).toContain("No test results");
    expect(mod.summarize(results([], { errors: [{ message: "SyntaxError in index.html" }] })).crashed).toEqual(["SyntaxError in index.html"]);
  });

  test("a broken night opens ONE issue; the next night updates it; a good night closes it", async () => {
    const w = world();
    expect(await night(w, results(["keeps the streak"]))).toBe(1);
    expect(w.issues.length).toBe(1);
    const i = w.issues[0];
    expect(i.title).toBe("Nightly check: 1 failing test");
    expect(i.labels).toEqual(["nightly-tests"]);
    expect(w.labels.map((l) => l.name)).toEqual(["nightly-tests"]); /* created first, so tomorrow finds the issue */
    expect(i.body).toContain("| the Mentor › keeps the streak | `mentor.spec.js:12` | Error: keeps the streak broke |");
    expect(i.body).toContain("https://github.example/me/app/actions/runs/42");
    expect(i.body).toContain("### AI summary (GitHub Models; it can be wrong)");
    expect(i.body).toContain("Probably a date issue in mentorPlan.");
    expect(i.body).toContain("Live site: answers (HTTP 200)");
    /* the same failure again: the issue is refreshed, not duplicated, and no new comment */
    expect(await night(w, results(["keeps the streak"]))).toBe(1);
    expect(w.issues.length).toBe(1);
    expect(w.comments.length).toBe(0);
    /* a different failure: one short comment says so */
    expect(await night(w, results(["keeps the streak", "plans the day"]))).toBe(1);
    expect(w.issues.length).toBe(1);
    expect(w.comments.length).toBe(1);
    expect(w.issues[0].title).toBe("Nightly check: 2 failing tests");
    /* all well: a comment, then closed as completed */
    expect(await night(w, results([]))).toBe(0);
    expect(w.issues[0].state).toBe("closed");
    expect(w.issues[0].state_reason).toBe("completed");
    expect(w.comments[w.comments.length - 1].body).toContain("All 2 tests pass again");
    /* and a good night with nothing open does nothing at all */
    const quiet = world();
    expect(await night(quiet, results([]))).toBe(0);
    expect(quiet.calls.filter((c) => c.method !== "GET").length).toBe(0);
  });

  test("a live site that is down, or a run that never finished, is reported too", async () => {
    const w = world({ liveDown: true });
    expect(await night(w, results([]))).toBe(1);
    expect(w.issues[0].title).toBe("Nightly check: the live site is down");
    expect(w.issues[0].body).toContain("Live site: **broken: HTTP 404**");
    const crashed = world({ labelExists: true }); /* a label that already exists is fine */
    expect(await night(crashed, null)).toBe(1);
    expect(crashed.issues[0].title).toBe("Nightly check: the test run broke");
    expect(crashed.issues[0].body).toContain("No test results were written");
  });

  test("the AI summary is optional, sees only test names and errors, and never blocks the report", async () => {
    const off = world();
    await night(off, results(["keeps the streak"]), { NIGHTLY_AI: "off" });
    expect(off.calls.some((c) => c.url.startsWith("https://models.example"))).toBe(false);
    expect(off.issues[0].body).not.toContain("AI summary");
    const failing = world({ aiFails: true });
    expect(await night(failing, results(["keeps the streak"]))).toBe(1);
    expect(failing.issues.length).toBe(1); /* the issue is still written */
    expect(failing.issues[0].body).not.toContain("AI summary");
    const on = world();
    await night(on, results(["keeps the streak"]));
    const sent = on.calls.find((c) => c.url.startsWith("https://models.example"));
    expect(sent.headers.Authorization).toBe("Bearer gh-test-token"); /* the workflow's own token, nothing else */
    const msg = sent.body.messages.map((m) => m.content).join("\n");
    expect(msg).toContain("TEST: the Mentor › keeps the streak (mentor.spec.js:12)");
    expect(msg).toContain("ERROR: Error: keeps the streak broke");
    expect(msg.length).toBeLessThan(9000);
  });

  test("without a token it only reports, and the script holds no secret and needs no package", async () => {
    const w = world();
    expect(await mod.run({ env: { LIVE_URL: "" }, fetch: w.fetch, readFile: async () => JSON.stringify(results(["x"])), now: NOW })).toBe(1);
    expect(w.calls.length).toBe(0);
    const src = fs.readFileSync(SRC, "utf8");
    expect(src).not.toMatch(/ghp_[A-Za-z0-9]{20,}|github_pat_|sk-[A-Za-z0-9]{20,}/);
    expect(src.match(/^import .* from "([^"]+)";$/gm).every((l) => /"node:/.test(l))).toBe(true);
    const wf = fs.readFileSync(WF, "utf8");
    expect(wf).toContain("GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}");
    expect(wf).not.toMatch(/secrets\.(?!GITHUB_TOKEN)/); /* no other secret is needed */
    expect(wf).toMatch(/permissions:\n\s+contents: read\n\s+issues: write\n\s+models: read/);
    expect(wf).toContain('cron: "23 1 * * *"');
  });
});
