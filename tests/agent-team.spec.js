/* THE AI DEV TEAM (README 6b): CLAUDE.md, the role agents in .claude/agents/
   and the lead's playbook in .claude/skills/team/. These are plain files, so
   this only checks they stay usable: every role has a valid header, the
   read-only roles cannot edit, every role the playbook names exists, and the
   owner's rules are where every agent reads them. */
const fs = require("fs");
const path = require("path");
const { test, expect } = require("@playwright/test");

const ROOT = path.resolve(__dirname, "..");
const AGENTS = path.join(ROOT, ".claude", "agents");
const ROLES = ["planner", "coder", "tester", "translator", "reviewer", "docs-writer", "deck-editor"];
const TOOLS = ["Read", "Edit", "Write", "Grep", "Glob", "Bash"];

function front(file) {
  const src = fs.readFileSync(file, "utf8");
  const m = /^---\n([\s\S]*?)\n---\n([\s\S]+)$/.exec(src);
  if (!m) return null;
  const meta = {};
  m[1].split("\n").forEach((l) => { const i = l.indexOf(":"); if (i > 0) meta[l.slice(0, i).trim()] = l.slice(i + 1).trim(); });
  return { meta, body: m[2] };
}

test.describe("the AI dev team", () => {
  test("every role has a valid header and instructions that start from the owner's rules", () => {
    const files = fs.readdirSync(AGENTS).filter((f) => f.endsWith(".md")).sort();
    expect(files).toEqual(ROLES.map((r) => r + ".md").sort());
    for (const f of files) {
      const a = front(path.join(AGENTS, f));
      expect(a, f).not.toBe(null);
      expect(a.meta.name).toBe(f.replace(/\.md$/, ""));
      expect(a.meta.description.length, f).toBeGreaterThan(60);
      const tools = a.meta.tools.split(",").map((t) => t.trim());
      expect(tools.every((t) => TOOLS.indexOf(t) !== -1), f + ": " + a.meta.tools).toBe(true);
      expect(["inherit", "sonnet", "opus", "haiku"]).toContain(a.meta.model);
      expect(a.body, f).toContain("CLAUDE.md");
      expect(a.body.length, f).toBeGreaterThan(500);
    }
    /* the planner and the reviewer only read */
    for (const r of ["planner", "reviewer"]) {
      const tools = front(path.join(AGENTS, r + ".md")).meta.tools;
      expect(tools).not.toMatch(/Edit|Write/);
    }
  });

  test("the lead's playbook names only real roles and keeps the owner in charge", () => {
    const s = front(path.join(ROOT, ".claude", "skills", "team", "SKILL.md"));
    expect(s.meta.name).toBe("team");
    const named = (s.body.match(/\| `([a-z-]+)` \|/g) || []).map((x) => x.slice(3, -3));
    expect(named.sort()).toEqual(ROLES.slice().sort());
    expect(s.body).toContain("Stop and ask the owner before");
    expect(s.body).toContain("adding a dependency");
    expect(s.body).toContain("Never skip, weaken or delete a test");
    expect(s.body).toContain("One writer per file at a time");
  });

  test("CLAUDE.md carries the owner's rules for every agent, and no secret", () => {
    const c = fs.readFileSync(path.join(ROOT, "CLAUDE.md"), "utf8");
    for (const rule of ["Never break existing user data", "No API keys or secrets in client-side code", "Diet calculator", "Health safety", "Privacy", "three languages", "No protected anime or game names", "Ask before adding any dependency", "Decks and documents", "Never push to `main`"]) {
      expect(c, rule).toContain(rule);
    }
    const all = [c].concat(fs.readdirSync(AGENTS).map((f) => fs.readFileSync(path.join(AGENTS, f), "utf8")));
    for (const t of all) expect(t).not.toMatch(/sk-ant-|ghp_[A-Za-z0-9]{20,}|github_pat_|AIza[0-9A-Za-z_-]{20,}|claude-(opus|sonnet|haiku|fable)-\d/);
  });
});
