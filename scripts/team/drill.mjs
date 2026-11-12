/* drill: train the AI dev team on practice tasks with answer keys (README 6b).
     node scripts/team/drill.mjs list
     node scripts/team/drill.mjs setup <id>           a throwaway copy (git worktree in .drills/<id>) with the planted problems
     node scripts/team/drill.mjs score <id> <report>  the role's report against the answer key (+ the drill's checks)
     node scripts/team/drill.mjs score <id> <report> --log   …and add the result to .claude/team/drills/results.md
     node scripts/team/drill.mjs clean [<id>]         remove the copy (or all of them)
   The drills live in .claude/team/drills/drills.json. Each has a brief for the
   role, the planted edits (exact text that must occur once), and either an
   answer key (findings the report must name) or checks that must pass after
   the role's work. Nothing here touches the real working tree. */
import { readFileSync, writeFileSync, existsSync, symlinkSync, rmSync, appendFileSync, mkdirSync } from "node:fs";
import { execFileSync, execSync } from "node:child_process";
import { resolve } from "node:path";
import { ROOT, isMain } from "./lib.mjs";

export const DRILLS = resolve(ROOT, ".claude", "team", "drills", "drills.json");
export function loadDrills() { return JSON.parse(readFileSync(DRILLS, "utf8")); }

/* apply the planted edits to file contents; every anchor must occur exactly once */
export function plant(drill, read) {
  const out = {};
  for (const e of drill.edits) {
    const text = out[e.file] !== undefined ? out[e.file] : read(e.file);
    const n = text.split(e.find).length - 1;
    if (n !== 1) throw new Error(drill.id + ": the text to replace occurs " + n + " times in " + e.file + " (expected once): " + e.find.slice(0, 60));
    out[e.file] = text.replace(e.find, () => e.replace);
  }
  return out;
}
/* a finding counts when every group has at least one of its words in the report */
export function score(drill, report) {
  const r = String(report || "").toLowerCase();
  const rows = (drill.expect || []).map((x) => ({ label: x.label, found: x.groups.every((g) => g.some((w) => r.indexOf(w.toLowerCase()) !== -1)) }));
  return { rows, found: rows.filter((x) => x.found).length, total: rows.length };
}

function wt(id) { return resolve(ROOT, ".drills", id); }
function clean(id) {
  const p = wt(id);
  try { execFileSync("git", ["worktree", "remove", "--force", p], { cwd: ROOT, stdio: "ignore" }); } catch (e) { /* not a worktree */ }
  rmSync(p, { recursive: true, force: true });
  try { execFileSync("git", ["worktree", "prune"], { cwd: ROOT, stdio: "ignore" }); } catch (e) { /* ignore */ }
}

if (isMain(import.meta.url)) {
  const [cmd, id, reportPath] = process.argv.slice(2);
  const drills = loadDrills();
  const d = drills.find((x) => x.id === id);
  if (cmd === "list" || !cmd) {
    for (const x of drills) console.log(x.id.padEnd(14) + x.role.padEnd(12) + x.title);
  } else if (cmd === "setup") {
    if (!d) { console.log("no drill " + id); process.exit(2); }
    clean(id);
    mkdirSync(resolve(ROOT, ".drills"), { recursive: true });
    execFileSync("git", ["worktree", "add", "--detach", wt(id), "HEAD"], { cwd: ROOT, stdio: "ignore" });
    const files = plant(d, (f) => readFileSync(resolve(wt(id), f), "utf8"));
    for (const f of Object.keys(files)) writeFileSync(resolve(wt(id), f), files[f]);
    if (existsSync(resolve(ROOT, "node_modules")) && !existsSync(resolve(wt(id), "node_modules"))) symlinkSync(resolve(ROOT, "node_modules"), resolve(wt(id), "node_modules"), "dir");
    console.log("Drill " + d.id + " (" + d.role + "): " + d.title);
    console.log("Copy with the planted problems: " + wt(id));
    console.log("\nBrief for the " + d.role + " (give it this, the path, and its role file; never the answer key):\n" + d.brief);
  } else if (cmd === "score") {
    if (!d || !reportPath) { console.log("usage: score <id> <report file>"); process.exit(2); }
    const s = score(d, readFileSync(reportPath, "utf8"));
    s.rows.forEach((x) => console.log((x.found ? "FOUND  " : "MISSED ") + x.label));
    let checks = 0, passed = 0;
    for (const c of d.verify || []) {
      checks++;
      try { execSync(c, { cwd: wt(id), stdio: "ignore", timeout: 300000 }); passed++; console.log("PASS   " + c); }
      catch (e) { console.log("FAIL   " + c); }
    }
    (d.decoys || []).forEach((x) => console.log("judge  false alarm? " + x));
    const line = d.id + ": " + s.found + "/" + s.total + " findings" + (checks ? ", " + passed + "/" + checks + " checks" : "");
    console.log("\n" + line);
    if (process.argv.indexOf("--log") !== -1) {
      const log = resolve(ROOT, ".claude", "team", "drills", "results.md");
      if (!existsSync(log)) writeFileSync(log, "# Drill results\n\nOne line per drill run: date, drill, role, score, what was learned (the lesson goes to LESSONS.md).\n\n");
      appendFileSync(log, "- " + new Date().toISOString().slice(0, 10) + " · " + line + " · " + d.role + "\n");
    }
  } else if (cmd === "clean") {
    (id ? [id] : drills.map((x) => x.id)).forEach(clean);
    console.log("cleaned");
  } else console.log("commands: list, setup <id>, score <id> <report> [--log], clean [<id>]");
}
