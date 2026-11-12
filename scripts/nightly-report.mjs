/* LEVEL UP: THE SYSTEM AGENT's report (README 4aa).

   Runs at the end of .github/workflows/nightly.yml, after the whole test
   suite. It reads Playwright's JSON results, checks that the live site
   answers, and keeps ONE GitHub issue (label "nightly-tests") in step with
   the truth:
     - something broken and no open issue  → open one with the details,
     - still broken                        → update it (and comment only when
                                             the list of failures changed),
     - everything fine again               → comment and close it.
   With the free GitHub Models tier it can add a short AI summary of the
   likely cause. Only test names and error messages are sent (the repository
   is public anyway), never anyone's data, and it is skipped on any error or
   when the repository variable NIGHTLY_AI is "off".

   Plain Node 20: no packages, and no secret but the workflow's own
   GITHUB_TOKEN (permissions: issues write, models read). The exit code fails
   the workflow run when something is broken, so the Actions tab shows it too. */
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

export const LABEL = "nightly-tests";
const MAX_LISTED = 15, MAX_ERR = 700, MAX_AI_FAILS = 10;
const MARK = /<!-- failing: ([0-9a-f]+) -->/;

/* ---------- reading the results ---------- */
export function stripAnsi(s) { return String(s || "").replace(/\x1b\[[0-9;]*m/g, ""); }

export function summarize(report) {
  const out = { total: 0, passed: 0, failed: [], flaky: [], skipped: 0, crashed: [] };
  if (!report || typeof report !== "object") { out.crashed.push("No test results were written (the run stopped before the tests finished)."); return out; }
  for (const e of report.errors || []) out.crashed.push(stripAnsi(e.message || e.value || String(e)).slice(0, MAX_ERR));
  const walk = (suite, path) => {
    const here = suite.title && suite.title !== suite.file ? path.concat(suite.title) : path;
    for (const spec of suite.specs || []) {
      for (const t of spec.tests || []) {
        out.total++;
        const title = here.concat(spec.title).join(" › ");
        const where = (spec.file || suite.file || "") + ":" + (spec.line || "");
        if (t.status === "skipped") { out.skipped++; continue; }
        if (t.status === "unexpected") {
          const last = (t.results || [])[Math.max(0, (t.results || []).length - 1)] || {};
          const msg = stripAnsi((last.error && (last.error.message || last.error.value)) || last.status || "failed").trim();
          out.failed.push({ title, where, error: msg.slice(0, MAX_ERR) });
        } else {
          out.passed++;
          if (t.status === "flaky") out.flaky.push({ title, where });
        }
      }
    }
    for (const s of suite.suites || []) walk(s, here);
  };
  for (const s of report.suites || []) walk(s, []);
  return out;
}

/* a short fingerprint of WHAT is failing, so a new comment is written only when it changes */
export function fingerprint(sum, live) {
  const key = sum.failed.map((f) => f.title).sort().join("\n") + "|" + sum.crashed.length + "|" + (live.ok ? "" : "live");
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) { h ^= key.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h.toString(16);
}

/* ---------- the live site ---------- */
export async function checkLive(url, fetchFn) {
  if (!url) return { ok: true, skipped: true, note: "no LIVE_URL set" };
  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 30000);
    const r = await fetchFn(url, { signal: ctl.signal, redirect: "follow" });
    clearTimeout(timer);
    const text = await r.text();
    if (!r.ok) return { ok: false, note: "HTTP " + r.status };
    if (text.indexOf("<title>LEVEL UP</title>") === -1) return { ok: false, note: "the page loaded but is not the app (no <title>LEVEL UP</title>)" };
    return { ok: true, note: "HTTP " + r.status };
  } catch (e) {
    return { ok: false, note: "no answer (" + (e && e.name === "AbortError" ? "timed out after 30 s" : String(e && e.message || e)) + ")" };
  }
}

