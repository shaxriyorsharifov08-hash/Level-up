/* affected-tests: which Playwright specs a change touches (README 6b), so the
   team runs those in seconds while working and the whole suite once at the end.
     node scripts/team/affected-tests.mjs            against HEAD (uncommitted work)
     node scripts/team/affected-tests.mjs --base main   everything since main
   Prints the specs, why each one, and the command to run them. */
import { ROOT, INDEX, readText, codeMap, gitChanges, arg, isMain } from "./lib.mjs";
import { readSpecs } from "./codemap.mjs";

const FIXED = [
  [/^ai-proxy\//, ["ai-proxy.spec.js", "mentor.spec.js", "agent.spec.js"]],
  [/^scripts\/nightly-report\.mjs$|^\.github\/workflows\/nightly\.yml$/, ["nightly-report.spec.js"]],
  [/^scripts\/team\/|^\.claude\/team\/drills\//, ["team-tools.spec.js"]],
  [/^CLAUDE\.md$|^\.claude\//, ["agent-team.spec.js"]],
  [/^sw\.js$|^notify-sw\.js$|^manifest\.webmanifest$/, ["smoke.spec.js", "alarm.spec.js"]],
  [/^database\.rules\.json$/, ["security.spec.js"]]
];
const EVERYTHING = /^tests\/helpers\.js$|^playwright\.config\.js$|^package(-lock)?\.json$/;
const CSS_SPECS = ["themes.spec.js", "accessibility.spec.js", "redesign.spec.js", "focus-skin.spec.js"];

export function affected(changes, map, src, specs) {
  const why = new Map();
  const add = (spec, reason) => { if (!specs[spec]) return; if (!why.has(spec)) why.set(spec, new Set()); why.get(spec).add(reason); };
  let all = false;
  const names = new Map();
  const lines = src.split("\n");
  const defined = new Set(map.functions.map((f) => f.name).concat(map.vars.map((v) => v.name)));
  for (const c of changes) {
    if (!c.file) continue;
    if (EVERYTHING.test(c.file)) { all = true; continue; }
    if (/^tests\/[\w.-]+\.spec\.js$/.test(c.file)) { add(c.file.slice(6), "the spec itself changed"); continue; }
    for (const [re, list] of FIXED) if (re.test(c.file)) list.forEach((s) => add(s, c.file + " changed"));
    if (c.file !== "index.html") continue;
    const touched = c.added.map((a) => a.line).concat(c.removed.map((r) => Math.min(r.line, lines.length)));
    for (const n of touched) {
      const reg = map.region(n);
      if (reg === "css") { CSS_SPECS.forEach((s) => add(s, "CSS changed (line " + n + ")")); continue; }
      if (reg === "html") {
        const ids = (lines[n - 1] || "").match(/\bid="([^"]+)"/g) || [];
        ids.forEach((x) => names.set(x.slice(4, -1), "HTML #" + x.slice(4, -1)));
        continue;
      }
      const f = map.functionAt(n);
      if (f) names.set(f.name, "function " + f.name);
    }
    for (const a of c.added.concat(c.removed)) {
      const words = a.text.match(/[A-Za-z_$][\w$]{3,}/g) || [];
      words.forEach((w) => { if (defined.has(w) && !names.has(w)) names.set(w, "uses " + w); });
      if (/^\s*[\w$]+:\{en:/.test(a.text)) names.set("MENTOR_TXT", "Mentor text changed");
    }
  }
  if (all) return { all: true, specs: Object.keys(specs).sort(), why: new Map() };
  /* tests usually call a function a level or two above the one that changed
     (agentParse, not agentParseOne), so the callers count too */
  const fnNames = new Set(map.functions.map((f) => f.name));
  let frontier = [...names.keys()].filter((n) => fnNames.has(n));
  for (let depth = 0; depth < 2 && frontier.length; depth++) {
    const next = [];
    for (const name of frontier) {
      const rx = new RegExp("(^|[^\\w$.])" + name.replace(/[$]/g, "\\$") + "\\s*\\(");
      for (const f of map.functions) {
        if (f.name === name || names.has(f.name)) continue;
        for (let i = f.line; i < f.end; i++) if (rx.test(lines[i] || "")) { names.set(f.name, "calls " + name); next.push(f.name); break; }
      }
    }
    frontier = next.slice(0, 30);
  }
  /* names that nearly every spec mentions (state, save, switchPage…) tell us nothing */
  const total = Object.keys(specs).length;
  const score = new Map();
  /* the tools' own specs name app functions only as fixtures */
  const appSpecs = Object.keys(specs).filter((k) => k !== "team-tools.spec.js" && k !== "agent-team.spec.js" && /bootAsGuest|APP_URL|"index\.html"/.test(specs[k]));
  for (const [name, reason] of names) {
    const rx = new RegExp("(^|[^\\w$#])#?" + name.replace(/[$]/g, "\\$") + "(?![\\w$-])");
    const hits = appSpecs.filter((k) => rx.test(specs[k]));
    if (!hits.length || hits.length > Math.max(3, total * 0.5)) continue;
    hits.forEach((h) => { add(h, reason); score.set(h, (score.get(h) || 0) + 1); });
  }
  if (!why.size) add("smoke.spec.js", "nothing more specific found: the smoke test at least");
  const list = [...why.keys()].sort((a, b) => (score.get(b) || 0) - (score.get(a) || 0) || a.localeCompare(b));
  return { all: false, specs: list, why };
}

if (isMain(import.meta.url)) {
  const src = readText(INDEX), map = codeMap(src), specs = readSpecs();
  const r = affected(gitChanges(arg("--base")), map, src, specs);
  if (r.all) { console.log("The change touches shared test setup or packages: run everything.\n\nnpx playwright test --trace off"); process.exit(0); }
  r.specs.forEach((s) => console.log(s.padEnd(28) + [...r.why.get(s)].slice(0, 3).join("; ")));
  if (r.specs.length > 10) console.log("\nThat is most of the suite: run everything instead.\n\nnpx playwright test --trace off");
  else console.log("\nnpx playwright test " + r.specs.map((s) => "tests/" + s).join(" ") + " --trace off");
}
