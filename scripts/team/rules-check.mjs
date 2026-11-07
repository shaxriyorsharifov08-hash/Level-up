/* rules-check: the owner's rules (CLAUDE.md) checked on a change in seconds
   (README 6b). It reads only what was added or removed, so old code does not
   drown the answer. ERROR = breaks a rule, WARN = a person must look.
     node scripts/team/rules-check.mjs              against HEAD (uncommitted work)
     node scripts/team/rules-check.mjs --base main  everything since main
   Exit code 1 when there is an ERROR. It is a fast first pass, not a review:
   the reviewer and health-safety roles still read the change. */
import { INDEX, readText, codeMap, saveFields, gitChanges, arg, isMain } from "./lib.mjs";

/* real key formats, anywhere; plus "key = '<long value>'" outside the tests (their fakes are fine) */
const SECRET = /sk-ant-[\w-]{8,}|sk-[A-Za-z0-9]{32,}|ghp_[A-Za-z0-9]{20,}|github_pat_[\w]{20,}|AIza[0-9A-Za-z_-]{30,}|xox[abpr]-[\w-]{10,}|-----BEGIN [A-Z ]*PRIVATE KEY-----/;
const SECRET_ASSIGN = /(api[_-]?key|secret|password|passwd|token)["']?\s*[:=]\s*["'][^"'\s]{20,}["']/i;
const UZ_BAD = /[OoGg]['‘’`]/;
const CYR = /[А-Яа-яЁё]/;

function stripLiterals(s) {
  return s.replace(/\/\*.*?\*\//g, "").replace(/\/\/.*$/, "")
    .replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g, "\"\"").replace(/\[(?:[^\]\\]|\\.)*\]/g, "[]");
}
/* every "key":"value" pair on a line, for dictionary lines */
function pairs(s) { const out = []; const re = /"((?:[^"\\]|\\.)*)"\s*:\s*"((?:[^"\\]|\\.)*)"/g; let m; while ((m = re.exec(s))) out.push([m[1], m[2]]); return out; }

export function check(changes, ctx) {
  const F = [];
  const hit = (level, file, line, rule, msg) => F.push({ level, file, line, rule, msg });
  const { map, src } = ctx;
  const lines = src.split("\n");
  const known = saveFields(src, map);
  const addedIdx = new Set();
  const idx = changes.find((c) => c.file === "index.html");
  if (idx) idx.added.forEach((a) => addedIdx.add(a.line));
  /* fields and hosts the page already had, on lines this change did not add */
  const oldText = lines.filter((l, i) => !addedIdx.has(i + 1)).join("\n");
  const hostsBefore = new Set((oldText.match(/https?:\/\/[a-z0-9.-]+/gi) || []).map((u) => u.replace(/^https?:\/\//i, "").toLowerCase()));
  const ruStart = (map.vars.find((v) => v.name === "I18N_RU") || {}).line || 0;
  const uzStart = (map.vars.find((v) => v.name === "I18N_UZ") || {}).line || 0;
  const dictEnd = (map.functions.find((f) => f.name === "i18nDict") || {}).line || 0;

  for (const c of changes) {
    if (!c.file) continue;
    const isIndex = c.file === "index.html", isWorker = /^ai-proxy\/.*\.m?js$/.test(c.file);
    const isCode = /\.(html|m?js)$/.test(c.file) && !/^tests\//.test(c.file);
    for (const r of c.removed) {
      if (isCode && /leveluphunter_v1|leveluphunter_db/.test(r.text)) hit("ERROR", c.file, r.line, "storage key", "a line with the storage key leveluphunter_v1 / leveluphunter_db was removed or changed: renaming it makes every hero lose their progress (README 6)");
    }
    const joined = c.added.map((a) => a.text).join("\n");
    for (const a of c.added) {
      const t = a.text;
      if (SECRET.test(t) || (!/^tests\//.test(c.file) && SECRET_ASSIGN.test(t))) hit("ERROR", c.file, a.line, "no secrets", "this looks like a key, token or password. The site is public: keys live only in the Worker's settings (CLAUDE.md rule 2)");
      if (isWorker && /console\.(log|info|warn|error|debug)\s*\(/.test(t)) hit("ERROR", c.file, a.line, "Worker logs nothing", "the Worker must not log (questions could end up in logs)");
      if (/^package(-lock)?\.json$/.test(c.file) && /"[\w@/.-]+"\s*:\s*"[\^~]?\d/.test(t)) hit("ERROR", c.file, a.line, "ask before dependencies", "a package version was added or changed: the owner must approve every dependency first (CLAUDE.md rule 8)");
      if (!isIndex) continue;
      const reg = map.region(a.line);
      if (/\/\*\s*TRANSLATE\s*\*\//.test(t)) hit("WARN", c.file, a.line, "waiting for translation", "this text is still marked /* TRANSLATE */: the translator must write the Russian and Uzbek before it ships");
      if (/<script[^>]+src=/.test(t)) hit("ERROR", c.file, a.line, "ask before dependencies", "a new outside script is a new dependency: ask the owner first, and the app must still work offline");
      if (reg === "js" && stripLiterals(t).indexOf("`") !== -1) hit("ERROR", c.file, a.line, "no template literals", "backticks (template literals) are not allowed in the app's JavaScript, for old devices: use \"a\" + b (README 6)");
      for (const u of t.match(/https?:\/\/[a-z0-9.-]+/gi) || []) {
        const h = u.replace(/^https?:\/\//i, "").toLowerCase();
        if (!hostsBefore.has(h) && !/^www\.w3\.org$/.test(h)) hit("WARN", c.file, a.line, "new outside address", "the page now talks to " + h + ": does it work offline, and do the consent and privacy texts say what is sent there? (CLAUDE.md rules 5, 6)");
      }
      for (const m of t.matchAll(/uz:"((?:[^"\\]|\\.)*)"/g)) {
        if (UZ_BAD.test(m[1])) hit("ERROR", c.file, a.line, "Uzbek letters", "Uzbek must use ʻ in oʻ and gʻ, not an apostrophe: \"" + m[1].slice(0, 60) + "\"");
        if (CYR.test(m[1])) hit("ERROR", c.file, a.line, "Uzbek letters", "Uzbek is written in Latin script: Cyrillic found in \"" + m[1].slice(0, 60) + "\"");
      }
      for (const m of t.matchAll(/en:"((?:[^"\\]|\\.)*)"/g)) if (CYR.test(m[1])) hit("ERROR", c.file, a.line, "English text", "Cyrillic inside an English text: \"" + m[1].slice(0, 60) + "\"");
      if (uzStart && a.line > uzStart && a.line < dictEnd) {
        for (const [k, v] of pairs(t)) {
          if (UZ_BAD.test(v)) hit("ERROR", c.file, a.line, "Uzbek letters", "Uzbek dictionary value uses an apostrophe instead of ʻ: \"" + v.slice(0, 60) + "\"");
          if (CYR.test(v)) hit("ERROR", c.file, a.line, "Uzbek letters", "Cyrillic in the Uzbek dictionary: \"" + v.slice(0, 60) + "\"");
        }
      }
      if (reg === "js" && /\/(?:[^/\n\\]|\\.)*[А-Яа-яЁё][^/\n]*\\b|\\b[А-Яа-яЁё]/.test(t)) hit("WARN", c.file, a.line, "regex and Cyrillic", "\\b does not work next to Cyrillic letters in JavaScript regexes (\\b only knows A-Z, 0-9 and _): use (?=\\s|$) or a lookbehind instead");
      for (const m of t.matchAll(/(?<![\w$.])state\.([A-Za-z_$][\w$]*)/g)) {
        const k = m[1];
        if (known.has(k) || new RegExp("state\\." + k + "(?![\\w$])").test(oldText)) continue;
        hit("WARN", c.file, a.line, "save format", "state." + k + " is a new save field: add its default to defaultState() (or a migration in migrateState()) and a test that an old save still loads (CLAUDE.md rule 1)");
        known.add(k);
      }
      if (reg === "js" && /innerHTML|\+=\s*'<|'<[a-z]/.test(t)) {
        for (const m of t.matchAll(/\+\s*([A-Za-z_$][\w$]*(?:\.[\w$]+)*(?:\([^()]*\))?)\s*\+/g)) {
          const e = m[1];
          if (/^(esc|MT|tr|mPick|fmt\w*|String|Math|Number|parseInt|pad2|\w+Html|\w+Icon|ico\w*)\b/.test(e)) continue;
          if (/(^|\.)(name|text|desc|title|note|answer|reply|label|msg|q|value|body|signed|words)$/i.test(e)) hit("WARN", c.file, a.line, "escape HTML", e + " goes into HTML without esc(): if it can hold user or AI text, wrap it in esc()");
        }
      }
    }
    /* a three-language entry added without all three languages */
    if (isIndex) {
      for (const m of joined.matchAll(/\{en:"(?:[^"\\]|\\.)*"[^{}]*\}/g)) {
        if (!/\bru:"/.test(m[0]) || !/\buz:"/.test(m[0])) {
          const line = (c.added.find((a) => a.text.indexOf(m[0].slice(0, 40)) !== -1) || {}).line || 0;
          hit("ERROR", c.file, line, "three languages", "a text entry has English but not Russian and Uzbek: " + m[0].slice(0, 70));
        }
      }
    }
  }
  return F;
}

if (isMain(import.meta.url)) {
  const src = readText(INDEX), map = codeMap(src);
  const changes = gitChanges(arg("--base"));
  const F = check(changes, { map, src });
  if (!changes.length) { console.log("No changes to check."); process.exit(0); }
  if (!F.length) { console.log("rules-check: no rule problems found in " + changes.length + " changed file(s)."); process.exit(0); }
  F.sort((a, b) => (a.level === b.level ? 0 : a.level === "ERROR" ? -1 : 1));
  for (const f of F) console.log(f.level.padEnd(5) + " " + f.file + ":" + f.line + "  [" + f.rule + "] " + f.msg);
  const e = F.filter((f) => f.level === "ERROR").length;
  console.log("\n" + e + " error(s), " + (F.length - e) + " warning(s).");
  process.exit(e ? 1 : 0);
}