/* ---------- the optional AI summary (GitHub Models, free tier) ---------- */
export async function aiSummary(sum, env, fetchFn) {
  if (String(env.NIGHTLY_AI || "").toLowerCase() === "off" || !env.GITHUB_TOKEN) return null;
  if (!sum.failed.length && !sum.crashed.length) return null;
  const lines = sum.failed.slice(0, MAX_AI_FAILS).map((f) => "TEST: " + f.title + " (" + f.where + ")\nERROR: " + f.error.slice(0, 500));
  sum.crashed.slice(0, 3).forEach((c) => lines.push("RUN ERROR: " + c.slice(0, 500)));
  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 45000);
    const r = await fetchFn(env.MODELS_URL || "https://models.github.ai/inference/chat/completions", {
      method: "POST",
      signal: ctl.signal,
      headers: { "Authorization": "Bearer " + env.GITHUB_TOKEN, "Content-Type": "application/json", "Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
      body: JSON.stringify({
        model: env.NIGHTLY_AI_MODEL || "openai/gpt-4.1-mini",
        temperature: 0.2,
        max_tokens: 350,
        messages: [
          { role: "system", content: "You help maintain LEVEL UP, a habit game that is one file, index.html (HTML, CSS and plain JavaScript, no build step), tested with Playwright specs in tests/. The tests run in a browser opened from disk with the clock often fixed by the test. Read the failures and answer in at most 120 words, plain text: the most likely cause, whether it looks like a real bug, a date or time-zone effect, or a flaky test, and what to look at first. If you are not sure, say so. Do not invent code that is not in the errors." },
          { role: "user", content: lines.join("\n\n").slice(0, 7000) }
        ]
      })
    });
    clearTimeout(timer);
    if (!r.ok) return null;
    const j = await r.json();
    const text = j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
    return typeof text === "string" && text.trim() ? text.trim().slice(0, 1500) : null;
  } catch (e) {
    return null;
  }
}

/* ---------- the issue text ---------- */
function cell(s) { return String(s).replace(/\|/g, "\\|").replace(/\r?\n/g, " ").slice(0, 160); }
export function buildBody(sum, live, ai, ctx) {
  const broken = sum.failed.length + sum.crashed.length + (live.ok ? 0 : 1);
  const out = [];
  out.push("The nightly system check found **" + broken + " problem" + (broken === 1 ? "" : "s") + "** on `" + ctx.ref + "` (" + ctx.date + ").");
  out.push("");
  out.push("- Tests: " + sum.passed + " passed, **" + sum.failed.length + " failed**" + (sum.flaky.length ? ", " + sum.flaky.length + " passed only on retry" : "") + (sum.skipped ? ", " + sum.skipped + " skipped" : "") + ".");
  out.push("- Live site: " + (live.skipped ? "not checked (" + live.note + ")" : live.ok ? "answers (" + live.note + ")" : "**broken: " + live.note + "**") + ".");
  if (ctx.runUrl) out.push("- Run, with the full log and the Playwright report: " + ctx.runUrl);
  if (sum.crashed.length) {
    out.push("", "### The run itself reported errors", "");
    sum.crashed.slice(0, 5).forEach((c) => out.push("```", c, "```"));
  }
  if (sum.failed.length) {
    out.push("", "### Failing tests", "", "| Test | Where | First line of the error |", "|---|---|---|");
    sum.failed.slice(0, MAX_LISTED).forEach((f) => out.push("| " + cell(f.title) + " | `" + cell(f.where) + "` | " + cell(f.error.split("\n")[0]) + " |"));
    if (sum.failed.length > MAX_LISTED) out.push("", "…and " + (sum.failed.length - MAX_LISTED) + " more (see the run).");
    out.push("", "<details><summary>Full error messages</summary>", "");
    sum.failed.slice(0, MAX_LISTED).forEach((f) => out.push("**" + f.title + "**", "```", f.error, "```"));
    out.push("</details>");
  }
  if (sum.flaky.length) {
    out.push("", "### Passed only on the second try (flaky)", "");
    sum.flaky.slice(0, MAX_LISTED).forEach((f) => out.push("- " + f.title + " (`" + f.where + "`)"));
  }
  if (ai) out.push("", "### AI summary (GitHub Models; it can be wrong)", "", ai);
  out.push("", "To reproduce on your computer: `npm install`, then `npx playwright test` (or one file: `npx playwright test tests/<name>.spec.js`).");
  out.push("", "_Written by the nightly system agent (`.github/workflows/nightly.yml`, README 4aa). It updates this issue each night and closes it itself when everything passes again._");
  out.push("<!-- failing: " + fingerprint(sum, live) + " -->");
  return out.join("\n");
}

