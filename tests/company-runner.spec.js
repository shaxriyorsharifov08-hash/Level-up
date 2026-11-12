/* AGENT COMPANY, INDEPENDENT MODE (README 6d): company/runner/run.mjs and
   .github/workflows/company-task.yml. The runner runs here in plain Node
   against a scripted OpenAI-style service (an injected fetch, and a real
   local HTTP server for the command line), with a small company folder made
   for the test, so every path is proven without a network and without the
   real role files: the plan (even in a code fence or broken once), the roles
   in turn, the reviewer, the lead's report, the call budget, the owner's
   stop-and-ask rule, retries, clear errors, and the key never shown. */
const fs = require("fs");
const os = require("os");
const path = require("path");
const http = require("http");
const { spawn } = require("child_process");
const { pathToFileURL } = require("url");
const { test, expect } = require("@playwright/test");

const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "company", "runner", "run.mjs");
const WF = path.join(ROOT, ".github", "workflows", "company-task.yml");
const KEY = "fake-key-" + "7f3a9c2e51"; /* built from halves: not a real key */
const NOW = new Date("2026-11-08T10:00:00Z");
let mod, COMPANY, TMP;

/* a company folder with three small roles (one without a header), the owner's rules and a manual */
function makeCompany(dir, opts) {
  const o = opts || {};
  fs.mkdirSync(path.join(dir, "roles"), { recursive: true });
  fs.writeFileSync(path.join(dir, o.rulesName || "OWNER-RULES.md"), "# The owner's rules\nRULE-MARK: ask before any new dependency.\n");
  if (!o.noManual) fs.writeFileSync(path.join(dir, "COMPANY.md"), "# The manual\nMANUAL-MARK\n");
  fs.writeFileSync(path.join(dir, "roles", "coder.md"), "---\nname: coder\ndescription: \"Builds one step in code\"\ntools: Read, Edit, Write\nmodel: inherit\n---\nYou are the CODER. CODER-MARK\n");
  fs.writeFileSync(path.join(dir, "roles", "tester.md"), "---\nname: tester\ndescription: Finds bugs and proves them\n---\nYou are the TESTER. TESTER-MARK\n");
  fs.writeFileSync(path.join(dir, "roles", "reviewer.md"), "You are the REVIEWER. REVIEWER-MARK\nYou do not edit files.\n");
  return dir;
}
const plan = (steps, extra) => JSON.stringify(Object.assign({ goal: "Fix the streak bug", size: "medium", questions: [], steps }, extra || {}));
const FINAL = "### What was done\nThe tester found the cause and the coder fixed it.\n### Who did what\n- tester: found the cause\n- coder: fixed it\n- reviewer: checked\n### Open points and decisions for you\n- run the tests yourself\n### Lessons from this task\n- one\n- two\n- three\n- four\n- five";

