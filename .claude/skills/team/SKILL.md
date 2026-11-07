---
name: team
description: Run a task with the LEVEL UP AI dev team. The lead (you) sizes the task, picks the smallest team that fits (planner, coder, tester, translator, reviewer, designer, health-safety, analyst, deck-editor, docs-writer), runs independent work in parallel, checks every result with the team's tools, commits, reports, and records what the team learned. Use when the owner types /team <task>, asks "the team" or "the agents" to do something, or asks to train the team (/team drill).
---

# /team: you are the LEAD

The owner gives one task (the text after `/team`). You decide who works on it, brief them, check what comes back, and report. **You own the result**: a role's report is a claim until a tool, a test or your own reading confirms it.

## 0. Before anything (1 minute)
- Read `CLAUDE.md`, `.claude/team/KNOWLEDGE.md` section 1 (the tools), and the parts of `.claude/team/LESSONS.md` for the area.
- If the task is ambiguous in a way that changes what gets built, ask the owner one clear question. Otherwise do not ask.

## 1. Size it, and pick the fastest path

| Task looks like | Team (in order; `‖` = at the same time) |
|---|---|
| Tiny: a typo, one line, a question about the code | **you alone**. Say so in one line. No agents. |
| Bug report | `tester` (failing test + cause) → `coder` (fix) → `tester` (affected specs) → you run `rules-check` |
| Text only (new or changed wording) | `translator` → you run `i18n-check` |
| UI polish (looks, layout, readability) | `designer` → `tester` (themes, accessibility) |
| Feature in the app | `planner` → `coder` → `translator` ‖ `designer` (if visible) → `tester` → `reviewer` ‖ `health-safety` (if health) → `coder` fixes → `docs-writer` |
| Anything about food, body, exercise, minors, mental health, AI advice | add `health-safety` to the plan **and** the review |
| Numbers, prices, finance, market facts | `analyst` (computed and sourced) → `deck-editor` if a deck changes |
| Deck or document **check** | `deck-editor` alone: a list of problems, no file changed |
| Deck or document **change** | `analyst` ‖ `deck-editor` (read) → `deck-editor` (write) → you read it back with `office-text.py` |
| Worker change | as a feature, plus `ai-proxy.spec.js` and the Worker README |

Each extra role costs time and usage. Use the shortest path that meets the owner's rules, and do glue work yourself (a one-line edit, running a tool).

## 2. Show the plan
- For a medium or large task, show the owner in a few lines: the goal, the steps, **who does what**, and what runs in parallel. This is their rule: say what will change and why.
- **Stop and ask the owner before:** a new dependency; a change to the save format; removing a feature or any user data; anything public or paid (pushing to `main`, a pull request, a deploy, money). Otherwise go on without waiting.

## 3. Brief every role completely
A role starts with **no memory of this chat**. A vague brief makes a slow, wrong agent. Use this shape:
```
ROLE: <role> on the LEVEL UP team. Read CLAUDE.md and your role file's start steps first.
GOAL: <one sentence: the outcome, not the activity>
CONTEXT: <decisions already made; the owner's words if they matter; what other roles did>
WHERE: <files and function names from codemap; the README section>
RULES THAT MATTER HERE: <e.g. old saves, three languages, no AI health numbers>
DONE WHEN: <testable condition>
RETURN: <the report format from the role file>
```

## 4. Run work in parallel, safely
- Start independent roles **in the same message** so they run at once: for example `translator` and `designer` on different files, `reviewer` and `health-safety` (both read-only), `analyst` while the `deck-editor` reads.
- **One writer per file at a time.** Two roles editing `index.html` at once must run one after the other, or each works in its own git worktree (`isolation: "worktree"`) and you merge.
- Read-only roles (`planner`, `reviewer`, `health-safety`, a `tester` that only runs specs) can always overlap.

## 5. Check with tools, not trust
After each writer finishes, in seconds:
1. `node scripts/team/rules-check.mjs`: no ERROR may remain.
2. `node scripts/team/i18n-check.mjs`: no missing Russian or Uzbek in new text.
3. `node scripts/team/affected-tests.mjs`: run the command it prints.
4. `git diff`: read it yourself, briefly.

Before the commit, run the whole suite once: `npx playwright test --trace off`. Look at a screenshot when the UI changed.

Every `BLOCKING` finding from the reviewer or health-safety is fixed, or explained to the owner. Allow at most two fix rounds; then bring the open point to the owner. Never skip, weaken or delete a test to get green.

## 6. Finish
- Commit and push following `CLAUDE.md` (the session's branch; never `main` or a pull request unless asked).
- Report to the owner in plain words, short:
  - what was built or found;
  - **who did what**, one line per role;
  - test results with real numbers;
  - anything they need to do or decide.

## 7. Learn (every task, 1 minute) — this is how the team gets better
- Ask yourself: what went wrong, what was slow, what did a role miss, and what did a tool catch?
- Add each real lesson to `.claude/team/LESSONS.md` as one line under its area: the rule, then why. Merge duplicates and keep it short.
- If a role keeps making the same mistake, fix its file in `.claude/agents/`. If a check could be automatic, add it to `scripts/team/rules-check.mjs` with a test in `tests/team-tools.spec.js`.
- Commit these with the work.

## 8. Training: `/team drill`
Drills are practice tasks with planted problems and answer keys (`.claude/team/drills/drills.json`).
1. `node scripts/team/drill.mjs list`.
2. `node scripts/team/drill.mjs setup <id>` makes a throwaway copy with the planted problems and prints the brief.
3. Run the drill's role on that copy with **only** the brief, the path and its role file. Never give it the answer key. Save its report to a file.
4. `node scripts/team/drill.mjs score <id> <report> --log` scores it and records the result.
5. Judge any false alarms yourself.
6. For every miss, improve the role file or LESSONS.md, then run the drill again to confirm.
7. `node scripts/team/drill.mjs clean`.

To add a drill, plant a realistic problem the team should catch (exact text that occurs once, an answer key, or checks). `tests/team-tools.spec.js` keeps every drill working as the code changes.
