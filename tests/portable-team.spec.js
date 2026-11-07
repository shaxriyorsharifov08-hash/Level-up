/* THE PORTABLE AI TEAM (README 6c): portable/ai-team/ is the owner's team for
   every chat and project. scripts/team/build-portable.py checks it against
   claude.ai's skill rules and builds the upload zip, the Claude Code plugin
   and its marketplace. This proves the source is valid and project-neutral,
   the built files match it, and the validator really refuses bad input. */
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync, spawnSync } = require("child_process");
const { test, expect } = require("@playwright/test");

const ROOT = path.resolve(__dirname, "..");
const BUILD = path.join(ROOT, "scripts", "team", "build-portable.py");
const ROLES = ["planner", "coder", "tester", "translator", "reviewer", "designer", "health-safety", "analyst", "deck-editor", "docs-writer"];
const front = (t) => {
  const m = /^---\n([\s\S]*?)\n---\n/.exec(t);
  const o = {};
  if (m) m[1].split("\n").forEach((l) => { const i = l.indexOf(":"); if (i > 0 && l[0] !== " ") o[l.slice(0, i).trim()] = l.slice(i + 1).trim(); });
  return m ? o : null;
};
const zipNames = (p) => execFileSync("python3", ["-I", "-c", "import zipfile,sys,json;print(json.dumps(zipfile.ZipFile(sys.argv[1]).namelist()))", p], { encoding: "utf8" });

test.describe("the portable AI team", () => {
  test("the source is valid for claude.ai, and the built zip, plugin and marketplace match it", () => {
    const r = spawnSync("python3", ["-I", BUILD, "--check"], { encoding: "utf8" });
    expect(r.stdout + r.stderr).toContain("portable team: valid");
    expect(r.status).toBe(0);
  });

  test("the upload zip has the skill folder at its top, with every role, the rules and the tool", () => {
    const names = JSON.parse(zipNames(path.join(ROOT, "portable", "dist", "ai-team.zip")));
    expect(names.every((n) => n.startsWith("ai-team/"))).toBe(true);
    for (const f of ["SKILL.md", "references/owner-rules.md", "references/lessons-general.md", "scripts/office-text.py"]) expect(names).toContain("ai-team/" + f);
    for (const r of ROLES) expect(names).toContain("ai-team/references/roles/" + r + ".md");
    expect(names.some((n) => n.startsWith("ai-team/bin/"))).toBe(false);
    const skill = front(fs.readFileSync(path.join(ROOT, "portable", "ai-team", "SKILL.md"), "utf8"));
    expect(Object.keys(skill).every((k) => ["name", "description", "license", "compatibility", "metadata", "allowed-tools"].indexOf(k) !== -1)).toBe(true);
    expect(skill.name).toBe("ai-team");
    expect(skill.description.length).toBeLessThanOrEqual(200);
    expect(skill.description).not.toMatch(/[<>]/);
  });

  test("the plugin has the skill and ten agents; read-only roles cannot edit; the marketplace points to it", () => {
    const plug = path.join(ROOT, "plugins", "ai-team");
    expect(JSON.parse(fs.readFileSync(path.join(plug, ".claude-plugin", "plugin.json"), "utf8")).name).toBe("ai-team");
    expect(fs.existsSync(path.join(plug, "skills", "ai-team", "SKILL.md"))).toBe(true);
    const agents = fs.readdirSync(path.join(plug, "agents")).map((f) => f.replace(/\.md$/, "")).sort();
    expect(agents).toEqual(ROLES.slice().sort());
    for (const r of ROLES) {
      const m = front(fs.readFileSync(path.join(plug, "agents", r + ".md"), "utf8"));
      expect(m.name).toBe(r);
      if (["planner", "reviewer", "health-safety"].indexOf(r) !== -1) expect(m.tools).not.toMatch(/Edit|Write/);
    }
    const mk = JSON.parse(fs.readFileSync(path.join(ROOT, ".claude-plugin", "marketplace.json"), "utf8"));
    expect(mk.name).toBe("ai-team");
    expect(mk.owner.name.length).toBeGreaterThan(0);
    expect(mk.plugins).toEqual([expect.objectContaining({ name: "ai-team", source: "./plugins/ai-team" })]);
  });

  test("the validator refuses a project-specific leak, a long description, a tag, a missing role and a writing reviewer", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ai-team-"));
    const src = path.join(tmp, "ai-team");
    fs.cpSync(path.join(ROOT, "portable", "ai-team"), src, { recursive: true });
    const skill = path.join(src, "SKILL.md");
    fs.writeFileSync(skill, fs.readFileSync(skill, "utf8").replace(/^description: .*$/m, "description: Run <task> " + "x".repeat(200)));
    fs.appendFileSync(path.join(src, "references", "roles", "coder.md"), "\nAlways open index.html first.\n");
    fs.rmSync(path.join(src, "references", "roles", "analyst.md"));
    const rv = path.join(src, "references", "roles", "reviewer.md");
    fs.writeFileSync(rv, fs.readFileSync(rv, "utf8").replace(/^tools: .*$/m, "tools: Read, Edit"));
    const r = spawnSync("python3", ["-I", BUILD, "--check"], { encoding: "utf8", env: Object.assign({}, process.env, { AI_TEAM_SRC: src }) });
    const out = r.stdout + r.stderr;
    expect(r.status).toBe(1);
    expect(out).toContain("description must be 1-200 characters");
    expect(out).toContain("must not contain < or >");
    expect(out).toContain("project-specific word in the portable team: index.html");
    expect(out).toContain("roles must be exactly");
    expect(out).toContain("roles/reviewer.md must be read-only");
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  test("the bundled deck reader runs on its own, with no package", () => {
    const r = spawnSync("python3", ["-I", path.join(ROOT, "portable", "ai-team", "scripts", "office-text.py")], { encoding: "utf8" });
    expect(r.status).toBe(2);
    expect(r.stdout).toContain("--numbers");
  });
});
