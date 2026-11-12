/* i18n-check: is every new text in English, Russian and Uzbek? (README 6b)
     node scripts/team/i18n-check.mjs           only text added since HEAD
     node scripts/team/i18n-check.mjs --base main
     node scripts/team/i18n-check.mjs --all     the whole app (old gaps fall back to English)
   Checks tr("…") strings against the Russian and Uzbek dictionaries, and
   every {en, ru, uz} entry for missing languages, placeholders that differ,
   Uzbek written with an apostrophe or in Cyrillic, and Cyrillic in English. */
import { INDEX, readText, codeMap, gitChanges, arg, isMain } from "./lib.mjs";

function unq(s) { try { return JSON.parse("\"" + s + "\""); } catch (e) { return s; } }
export function dictKeys(src, map, name) {
  const lines = src.split("\n"), v = map.vars.find((x) => x.name === name);
  const keys = new Set();
  if (!v) return keys;
  let depth = 0;
  for (let i = v.line - 1; i < lines.length; i++) {
    const re = /"((?:[^"\\]|\\.)*)"\s*:\s*"/g;
    let m;
    while ((m = re.exec(lines[i]))) keys.add(unq(m[1]));
    for (const ch of lines[i].replace(/"(?:[^"\\]|\\.)*"/g, "")) { if (ch === "{") depth++; else if (ch === "}") depth--; }
    if (depth <= 0 && i > v.line - 1) break;
  }
  return keys;
}
const vars = (s) => (String(s).match(/\{\w+\}/g) || []).sort().join();
export function checkEntry(obj, where) {
  const P = [];
  for (const l of ["en", "ru", "uz"]) if (typeof obj[l] !== "string" || !obj[l].trim()) P.push(where + ": missing " + l);
  if (obj.uz && /[OoGg]['‘’`]/.test(obj.uz)) P.push(where + ": Uzbek uses an apostrophe, write oʻ / gʻ");
  if (obj.uz && /[А-Яа-яЁё]/.test(obj.uz)) P.push(where + ": Uzbek in Cyrillic");
  if (obj.en && /[А-Яа-яЁё]/.test(obj.en)) P.push(where + ": Cyrillic in English");
  if (obj.en && ((obj.ru && vars(obj.ru) !== vars(obj.en)) || (obj.uz && vars(obj.uz) !== vars(obj.en)))) P.push(where + ": the {placeholders} differ between languages");
  return P;
}
export function run(src, map, onlyLines) {
  const lines = src.split("\n"), ru = dictKeys(src, map, "I18N_RU"), uz = dictKeys(src, map, "I18N_UZ");
  const want = (n) => !onlyLines || onlyLines.has(n);
  const problems = [];
  const seen = new Set();
  lines.forEach((l, i) => {
    const n = i + 1;
    if (!want(n) || map.region(n) !== "js") return;
    for (const m of l.matchAll(/\btr\("((?:[^"\\]|\\.)*)"\)/g)) {
      const k = unq(m[1]);
      if (seen.has(k) || !/[A-Za-z]{2}/.test(k)) continue;
      seen.add(k);
      const miss = [!ru.has(k) && "Russian", !uz.has(k) && "Uzbek"].filter(Boolean);
      if (miss.length) problems.push("line " + n + ": tr(\"" + k.slice(0, 70) + "\") has no " + miss.join(" or ") + " translation");
    }
    for (const m of l.matchAll(/\{en:"((?:[^"\\]|\\.)*)"(?:\s*,\s*ru:"((?:[^"\\]|\\.)*)")?(?:\s*,\s*uz:"((?:[^"\\]|\\.)*)")?\s*\}/g)) {
      checkEntry({ en: unq(m[1]), ru: m[2] === undefined ? undefined : unq(m[2]), uz: m[3] === undefined ? undefined : unq(m[3]) }, "line " + n).forEach((p) => problems.push(p));
    }
  });
  return problems;
}

if (isMain(import.meta.url)) {
  const src = readText(INDEX), map = codeMap(src);
  let only = null;
  if (process.argv.indexOf("--all") === -1) {
    const c = gitChanges(arg("--base")).find((x) => x.file === "index.html");
    only = new Set(c ? c.added.map((a) => a.line) : []);
    if (!only.size) { console.log("i18n-check: index.html has no added lines (use --all for the whole app)."); process.exit(0); }
  }
  const p = run(src, map, only);
  if (!p.length) { console.log("i18n-check: every checked text has English, Russian and Uzbek."); process.exit(0); }
  p.forEach((x) => console.log(x));
  console.log("\n" + p.length + " problem(s)." + (only ? "" : " (Old gaps fall back to English; fix the ones a hero sees often.)"));
  process.exit(only ? 1 : 0);
}
