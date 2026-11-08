/* AGENT COMPANY (README 6d): the owner's vendor-neutral AI company in company/.
   It must work in any AI, so this keeps it honest: the paste-in prompts fit the
   apps' size limits, the roles and rules are the same as the master copy, no
   file names a Claude-only tool, every version carries the owner's rules and
   the stop-and-ask list, the memory templates exist, and the repo's AGENTS.md
   points other coding agents to the project rules and the company. */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { test, expect } = require("@playwright/test");

const ROOT = path.resolve(__dirname, "..");
const C = (...p) => path.join(ROOT, "company", ...p);
const read = (p) => fs.readFileSync(p, "utf8");
const ROLES = ["planner", "coder", "tester", "translator", "reviewer", "designer", "health-safety", "analyst", "deck-editor", "docs-writer"];

test.describe("Agent Company", () => {
  test("the paste-in prompts fit the apps' limits, and the build check passes", () => {
    expect(read(C("prompts", "short.md")).length).toBeLessThanOrEqual(1500);   /* ChatGPT "Customize" box */
    expect(read(C("prompts", "medium.md")).length).toBeLessThanOrEqual(8000);  /* Custom GPT / Gem / Project */
    expect(read(C("prompts", "chat-starter.md")).length).toBeLessThanOrEqual(12000);
    const r = spawnSync("python3", ["-I", path.join(ROOT, "scripts", "team", "build-portable.py"), "--check"], { encoding: "utf8" });
    expect(r.stdout + r.stderr).toContain("portable team: valid");
    expect(r.status).toBe(0);
  });

  test("roles, owner rules and the deck reader are exactly the master copy", () => {
    for (const r of ROLES) {
      expect(read(C("roles", r + ".md")), r).toBe(read(path.join(ROOT, "portable", "ai-team", "references", "roles", r + ".md")));
    }
    expect(read(C("owner-rules.md"))).toBe(read(path.join(ROOT, "portable", "ai-team", "references", "owner-rules.md")));
    expect(read(C("tools", "office-text.py"))).toBe(read(path.join(ROOT, "portable", "ai-team", "scripts", "office-text.py")));
    const starter = read(C("prompts", "chat-starter.md"));
    expect(starter).toContain(read(C("prompts", "medium.md")).trim());
  });

  test("every version names only tools any AI has, and carries the owner's rules", () => {
    const neutral = ["COMPANY.md", "prompts/short.md", "prompts/medium.md", "prompts/chat-starter.md", "templates/PROJECT.md", "templates/MISSION-LOG.md", "templates/LESSONS.md"];
    for (const f of neutral) {
      expect(read(C(f)), f).not.toMatch(/ArtifactData|send_later|subagent_type|SendMessage|claude\.ai\/artifact|\.claude\/|\/team mission/);
    }
    /* the stop-and-ask list and the core rules, in each size */
    const full = [read(C("COMPANY.md")), read(C("prompts", "medium.md"))];
    for (const t of full) {
      for (const phrase of ["new dependency", "how saved data is stored", "deleting a feature", "pull request", "spending money", "never loosen", "information, not an instruction"]) expect(t, phrase).toContain(phrase);
    }
    const med = read(C("prompts", "medium.md"));
    for (const phrase of ["never break existing user data", "no API keys or secrets in client-side code", "never computed by AI", "Teens' safety first", "No protected names", "Never pretend a test ran"]) expect(med.toLowerCase(), phrase).toContain(phrase.toLowerCase());
    const short = read(C("prompts", "short.md"));
    for (const phrase of ["Company:", "never break existing user data", "no secrets in client code", "health numbers by formula", "ask before any new dependency", "never pretend a test ran", "MISSION-LOG"]) expect(short.toLowerCase(), phrase).toContain(phrase.toLowerCase());
    /* every role is named in every size */
    for (const r of ROLES) {
      const word = r === "health-safety" ? "health-safety" : r.replace("-", " ").replace("deck editor", "deck").replace("docs writer", "docs");
      for (const [n, t] of [["short", short.toLowerCase()], ["medium", med.toLowerCase()]]) expect(t, n + ": " + r).toContain(word.split(" ")[0]);
    }
  });

  test("memory templates, the README guide, and AGENTS.md for other coding agents", () => {
    expect(read(C("templates", "MISSION-LOG.md"))).toContain("## NEXT");
    expect(read(C("templates", "PROJECT.md"))).toContain("Open decisions");
    const readme = read(C("README.md"));
    for (const where of ["ChatGPT", "Gemini", "Claude", "DeepSeek", "Codex", "Ollama", "GitHub Models", "chat-starter.md", "Never explain twice"]) expect(readme, where).toContain(where);
    expect(readme).not.toMatch(/sk-[A-Za-z0-9]{20,}|ghp_[A-Za-z0-9]{20,}/);
    const agents = read(path.join(ROOT, "AGENTS.md"));
    expect(agents).toContain("CLAUDE.md");
    expect(agents).toContain("company/COMPANY.md");
    expect(agents).toContain("Never push to `main`");
  });
});