/* ---------- GitHub ---------- */
function gh(env, fetchFn) {
  const api = (env.GITHUB_API_URL || "https://api.github.com") + "/repos/" + env.GITHUB_REPOSITORY;
  return async (method, path, body) => {
    const r = await fetchFn(api + path, {
      method,
      headers: { "Authorization": "Bearer " + env.GITHUB_TOKEN, "Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "Content-Type": "application/json", "User-Agent": "level-up-nightly" },
      body: body ? JSON.stringify(body) : undefined
    });
    if (!r.ok) throw new Error(method + " " + path + ": HTTP " + r.status);
    return r.status === 204 ? null : r.json();
  };
}

export async function run(opts) {
  const env = opts.env, fetchFn = opts.fetch, log = opts.log || (() => {});
  const now = opts.now || new Date();
  let report = null;
  try { report = JSON.parse(await (opts.readFile || readFile)(env.RESULTS || "nightly-results.json", "utf8")); } catch (e) { report = null; }
  const sum = summarize(report);
  const live = await checkLive(env.LIVE_URL, fetchFn);
  const broken = sum.failed.length > 0 || sum.crashed.length > 0 || !live.ok;
  const ctx = {
    ref: env.GITHUB_REF_NAME || "main",
    date: now.toISOString().slice(0, 16).replace("T", " ") + " UTC",
    runUrl: env.GITHUB_RUN_ID ? (env.GITHUB_SERVER_URL || "https://github.com") + "/" + env.GITHUB_REPOSITORY + "/actions/runs/" + env.GITHUB_RUN_ID : ""
  };
  log("tests: " + sum.passed + " passed, " + sum.failed.length + " failed, " + sum.flaky.length + " flaky; live: " + (live.ok ? "ok" : live.note));
  if (!env.GITHUB_TOKEN || !env.GITHUB_REPOSITORY) { log("no GITHUB_TOKEN or GITHUB_REPOSITORY: report only"); return broken ? 1 : 0; }

  const api = gh(env, fetchFn);
  const open = ((await api("GET", "/issues?state=open&per_page=10&labels=" + LABEL)) || []).filter((i) => !i.pull_request);
  const issue = open[0] || null;
  if (!broken) {
    if (issue) {
      await api("POST", "/issues/" + issue.number + "/comments", { body: "✅ All " + sum.passed + " tests pass again and the live site answers (" + ctx.date + "). Closing." + (ctx.runUrl ? "\n\nRun: " + ctx.runUrl : "") });
      await api("PATCH", "/issues/" + issue.number, { state: "closed", state_reason: "completed" });
      log("closed issue #" + issue.number);
    } else log("all good; nothing to report");
    return 0;
  }
  const ai = await aiSummary(sum, env, fetchFn);
  const body = buildBody(sum, live, ai, ctx);
  const title = "Nightly check: " + (sum.failed.length ? sum.failed.length + " failing test" + (sum.failed.length === 1 ? "" : "s") : "") + (sum.failed.length && !live.ok ? " and " : "") + (!live.ok ? "the live site is down" : "") + (!sum.failed.length && live.ok ? "the test run broke" : "");
  if (!issue) {
    /* the label is how tomorrow's run finds this issue, so make sure it exists */
    try { await api("POST", "/labels", { name: LABEL, color: "d73a4a", description: "Opened and closed by the nightly system check" }); } catch (e) { /* it exists already */ }
    const made = await api("POST", "/issues", { title, body, labels: [LABEL] });
    log("opened issue #" + (made && made.number));
    return 1;
  }
  const before = MARK.exec(issue.body || "");
  await api("PATCH", "/issues/" + issue.number, { title, body });
  if (!before || before[1] !== fingerprint(sum, live)) {
    await api("POST", "/issues/" + issue.number + "/comments", { body: "The failures changed on " + ctx.date + ": " + title.replace(/^Nightly check: /, "") + ". The issue text above is up to date." + (ctx.runUrl ? "\n\nRun: " + ctx.runUrl : "") });
  }
  log("updated issue #" + issue.number);
  return 1;
}

/* run directly: node scripts/nightly-report.mjs */
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run({ env: process.env, fetch: globalThis.fetch, log: (s) => process.stdout.write(s + "\n") })
    .then((code) => { process.exitCode = code; })
    .catch((e) => { process.stdout.write("nightly report failed: " + (e && e.message || e) + "\n"); process.exitCode = 1; });
}