/* a scripted OpenAI-compatible service: call n gets answers[n] (a text, an Error to throw, or {status, headers, json}) */
function fakeAI(answers) {
  const calls = [];
  const fetch = async (url, init) => {
    calls.push({ url: String(url), headers: init.headers, body: JSON.parse(init.body) });
    const a = answers[calls.length - 1];
    if (a instanceof Error) throw a;
    if (a === undefined) return new Response(JSON.stringify({ error: { message: "the test has no answer for call " + calls.length } }), { status: 400 });
    if (typeof a === "object") return new Response(JSON.stringify(a.json || { error: { message: "no" } }), { status: a.status, headers: a.headers || {} });
    return new Response(JSON.stringify({ choices: [{ message: { role: "assistant", content: a }, finish_reason: "stop" }] }), { status: 200, headers: { "content-type": "application/json" } });
  };
  const sys = (i) => calls[i].body.messages[0].content;
  const user = (i) => calls[i].body.messages[calls[i].body.messages.length - 1].content;
  const size = (i) => calls[i].body.messages.reduce((n, m) => n + m.content.length, 0);
  return { fetch, calls, sys, user, size };
}
async function company(ai, opts) {
  const o = opts || {};
  const lines = [], waits = [];
  const res = await mod.run({
    task: o.task || "Company: the streak resets at midnight; fix it",
    projectText: o.project === undefined ? "PROJECT-MARK: one HTML file, no build step" : o.project,
    companyDir: o.dir || COMPANY,
    env: Object.assign({ AI_API_KEY: KEY }, o.env || {}),
    fetch: ai.fetch, log: (s) => lines.push(s), sleep: async (ms) => { waits.push(ms); }, now: NOW
  });
  return Object.assign(res, { log: lines.join("\n"), waits });
}
function inOrder(text, parts) {
  let at = -1;
  for (const p of parts) { const i = text.indexOf(p, at + 1); expect(i, "missing or out of order: " + p).toBeGreaterThan(at); at = i; }
}
/* run a Node process to the end; the network is only ever 127.0.0.1 */
function node(args, opts) {
  return new Promise((resolve) => {
    const p = spawn(process.execPath, args, { cwd: opts.cwd || ROOT, env: Object.assign({ PATH: process.env.PATH }, opts.env || {}) });
    let out = "", err = "";
    p.stdout.on("data", (d) => { out += d; });
    p.stderr.on("data", (d) => { err += d; });
    p.on("close", (code) => resolve({ code, out, err }));
    p.stdin.end(opts.stdin || "");
  });
}
function server(handler) {
  return new Promise((resolve) => {
    const seen = [];
    const s = http.createServer((req, res) => {
      let body = "";
      req.on("data", (d) => { body += d; });
      req.on("end", () => {
        const r = { method: req.method, url: req.url, headers: req.headers, body: body ? JSON.parse(body) : null };
        seen.push(r);
        const [status, json] = handler(r, seen.length);
        res.writeHead(status, { "content-type": "application/json" });
        res.end(JSON.stringify(json));
      });
    });
    s.listen(0, "127.0.0.1", () => resolve({ url: "http://127.0.0.1:" + s.address().port, seen, close: () => new Promise((r) => s.close(r)) }));
  });
}
const chatReply = (content) => [200, { choices: [{ message: { role: "assistant", content }, finish_reason: "stop" }] }];

