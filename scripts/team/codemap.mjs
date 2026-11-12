/* codemap: find anything in index.html in a second (README 6b).
     node scripts/team/codemap.mjs                 overview: regions, sections, pages
     node scripts/team/codemap.mjs <word>          functions, vars, sections and HTML ids matching it
     node scripts/team/codemap.mjs --show <fn>     print a function's source with line numbers
     node scripts/team/codemap.mjs --refs <name>   where it is used, in the app and in the tests */
import { readdirSync } from "node:fs";
import { resolve } from "node:path";
import { ROOT, INDEX, readText, codeMap, arg, isMain } from "./lib.mjs";

export function overview(map) {
  const out = [];
  out.push("index.html: " + map.lineCount + " lines. CSS " + map.css.start + "-" + map.css.end + ", HTML " + map.html.start + "-" + map.html.end + ", JS " + map.js.map((r) => r.start + "-" + r.end).join(", ") + ".");
  out.push(map.functions.length + " functions, " + map.vars.length + " top-level vars, " + map.ids.length + " HTML ids.");
  out.push("Pages (<section id=page-…>): " + map.pages.map((p) => p.page + ":" + p.line).join("  "));
  out.push("", "JS sections (line, functions inside):");
  const js = map.banners.filter((b) => b.region === "js");
  js.forEach((b, i) => {
    const next = i + 1 < js.length ? js[i + 1].line : Infinity;
    const n = map.functions.filter((f) => f.line > b.line && f.line < next).length;
    out.push("  " + String(b.line).padStart(5) + "  " + b.title + (n ? "  (" + n + ")" : ""));
  });
  out.push("", "CSS sections: " + map.banners.filter((b) => b.region === "css").map((b) => b.line + " " + b.title).join(" · "));
  return out.join("\n");
}
export function search(map, q) {
  const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  const out = [];
  map.functions.filter((f) => rx.test(f.name)).forEach((f) => out.push("fn    " + f.name + "  " + f.line + "-" + f.end + "  [" + f.banner + "]"));
  map.vars.filter((v) => rx.test(v.name)).forEach((v) => out.push("var   " + v.name + "  " + v.line));
  map.banners.filter((b) => rx.test(b.title)).forEach((b) => out.push("sect  " + b.title + "  " + b.line + " (" + b.region + ")"));
  map.ids.filter((d) => rx.test(d.id)).forEach((d) => out.push("id    #" + d.id + "  " + d.line));
  return out.length ? out.join("\n") : "nothing named like \"" + q + "\" (try --refs " + q + " for uses in the code)";
}
export function show(map, src, name) {
  const f = map.functions.find((x) => x.name === name);
  if (!f) return "no function " + name;
  const lines = src.split("\n");
  return lines.slice(f.line - 1, f.end).map((l, i) => String(f.line + i).padStart(5) + "  " + l).join("\n");
}
export function refs(map, src, name, specs) {
  const rx = new RegExp("(^|[^\\w$])" + name.replace(/[$]/g, "\\$") + "(?![\\w$])");
  const out = [];
  src.split("\n").forEach((l, i) => {
    if (!rx.test(l)) return;
    const f = map.functionAt(i + 1);
    out.push(String(i + 1).padStart(5) + "  " + (f ? "[" + f.name + "] " : "") + l.trim().slice(0, 140));
  });
  const used = Object.keys(specs).filter((k) => rx.test(specs[k]));
  out.push("", "tests mentioning it: " + (used.length ? used.join(", ") : "none"));
  return out.join("\n");
}
export function readSpecs() {
  const dir = resolve(ROOT, "tests"), o = {};
  for (const f of readdirSync(dir)) if (f.endsWith(".spec.js")) o[f] = readText(resolve(dir, f));
  return o;
}

if (isMain(import.meta.url)) {
  const src = readText(INDEX), map = codeMap(src);
  const s = arg("--show"), r = arg("--refs"), q = process.argv.slice(2).find((x) => !x.startsWith("--"));
  if (s) console.log(show(map, src, s));
  else if (r) console.log(refs(map, src, r, readSpecs()));
  else if (q) console.log(search(map, q));
  else console.log(overview(map));
}
