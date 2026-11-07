/* THE AI DEV TEAM's tools (README 6b): scripts/team/. Run in plain Node on the
   real index.html, so a change to the app that would blind a tool shows up
   here: the code map finds functions and sections, affected-tests picks the
   right specs, rules-check catches each of the owner's rules, i18n-check
   finds missing languages, office-text reads decks and Word files, and every
   training drill still plants cleanly on the current code. */
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");
const { pathToFileURL } = require("url");
const { test, expect } = require("@playwright/test");

const ROOT = path.resolve(__dirname, "..");
const T = (f) => pathToFileURL(path.join(ROOT, "scripts", "team", f)).href;
let L, CM, AT, RC, I18N, DR, src, map, specs;

test.describe("the AI dev team's tools", () => {
  test.beforeAll(async () => {
    [L, CM, AT, RC, I18N, DR] = await Promise.all(["lib.mjs", "codemap.mjs", "affected-tests.mjs", "rules-check.mjs", "i18n-check.mjs", "drill.mjs"].map((f) => import(T(f))));
    src = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
    map = L.codeMap(src);
    specs = CM.readSpecs();
  });
  const fn = (name) => map.functions.find((f) => f.name === name);

  test("codemap finds regions, sections, functions with their ends, pages and save fields", () => {
    expect(map.css.start).toBeLessThan(map.html.start);
    expect(map.html.end).toBeLessThan(map.js[0].start);
    const st = fn("startTimer");
    expect(st.banner).toBe("focus timer (per-task time tracking)");
    expect(st.end).toBeGreaterThan(st.line);
    expect(CM.show(map, src, "startTimer").split("\n")[0]).toContain("function startTimer(id){");
    expect(CM.show(map, src, "startTimer").trim().endsWith("}")).toBe(true);
    expect(map.functionAt(st.line + 3).name).toBe("startTimer");
    expect(map.pages.map((p) => p.page)).toEqual(expect.arrayContaining(["home", "quests", "mentor", "stats", "admin"]));
    expect(CM.search(map, "agentApply")).toContain("fn    agentApply");
    expect(CM.refs(map, src, "agentClean", specs)).toContain("tests mentioning it: agent.spec.js");
    const fields = L.saveFields(src, map);
    for (const k of ["hunterName", "quests", "todos", "aiConsent", "focus", "themeV2"]) expect(fields.has(k), k).toBe(true);
  });

  test("affected-tests picks the specs a change touches", () => {
    const at = (changes) => AT.affected(changes, map, src, specs);
    const parse = fn("agentParseOne");
    const r = at([{ file: "index.html", added: [{ line: parse.line + 4, text: "  var x = 1;" }], removed: [] }]);
    expect(r.specs).toContain("agent.spec.js");
    expect(r.specs.length).toBeLessThan(8);
    const css = at([{ file: "index.html", added: [{ line: map.css.start + 40, text: ".x{color:red}" }], removed: [] }]);
    expect(css.specs).toContain("themes.spec.js");
    expect(at([{ file: "ai-proxy/worker.mjs", added: [{ line: 1, text: "" }], removed: [] }]).specs).toContain("ai-proxy.spec.js");
    expect(at([{ file: "tests/helpers.js", added: [{ line: 1, text: "" }], removed: [] }]).all).toBe(true);
    expect(at([{ file: "README.md", added: [{ line: 1, text: "" }], removed: [] }]).specs).toEqual(["smoke.spec.js"]);
  });

  test("rules-check catches each of the owner's rules on added lines, and passes a clean change", () => {
    const js = fn("agentParse").line, ru = map.vars.find((v) => v.name === "I18N_UZ").line + 2;
    const changes = [
      { file: "index.html", removed: [{ line: 3088, text: 'var SKEY = "leveluphunter_v1";' }], added: [
        { line: js, text: "  var s = `hello ${name}`;" },
        { line: js + 1, text: '  var k = "sk-ant-api03-abcdefghijklmnop";' },
        { line: js + 2, text: '  hello:{en:"Hello", ru:"Привет", uz:"Qo\'shing"},' },
        { line: js + 3, text: "  state.brandNewField = 1;" },
        { line: js + 4, text: "  el.innerHTML = '<b>' + q.name + '</b>';" },
        { line: js + 5, text: "  var re = /привет\\b/;" },
        { line: js + 6, text: '  bye:{en:"Bye"},' },
        { line: js + 7, text: '  fetch("https://tracker.example.com/x");' },
        { line: js + 8, text: '  undo:{en:"Undo", ru:"Undo", uz:"Undo"}, /* TRANSLATE */' },
        { line: ru, text: '  "Add":"Qo\'shish",' }
      ] },
      { file: "ai-proxy/worker.mjs", removed: [], added: [{ line: 5, text: "console.log(q);" }] },
      { file: "package.json", removed: [], added: [{ line: 9, text: '    "left-pad": "^1.3.0"' }] },
      { file: "tests/fake.spec.js", removed: [], added: [{ line: 1, text: 'const GITHUB_TOKEN = "gh-test-token-for-the-fake-only";' }] }
    ];
    const F = RC.check(changes, { map, src });
    const rules = (lvl) => [...new Set(F.filter((f) => f.level === lvl).map((f) => f.rule))].sort();
    expect(rules("ERROR")).toEqual(["Uzbek letters", "Worker logs nothing", "ask before dependencies", "no secrets", "no template literals", "storage key", "three languages"].sort());
    expect(rules("WARN")).toEqual(["escape HTML", "new outside address", "regex and Cyrillic", "save format", "waiting for translation"].sort());
    expect(F.filter((f) => f.file === "tests/fake.spec.js")).toEqual([]); /* a test's fake token is fine */
    expect(F.filter((f) => f.rule === "Uzbek letters").length).toBe(2); /* the entry and the dictionary */
    /* a clean change: escaped, three languages, an existing field */
    const ok = RC.check([{ file: "index.html", removed: [], added: [
      { line: js, text: '  ok:{en:"Done", ru:"Готово", uz:"Tayyor"},' },
      { line: js + 1, text: "  el.innerHTML = '<b>' + esc(q.name) + '</b>';" },
      { line: js + 2, text: '  state.aiConsent = "yes";' }
    ] }], { map, src });
    expect(ok).toEqual([]);
  });

  test("i18n-check finds untranslated tr() text and incomplete three-language entries", () => {
    const lines = src.split("\n");
    const at = map.js[0].end - 1;
    lines.splice(at, 0,
      'toast(tr("A brand new sentence nobody translated"));',
      'var demo = {a:{en:"Hello {n}", ru:"Привет", uz:"Salom {n}"}, b:{en:"Hi", ru:"Привет", uz:"Qo\'l"}};');
    const s2 = lines.join("\n"), m2 = L.codeMap(s2);
    const p = I18N.run(s2, m2, new Set([at + 1, at + 2]));
    expect(p.some((x) => x.indexOf('tr("A brand new sentence nobody translated") has no Russian or Uzbek') !== -1)).toBe(true);
    expect(p.some((x) => x.indexOf("differ between languages") !== -1)).toBe(true);
    expect(p.some((x) => x.indexOf("apostrophe") !== -1)).toBe(true);
    /* a translated key is fine */
    expect(I18N.dictKeys(src, map, "I18N_RU").has("ASK")).toBe(true);
    expect(I18N.dictKeys(src, map, "I18N_UZ").has("ASK")).toBe(true);
  });

  test("office-text reads a deck's text, tables, charts and notes, and a Word file, without any package", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "office-"));
    const maker = path.join(dir, "make.py");
    fs.writeFileSync(maker, [
      "import zipfile, sys",
      "A='xmlns:a=\"http://schemas.openxmlformats.org/drawingml/2006/main\" xmlns:p=\"http://schemas.openxmlformats.org/presentationml/2006/main\" xmlns:r=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships\"'",
      "C='xmlns:c=\"http://schemas.openxmlformats.org/drawingml/2006/chart\" xmlns:a=\"http://schemas.openxmlformats.org/drawingml/2006/main\"'",
      "R='<Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\">'",
      "T='http://schemas.openxmlformats.org/officeDocument/2006/relationships/'",
      "z=zipfile.ZipFile(sys.argv[1],'w')",
      "z.writestr('ppt/presentation.xml','<p:presentation '+A+'><p:sldIdLst><p:sldId id=\"256\" r:id=\"rId2\"/></p:sldIdLst></p:presentation>')",
      "z.writestr('ppt/_rels/presentation.xml.rels',R+'<Relationship Id=\"rId2\" Type=\"'+T+'slide\" Target=\"slides/slide1.xml\"/></Relationships>')",
      "z.writestr('ppt/slides/slide1.xml','<p:sld '+A+'><p:cSld><p:spTree><p:sp><p:txBody><a:p><a:r><a:t>Break-even in month </a:t></a:r><a:r><a:t>9</a:t></a:r></a:p><a:p><a:r><a:t>Lowest cash $22,307</a:t></a:r></a:p></p:txBody></p:sp><p:graphicFrame><a:graphic><a:graphicData><a:tbl><a:tr><a:tc><a:txBody><a:p><a:r><a:t>Price</a:t></a:r></a:p></a:txBody></a:tc><a:tc><a:txBody><a:p><a:r><a:t>37,500 so\\'m</a:t></a:r></a:p></a:txBody></a:tc></a:tr></a:tbl></a:graphicData></a:graphic></p:graphicFrame><p:graphicFrame><a:graphic><a:graphicData><c:chart xmlns:c=\"http://schemas.openxmlformats.org/drawingml/2006/chart\" r:id=\"rId5\"/></a:graphicData></a:graphic></p:graphicFrame></p:spTree></p:cSld></p:sld>')",
      "z.writestr('ppt/slides/_rels/slide1.xml.rels',R+'<Relationship Id=\"rId5\" Type=\"'+T+'chart\" Target=\"../charts/chart1.xml\"/><Relationship Id=\"rId6\" Type=\"'+T+'notesSlide\" Target=\"../notesSlides/notesSlide1.xml\"/></Relationships>')",
      "z.writestr('ppt/charts/chart1.xml','<c:chartSpace '+C+'><c:chart><c:plotArea><c:lineChart><c:ser><c:tx><c:strRef><c:strCache><c:pt idx=\"0\"><c:v>Cash</c:v></c:pt></c:strCache></c:strRef></c:tx><c:cat><c:strRef><c:strCache><c:pt idx=\"0\"><c:v>1</c:v></c:pt><c:pt idx=\"1\"><c:v>2</c:v></c:pt></c:strCache></c:strRef></c:cat><c:val><c:numRef><c:numCache><c:pt idx=\"0\"><c:v>-100</c:v></c:pt><c:pt idx=\"1\"><c:v>250</c:v></c:pt></c:numCache></c:numRef></c:val></c:ser></c:lineChart></c:plotArea></c:chart></c:chartSpace>')",
      "z.writestr('ppt/notesSlides/notesSlide1.xml','<p:notes '+A+'><p:cSld><p:spTree><p:sp><p:txBody><a:p><a:r><a:t>Say the lowest point slowly</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld></p:notes>')",
      "z.close()",
      "W='xmlns:w=\"http://schemas.openxmlformats.org/wordprocessingml/2006/main\"'",
      "d=zipfile.ZipFile(sys.argv[2],'w')",
      "d.writestr('word/document.xml','<w:document '+W+'><w:body><w:p><w:r><w:t>Distribution of work</w:t></w:r></w:p><w:tbl><w:tr><w:tc><w:p><w:r><w:t>Finance</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>Sharifov</w:t></w:r></w:p></w:tc></w:tr></w:tbl></w:body></w:document>')",
      "d.close()"
    ].join("\n"));
    const pptx = path.join(dir, "d.pptx"), docx = path.join(dir, "d.docx");
    execFileSync("python3", ["-I", maker, pptx, docx]);
    const tool = path.join(ROOT, "scripts", "team", "office-text.py");
    const run = (args) => execFileSync("python3", ["-I", tool].concat(args), { encoding: "utf8" });
    const text = run([pptx]);
    expect(text).toContain("## Slide 1");
    expect(text).toContain("Break-even in month 9");
    expect(text).toContain("| Price | 37,500 so'm |");
    expect(text).toContain("chart series Cash: 1=-100, 2=250");
    expect(text).toContain("notes: Say the lowest point slowly");
    const nums = run([pptx, "--numbers"]);
    expect(nums).toMatch(/slide 1\s+\$22,307/);
    expect(nums).toMatch(/slide 1\s+37,500 so'm/);
    expect(run([pptx, "--find", "lowest"])).toContain("Lowest cash $22,307");
    expect(run([docx])).toContain("| Finance | Sharifov |");
    /* it only reads: the file is unchanged */
    expect(fs.statSync(pptx).size).toBeGreaterThan(0);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test("every training drill plants cleanly on today's code, and the scorer reads a report fairly", () => {
    const drills = DR.loadDrills();
    expect(drills.length).toBeGreaterThanOrEqual(3);
    for (const d of drills) {
      expect(d.brief.length, d.id).toBeGreaterThan(40);
      expect(fs.existsSync(path.join(ROOT, ".claude", "agents", d.role + ".md")), d.id + " role").toBe(true);
      expect(() => DR.plant(d, (f) => fs.readFileSync(path.join(ROOT, f), "utf8"))).not.toThrow();
      expect((d.expect || []).length + (d.verify || []).length, d.id).toBeGreaterThan(0);
    }
    const review = drills.find((d) => d.id === "review-1");
    const good = DR.score(review, "BLOCKING: diet questions are now sent to the AI. BLOCKING: title is unescaped (XSS). BLOCKING: state.agentStats is undefined for every save, add it to defaultState().");
    expect([good.found, good.total]).toEqual([3, 3]);
    expect(DR.score(review, "Looks fine to me.").found).toBe(0);
    /* the briefs never leak the answer */
    for (const d of drills) for (const x of d.expect || []) expect(d.brief.indexOf(x.label)).toBe(-1);
  });
});