test.describe("the company runner (independent mode)", () => {
  test.beforeAll(async () => {
    mod = await import(pathToFileURL(SRC).href);
    TMP = fs.mkdtempSync(path.join(os.tmpdir(), "company-runner-"));
    COMPANY = makeCompany(path.join(TMP, "company"));
  });
  test.afterAll(() => { fs.rmSync(TMP, { recursive: true, force: true }); });

  test("a plan in a code fence, two roles in turn, the reviewer, and the lead's final report", async () => {
    const ai = fakeAI([
      "Here is the plan:\n```json\n" + plan([{ role: "tester", brief: "Find why the streak resets" }, { role: "Coder", brief: "Fix it in one function" }]) + "\n```\nGood luck!",
      "TESTER-ANSWER: the day is read in UTC", "CODER-ANSWER: use the local day", "REVIEWER-ANSWER: no blocking findings", FINAL
    ]);
    const r = await company(ai);
    expect(r.code).toBe(0);
    expect(ai.calls.length).toBe(5);
    for (const c of ai.calls) {
      expect(c.url).toBe("https://models.github.ai/inference/chat/completions"); /* the default: GitHub Models */
      expect(c.body.model).toBe("openai/gpt-4.1-mini");
      expect(c.body.max_tokens).toBe(1200);
      expect(c.headers.Authorization).toBe("Bearer " + KEY);
    }
    /* the lead plans with the owner's rules, the manual and the menu of roles; the task and the project are the message */
    expect(ai.sys(0)).toContain("RULE-MARK");
    expect(ai.sys(0)).toContain("MANUAL-MARK");
    expect(ai.sys(0)).toContain("- coder: Builds one step in code");
    expect(ai.sys(0)).toContain("- reviewer: You are the REVIEWER. REVIEWER-MARK"); /* no header: the first line describes it */
    expect(ai.sys(0)).toContain("Answer with JSON only");
    expect(ai.user(0)).toContain("the streak resets at midnight");
    expect(ai.user(0)).toContain("PROJECT-MARK");
    /* each role works from its own file (header dropped), the owner's rules and the runner's note */
    expect(ai.sys(1)).toContain("TESTER-MARK");
    expect(ai.sys(2)).toContain("CODER-MARK");
    expect(ai.sys(2)).not.toContain("tools: Read");
    for (const i of [1, 2, 3]) {
      expect(ai.sys(i)).toContain("RULE-MARK");
      expect(ai.sys(i)).toContain("You cannot run code or open files here; say what you could not check.");
      expect(ai.user(i)).toContain("PROJECT-MARK");
    }
    /* a step sees its brief and the earlier answers, never later ones; the reviewer sees all the work */
    expect(ai.user(1)).toContain("# Your brief\nFind why the streak resets");
    expect(ai.user(1)).not.toContain("TESTER-ANSWER");
    expect(ai.user(2)).toContain("# Your brief\nFix it in one function");
    expect(ai.user(2)).toContain("TESTER-ANSWER: the day is read in UTC");
    expect(ai.sys(3)).toContain("REVIEWER-MARK");
    expect(ai.user(3)).toContain("TESTER-ANSWER");
    expect(ai.user(3)).toContain("CODER-ANSWER");
    /* the lead's final call asks for the four parts and sees every answer */
    for (const h of ["### What was done", "### Who did what", "### Open points and decisions for you", "### Lessons from this task"]) expect(ai.sys(4)).toContain(h);
    expect(ai.sys(4)).toContain("RULE-MARK");
    expect(ai.user(4)).toContain("REVIEWER-ANSWER: no blocking findings");
    /* the report: the task, the plan, each role under its heading, then the final report */
    inOrder(r.report, [
      "# Company report: Company: the streak resets at midnight; fix it", "**Done.**",
      "- When: 2026-11-08 10:00 UTC", "- AI: openai/gpt-4.1-mini at models.github.ai; 5 of 8 calls used", "nothing here was tested by running it",
      "## The task", "> Company: the streak resets at midnight; fix it",
      "## The lead's plan", "**Goal:** Fix the streak bug", "1. **tester**: Find why the streak resets", "2. **coder**: Fix it in one function", "Then the **reviewer** checks the work",
      "## The work", "### 1. Tester", "TESTER-ANSWER", "### 2. Coder", "CODER-ANSWER", "### 3. Reviewer", "REVIEWER-ANSWER",
      "## The lead's final report", "### What was done", "### Who did what", "- coder: fixed it", "### Open points and decisions for you", "### Lessons from this task", "- three"
    ]);
    expect(r.report).not.toContain("- four"); /* at most three lessons */
    expect(r.report).not.toContain("## The lead needs your answer");
    expect(r.log).toContain("plan: tester, coder");
    expect(r.log).toContain("call 5/8: the lead's final report");
  });

  test("an unknown role is dropped, a plan keeps at most five steps, and a missing part of the report is marked", async () => {
    const ai = fakeAI([plan([{ role: "marketer", brief: "Sell it" }, { role: "lead", brief: "Do it all" }, { role: "coder", brief: "Fix it" }]), "CODER-ANSWER", "REVIEWER-ANSWER", "### What was done\nFixed."]);
    const r = await company(ai);
    expect(r.code).toBe(0);
    expect(ai.calls.length).toBe(4); /* plan, coder, reviewer, final */
    expect(ai.sys(1)).toContain("CODER-MARK");
    expect(ai.sys(2)).toContain("REVIEWER-MARK");
    expect(r.report).toContain("Left out, because the company has no such role: \"marketer\", \"lead\".");
    expect(ai.user(3)).toContain("Left out of the plan (no such role): marketer, lead");
    expect(r.report).toContain("### Who did what\n(the lead did not write this part)");
    expect(r.report).toContain("### Lessons from this task\n(the lead did not write this part)");
    const names = ["coder", "tester", "reviewer", "health-safety"];
    const many = mod.normalizePlan({ steps: Array.from({ length: 7 }, (x, i) => ({ role: "coder", brief: "part " + i })) }, names);
    expect(many.steps.length).toBe(mod.MAX_STEPS);
    expect(many.over).toBe(2);
    const odd = mod.normalizePlan({ size: "HUGE", questions: ["none", "", "N/A"], steps: [{ role: "Health Safety", brief: "" }, "coder", null] }, names);
    expect(odd.steps).toEqual([{ role: "health-safety", brief: "Do your part of the task." }]);
    expect(odd.questions).toEqual([]); /* "none" is not a question */
    expect(odd.size).toBe("medium");
    expect(mod.normalizePlan({ answer: "hello" }, names)).toBe(null);
    expect(mod.normalizePlan([1, 2], names)).toBe(null);
  });

  test("AI_MAX_CALLS is respected (at most 20), and the report says what did not run", async () => {
    const three = fakeAI([plan([{ role: "tester", brief: "Find it" }, { role: "coder", brief: "Fix it" }]), "TESTER-ANSWER", FINAL]);
    const r = await company(three, { env: { AI_MAX_CALLS: "3" } });
    expect(three.calls.length).toBe(3); /* the plan, one role, and the call kept for the lead's report */
    expect(r.code).toBe(0);
    expect(r.report).toContain("**Finished early: the call budget ran out (see the notes).**");
    expect(r.report).toContain("The call budget (AI_MAX_CALLS = 3) ran out, so these steps did not run: coder. Nobody reviewed the work.");
    expect(r.report).toContain("### What was done");
    expect(three.user(2)).toContain("these steps did not run: coder"); /* the lead knows, too */
    const one = fakeAI([plan([{ role: "coder", brief: "Fix it" }])]);
    const r1 = await company(one, { env: { AI_MAX_CALLS: "1" } });
    expect(one.calls.length).toBe(1);
    expect(r1.code).toBe(0);
    expect(r1.report).toContain("1. **coder**: Fix it");
    expect(r1.report).toContain("ran out before the lead's final report");
    expect(r1.report).not.toContain("## The work");
    expect(mod.config({ AI_MAX_CALLS: "50" }).maxCalls).toBe(20);
    expect(mod.config({ AI_MAX_CALLS: "abc" }).maxCalls).toBe(8);
    expect(mod.config({}).maxTokens).toBe(1200);
    expect(mod.config({ GITHUB_TOKEN: "gh" }).apiKey).toBe("gh"); /* the fallback */
    expect(mod.config({ AI_BASE_URL: "http://localhost:11434/v1/" }).baseUrl).toBe("http://localhost:11434/v1");
  });

  test("every request stays under the size budget, however long the project and the answers", async () => {
    const long = (c) => c.repeat(20000);
    const ai = fakeAI([plan([{ role: "tester", brief: "Find it" }, { role: "coder", brief: "Fix it" }]), long("t"), long("c"), long("r"), FINAL]);
    const r = await company(ai, { project: long("p"), task: "Company: " + long("k") });
    expect(r.code).toBe(0);
    for (let i = 0; i < ai.calls.length; i++) expect(ai.size(i), "call " + (i + 1)).toBeLessThanOrEqual(18000);
    expect(ai.user(3)).toContain("more characters cut to keep the request small]");
    const fit = mod.fitTexts(["aa", long("x"), long("y")], 6000);
    expect(fit[0]).toBe("aa"); /* short texts stay whole */
    expect(fit[1].length).toBeLessThanOrEqual(2999);
    expect(fit[2].length).toBeLessThanOrEqual(2999);
  });

  test("a plan with questions stops and asks the owner, and nothing else runs", async () => {
    const ai = fakeAI([plan([{ role: "coder", brief: "Fix it" }], { questions: ["Which midnight counts: the phone's or Tashkent's?", "none"] })]);
    const r = await company(ai);
    expect(ai.calls.length).toBe(1);
    expect(r.code).toBe(0);
    expect(r.report).toContain("**Stopped: the lead needs your answer before the work can start.**");
    expect(r.report).toContain("## The lead needs your answer\n\n1. Which midnight counts: the phone's or Tashkent's?\n\nNothing else was done yet.");
    expect(r.report).not.toContain("2. none");
    expect(r.report).not.toContain("## The work");
    expect(r.report).not.toContain("## The lead's final report");
    /* the lead is told the owner's stop-and-ask list */
    expect(ai.sys(0)).toContain("a new dependency, a change to how saved data is stored, deleting a feature or anyone's data, publishing, deploying");
    expect(ai.sys(0)).toContain("Any question stops the company until the owner answers");
  });

  test("broken JSON is asked for once more; broken twice stops with a clear message", async () => {
    const ai = fakeAI(["{\"goal\": \"Fix\", \"steps\": [{\"role\": \"coder\", \"brief\": \"fix the", plan([{ role: "coder", brief: "Fix it" }]), "CODER-ANSWER", "REVIEWER-ANSWER", FINAL]);
    const r = await company(ai);
    expect(r.code).toBe(0);
    expect(ai.calls.length).toBe(5);
    const again = ai.calls[1].body.messages;
    expect(again.length).toBe(4);
    expect(again[2].role).toBe("assistant");
    expect(again[3].content).toContain("Answer again with JSON only");
    expect(r.log).toContain("the plan was not valid JSON: asking once more for JSON only");
    const bad = fakeAI(["Sure! I would plan it like this.", "still {not json"]);
    const rb = await company(bad);
    expect(rb.code).toBe(1);
    expect(bad.calls.length).toBe(2);
    expect(rb.report).toContain("The lead's plan was not valid JSON, twice, so nothing was run.");
    expect(rb.report).toContain("## The run stopped early");
    expect(mod.extractJson("```json\n{\"a\": 1}\n```")).toEqual({ a: 1 });
    expect(mod.extractJson("The plan: {\"a\": {\"b\": 2}} Hope it helps.")).toEqual({ a: { b: 2 } });
    expect(mod.extractJson("{\"a\": [1, 2")).toBe(null); /* cut off */
    expect(mod.extractJson("no json")).toBe(null);
  });

  test("a 429 or a 5xx is tried once more after Retry-After, without real waiting; a long wait or a second failure stops", async () => {
    const ai = fakeAI([{ status: 429, headers: { "retry-after": "2" } }, plan([], { size: "tiny" }), "### What was done\nThe answer is 42."]);
    const r = await company(ai);
    expect(r.code).toBe(0);
    expect(r.waits).toEqual([2000]); /* honoured, through the injected sleep */
    expect(ai.calls.length).toBe(3);
    expect(r.log).toContain("HTTP 429: waiting 2 s, then trying once more");
    expect(ai.sys(2)).toContain("No role steps ran for this task: answer it yourself"); /* a tiny task: the lead answers alone */
    expect(r.report).toContain("The answer is 42.");
    const twice = fakeAI([{ status: 503 }, { status: 502 }]);
    const r2 = await company(twice);
    expect(r2.code).toBe(1);
    expect(r2.waits).toEqual([5000]); /* no Retry-After: a short default wait */
    expect(twice.calls.length).toBe(2);
    expect(r2.report).toContain("The AI service had an error (HTTP 502), twice. Try again later.");
    const daily = fakeAI([{ status: 429, headers: { "retry-after": "3600" } }]);
    const r3 = await company(daily);
    expect(r3.code).toBe(1);
    expect(daily.calls.length).toBe(1); /* longer than 30 s: no pointless retry */
    expect(r3.waits).toEqual([]);
    expect(r3.report).toContain("over its rate limit (HTTP 429) and asks to wait about 60 minute(s)");
    expect(mod.retryWaitMs("2")).toBe(2000);
    expect(mod.retryWaitMs(new Date(NOW.getTime() + 10000).toUTCString(), NOW.getTime())).toBe(10000);
    expect(mod.retryWaitMs("")).toBe(5000);
    expect(mod.retryWaitMs("soon")).toBe(5000);
  });

  test("a refused key, a wrong model, no network and a missing company give clear messages", async () => {
    for (const status of [401, 403]) {
      const ai = fakeAI([{ status }]);
      const r = await company(ai);
      expect(r.code).toBe(1);
      expect(ai.calls.length).toBe(1);
      expect(r.report).toContain("The AI service refused the key (HTTP " + status + "). Check AI_API_KEY (or GITHUB_TOKEN) and that it may use the model \"openai/gpt-4.1-mini\" (model access).");
      expect(r.report).toContain("\"permissions: models: read\"");
      expect(r.log).toContain("stopped: The AI service refused the key");
    }
    const nf = await company(fakeAI([{ status: 404, json: { error: { message: "Unknown model: nope" } } }]), { env: { AI_MODEL: "nope" } });
    expect(nf.report).toContain("The AI service turned the request down (HTTP 404): check AI_BASE_URL and AI_MODEL. It said: Unknown model: nope.");
    const off = await company(fakeAI([new TypeError("fetch failed")]));
    expect(off.code).toBe(1);
    expect(off.report).toContain("Could not reach the AI service at models.github.ai (fetch failed). Check the internet connection and AI_BASE_URL.");
    const none = fakeAI([]);
    const nc = await company(none, { dir: path.join(TMP, "nowhere") });
    expect(nc.code).toBe(1);
    expect(none.calls.length).toBe(0);
    expect(nc.report).toContain("No roles folder at");
  });

  test("the company folder: role headers, either spelling of the owner's rules, the manual optional", async () => {
    const dir = makeCompany(path.join(TMP, "lower"), { rulesName: "owner-rules.md", noManual: true });
    fs.writeFileSync(path.join(dir, "roles", "README.md"), "Not a role.\n");
    const c = await mod.loadCompany(dir);
    expect(c.roles.map((r) => r.name)).toEqual(["coder", "reviewer", "tester"]);
    expect(c.ownerRules).toContain("RULE-MARK");
    expect(c.manual).toBe("");
    const coder = c.roles[0];
    expect(coder.description).toBe("Builds one step in code");
    expect(coder.body).toBe("You are the CODER. CODER-MARK");
    const bare = makeCompany(path.join(TMP, "bare"), { noManual: true });
    fs.rmSync(path.join(bare, "OWNER-RULES.md"));
    const ai = fakeAI([plan([]), FINAL]);
    const r = await company(ai, { dir: bare });
    expect(r.code).toBe(0); /* the owner's rules are optional, but the report says they were missing */
    expect(r.report).toContain("No owner-rules.md was found in the company folder");
    fs.mkdirSync(path.join(TMP, "empty", "roles"), { recursive: true });
    await expect(mod.loadCompany(path.join(TMP, "empty"))).rejects.toThrow("has no role files");
  });

  test("the key never reaches the report or the log, even when the service echoes it", async () => {
    const env = { AI_API_KEY: KEY, GITHUB_TOKEN: "gh-" + "token-998877" };
    const ai = fakeAI([plan([{ role: "coder", brief: "Fix it" }]), "CODER-ANSWER: I can see the key " + KEY + " and gh-token-998877", "REVIEWER-ANSWER", FINAL]);
    const r = await company(ai, { env });
    expect(r.code).toBe(0);
    expect(r.report).toContain("CODER-ANSWER: I can see the key [hidden] and [hidden]");
    const echo = await company(fakeAI([{ status: 400, json: { error: { message: "bad key " + KEY } } }]), { env });
    for (const text of [r.report, r.log, echo.report, echo.log]) {
      expect(text).not.toContain(KEY);
      expect(text).not.toContain("gh-token-998877");
      expect(text).not.toMatch(/Bearer|Authorization/);
    }
    expect(echo.report).toContain("It said: bad key [hidden]");
  });

  test("from the command line, against a local server: the task on standard input, --out, exit codes, no key shown", async () => {
    const out = path.join(TMP, "report.md");
    fs.writeFileSync(path.join(TMP, "PROJECT.md"), "PROJECT-MARK from a file\n");
    const answers = [plan([{ role: "coder", brief: "Fix it" }]), "CODER-ANSWER " + KEY, "REVIEWER-ANSWER", FINAL];
    const srv = await server((req, n) => (req.headers.authorization === "Bearer " + KEY ? chatReply(answers[n - 1]) : [401, { error: { message: "bad credentials" } }]));
    try {
      const env = { AI_BASE_URL: srv.url + "/v1", AI_API_KEY: KEY, AI_MODEL: "local-test-model" };
      const ok = await node([SRC, "-", "--out", out, "--company", COMPANY, "--project", path.join(TMP, "PROJECT.md")], { env, stdin: "Company: fix the streak\nIt resets at midnight." });
      expect(ok.code).toBe(0);
      expect(ok.out).toBe(""); /* the report went to the file */
      expect(srv.seen.length).toBe(4);
      expect(srv.seen.every((s) => s.method === "POST" && s.url === "/v1/chat/completions" && s.body.model === "local-test-model")).toBe(true);
      expect(srv.seen[0].body.messages[1].content).toContain("It resets at midnight.");
      expect(srv.seen[0].body.messages[1].content).toContain("PROJECT-MARK from a file");
      const report = fs.readFileSync(out, "utf8");
      expect(report).toContain("# Company report: Company: fix the streak");
      expect(report).toContain("- AI: local-test-model at 127.0.0.1:");
      expect(report).toContain("## The lead's final report");
      expect(report + ok.err).not.toContain(KEY);
      expect(ok.err).toContain("report written to " + out);
      const refused = await node([SRC, "Company: fix it", "--company", COMPANY], { env: Object.assign({}, env, { AI_API_KEY: "wrong-key-1234" }) });
      expect(refused.code).toBe(1);
      expect(refused.out).toContain("Check AI_API_KEY"); /* no --out: the report goes to the screen */
      expect(refused.out + refused.err).not.toContain("wrong-key-1234");
      const before = srv.seen.length;
      const badOut = await node([SRC, "Company: fix it", "--out", "index.html"], { env });
      expect(badOut.code).toBe(1);
      expect(badOut.err).toContain("--out must name a .md (or .txt) report file.");
      const noTask = await node([SRC], { env });
      expect(noTask.code).toBe(1);
      expect(noTask.err).toContain("Usage: node company/runner/run.mjs");
      expect(srv.seen.length).toBe(before); /* neither one called the service */
    } finally { await srv.close(); }
  });

  test("the workflow: both triggers, models: read, only the workflow's own token, the issue's text never pasted into a script", () => {
    const wf = fs.readFileSync(WF, "utf8");
    expect(wf).toMatch(/\n {2}workflow_dispatch:\n {4}inputs:\n {6}task:\n[^\n]*\n {8}required: true/);
    expect(wf).toMatch(/\n {6}project_file:\n[^\n]*\n {8}required: false/);
    expect(wf).toMatch(/\n {2}issues:\n {4}types: \[labeled\]/);
    expect(wf).toContain("github.event.label.name == 'company-task'");
    expect(wf).toMatch(/permissions:\n\s+contents: read\n\s+models: read\n\s+issues: write/);
    expect(wf).toContain("AI_API_KEY: ${{ secrets.GITHUB_TOKEN }}");
    expect(wf).not.toMatch(/secrets\.(?!GITHUB_TOKEN\b)/); /* no other secret */
    expect(wf).toContain("AI_MODEL: ${{ vars.AI_MODEL }}");
    expect(wf).toContain("node company/runner/run.mjs - \"${args[@]}\"");
    expect(wf).toContain("cat report.md >> \"$GITHUB_STEP_SUMMARY\"");
    expect(wf).toContain("retention-days: 14");
    expect(wf).toMatch(/DEFAULT branch's copy of this\n# file only/);
    expect(wf.match(/uses: \S+/g).every((u) => /^uses: actions\//.test(u))).toBe(true); /* official actions only */
    /* the issue's and the form's words reach the shell only as environment variables (no script injection) */
    const lines = wf.split("\n").filter((l) => /github\.event\.issue\.(title|body)|inputs\.(task|project_file)/.test(l));
    expect(lines.length).toBe(4);
    for (const l of lines) expect(l).toMatch(/^\s+[A-Z_]+: \$\{\{ [^}]+ \}\}$/);
  });

  test("the workflow's comment step posts the report on the issue, breaks @mentions and cuts a very long report", async () => {
    const wf = fs.readFileSync(WF, "utf8");
    const script = /node -e '\n([\s\S]*?)\n\s*'\n/.exec(wf)[1];
    const dir = fs.mkdtempSync(path.join(TMP, "comment-"));
    const srv = await server(() => [201, { id: 1 }]);
    try {
      const env = { GITHUB_API_URL: srv.url, GITHUB_REPOSITORY: "me/app", ISSUE_NUMBER: "7", GITHUB_TOKEN: "gh-" + "token-42", RUN_URL: "https://github.example/me/app/actions/runs/9" };
      fs.writeFileSync(path.join(dir, "report.md"), "# Company report\nThanks @someone for the idea.\n");
      const r = await node(["-e", script], { cwd: dir, env });
      expect(r.code).toBe(0);
      expect(r.out).toContain("The report is on issue #7");
      const sent = srv.seen[0];
      expect(sent.method).toBe("POST");
      expect(sent.url).toBe("/repos/me/app/issues/7/comments");
      expect(sent.headers.authorization).toBe("Bearer gh-token-42");
      expect(sent.body.body).toContain("# Company report");
      expect(sent.body.body).toContain("Thanks @​someone"); /* nobody gets pinged by the model's text */
      expect(sent.body.body).toContain("Run: https://github.example/me/app/actions/runs/9");
      fs.writeFileSync(path.join(dir, "report.md"), "x".repeat(70000));
      await node(["-e", script], { cwd: dir, env });
      expect(srv.seen[1].body.body.length).toBeLessThan(61000); /* GitHub's comment limit is 65,536 */
      expect(srv.seen[1].body.body).toContain("the whole report is in the artifact of this run");
      fs.rmSync(path.join(dir, "report.md"));
      await node(["-e", script], { cwd: dir, env });
      expect(srv.seen[2].body.body).toContain("The company could not write a report this time.");
    } finally { await srv.close(); }
  });

  test("the runner holds no secret, needs no package, runs nothing it is given, and writes only its report", () => {
    const src = fs.readFileSync(SRC, "utf8");
    expect(src.match(/^import .* from "([^"]+)";$/gm).every((l) => /"node:/.test(l))).toBe(true);
    expect(src).not.toMatch(/child_process|\beval\s*\(|new Function|\bvm\b|execSync|spawn\(/);
    expect(src.match(/writeFile\(/g).length).toBe(1); /* the one report */
    expect(src).not.toMatch(/ghp_[A-Za-z0-9]{20,}|github_pat_|sk-[A-Za-z0-9]{20,}/);
    expect(src).not.toMatch(new RegExp("cla" + "ude-[a-z0-9]", "i")); /* no vendor model IDs */
    expect(src).toContain("never\n   runs or executes what the model answers");
    expect(src).toContain("never pushes, posts, deploys or spends");
  });
});
