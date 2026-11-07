/* Shared helpers for the AI dev team's tools (README 6b). Plain Node, no packages.
   codeMap() turns the 14,000-line index.html into a map (regions, section
   banners, functions with their line ranges, top-level vars, HTML ids), and
   parseDiff()/gitChanges() read what changed, so each tool answers in a
   second what would take an agent minutes of searching. */
import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const INDEX = resolve(ROOT, "index.html");

export function readText(p) { return readFileSync(p, "utf8"); }

/* ---------- the map of index.html ---------- */
function braceDelta(s) {
  /* braces outside strings, regex classes and comments, roughly: enough for one-line bodies */
  const t = s.replace(/\/\*.*?\*\//g, "").replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g, "\"\"").replace(/\[(?:[^\]\\]|\\.)*\]/g, "[]");
  let d = 0;
  for (const ch of t) { if (ch === "{") d++; else if (ch === "}") d--; }
  return d;
}
export function codeMap(src) {
  const lines = src.split("\n");
  const map = { lineCount: lines.length, css: null, js: [], html: null, banners: [], functions: [], vars: [], ids: [], pages: [] };
  lines.forEach((l, i) => {
    const n = i + 1;
    if (/^<style>\s*$/.test(l) && !map.css) map.css = { start: n, end: 0 };
    if (/^<\/style>\s*$/.test(l) && map.css && !map.css.end) map.css.end = n;
    if (/^<script>\s*$/.test(l)) map.js.push({ start: n, end: 0 });
    if (/^<\/script>\s*$/.test(l) && map.js.length && !map.js[map.js.length - 1].end) map.js[map.js.length - 1].end = n;
  });
  if (map.css && map.js.length) map.html = { start: map.css.end + 1, end: map.js[0].start - 1 };
  const region = (n) => (map.css && n >= map.css.start && n <= map.css.end) ? "css"
    : map.js.some((r) => n >= r.start && n <= (r.end || lines.length)) ? "js" : "html";
  map.region = region;
  lines.forEach((l, i) => {
    const n = i + 1;
    let m = /^\/\* -{3,} (.+?) -{3,} \*\//.exec(l) || /^\/\* -{4} (.+?)(?: -{4}.*)?$/.exec(l);
    if (m) { map.banners.push({ title: m[1].trim(), line: n, region: region(n) }); return; }
    if (region(n) === "js") {
      m = /^(\s*)function ([\w$]+)\s*\(/.exec(l) || /^(\s*)(?:var\s+)?([\w$.]+)\s*=\s*function\s*\(/.exec(l);
      if (m) map.functions.push({ name: m[2], line: n, indent: m[1].length, end: 0 });
      m = /^var ([\w$]+)\s*=/.exec(l);
      if (m) map.vars.push({ name: m[1], line: n });
    } else if (region(n) === "html") {
      const re = /\bid="([^"]+)"/g;
      let k;
      while ((k = re.exec(l))) map.ids.push({ id: k[1], line: n });
      k = /<section id="page-([\w-]+)"/.exec(l);
      if (k) map.pages.push({ page: k[1], line: n });
    }
  });
  /* where each function ends: its braces balance on the first line, or the
     closing brace comes back at the same indent */
  for (const f of map.functions) {
    const first = lines[f.line - 1];
    if (braceDelta(first) <= 0 && first.indexOf("{") !== -1) { f.end = f.line; continue; }
    const close = new RegExp("^" + " ".repeat(f.indent) + "\\}");
    for (let j = f.line; j < lines.length && j < f.line + 1500; j++) {
      if (close.test(lines[j])) { f.end = j + 1; break; }
    }
    if (!f.end) f.end = f.line;
  }
  const bannerAt = (n, reg) => {
    let b = null;
    for (const x of map.banners) { if (x.line > n) break; if (!reg || x.region === reg) b = x; }
    return b;
  };
  map.bannerAt = bannerAt;
  for (const f of map.functions) { const b = bannerAt(f.line, "js"); f.banner = b ? b.title : ""; }
  map.functionAt = (n) => {
    let best = null;
    for (const f of map.functions) if (f.line <= n && n <= f.end && (!best || f.line >= best.line)) best = f;
    return best;
  };
  return map;
}
export function loadMap() { return codeMap(readText(INDEX)); }

/* the keys a fresh save has: defaultState()'s own top level, plus fields that
   migrateState() sets on purpose outside it */
export function saveFields(src, map) {
  const lines = src.split("\n"), keys = new Set();
  const ds = map.functions.find((f) => f.name === "defaultState");
  if (ds) for (let i = ds.line; i < ds.end; i++) {
    if (!/^ {4}\S/.test(lines[i])) continue; /* top-level keys sit at four spaces */
    let t = lines[i].replace(/\/\*.*?\*\//g, "").replace(/"(?:[^"\\]|\\.)*"/g, "\"\"");
    for (let k = 0; k < 5; k++) t = t.replace(/\{[^{}]*\}|\[[^\[\]]*\]/g, "0");
    const re = /(?:^ {4}|,\s*)([\w$]+)\s*:/g;
    let m;
    while ((m = re.exec(t))) keys.add(m[1]);
  }
  const mg = map.functions.find((f) => f.name === "migrateState");
  if (mg) for (let i = mg.line; i < mg.end; i++) { const re = /state\.([\w$]+)\s*=(?!=)/g; let m; while ((m = re.exec(lines[i]))) keys.add(m[1]); }
  return keys;
}

/* ---------- reading what changed ---------- */
export function parseDiff(text) {
  const files = [];
  let cur = null, oldN = 0, newN = 0;
  for (const raw of String(text || "").split("\n")) {
    let m;
    if (raw.startsWith("diff --git ")) { cur = null; continue; }
    if ((m = /^\+\+\+ (?:b\/)?(.+)$/.exec(raw))) {
      const f = m[1].trim();
      cur = { file: f === "/dev/null" ? null : f, added: [], removed: [] };
      if (cur.file) files.push(cur);
      continue;
    }
    if (raw.startsWith("--- ")) continue;
    if ((m = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(raw))) { oldN = +m[1]; newN = +m[2]; continue; }
    if (!cur) continue;
    if (raw.startsWith("+")) { cur.added.push({ line: newN, text: raw.slice(1) }); newN++; }
    else if (raw.startsWith("-")) { cur.removed.push({ line: oldN, text: raw.slice(1) }); oldN++; }
    else if (raw.startsWith(" ")) { oldN++; newN++; }
  }
  return files;
}
function git(args) {
  try { return execFileSync("git", args, { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }); } catch (e) { return ""; }
}
/* what changed against a base (default HEAD): commits, staged and unstaged
   edits, and new files not yet added */
export function gitChanges(base) {
  const files = parseDiff(git(["diff", "--unified=0", "--no-color", base || "HEAD"]));
  const known = new Set(files.map((f) => f.file));
  for (const f of git(["ls-files", "--others", "--exclude-standard"]).split("\n").filter(Boolean)) {
    if (known.has(f)) continue;
    const p = resolve(ROOT, f);
    let text = "";
    try { text = existsSync(p) ? readText(p) : ""; } catch (e) { text = ""; }
    files.push({ file: f, added: text.split("\n").map((t, i) => ({ line: i + 1, text: t })), removed: [], untracked: true });
  }
  return files;
}
export function arg(name, argv) {
  const a = argv || process.argv;
  const i = a.indexOf(name);
  return i !== -1 && i + 1 < a.length ? a[i + 1] : null;
}
export function isMain(metaUrl) {
  return !!process.argv[1] && resolve(process.argv[1]) === fileURLToPath(metaUrl);
}
