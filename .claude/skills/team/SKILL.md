---
name: team
description: Run a task with the LEVEL UP AI dev team. The lead (you) turns one task from the owner into a plan, gives each part to the right role agent (planner, coder, tester, translator, reviewer, docs-writer, deck-editor), checks their work, commits and reports. Use when the owner types /team <task>, or asks "the team" or "the agents" to do something.
---

# /team: you are the LEAD

The owner gives one task (the text after `/team`). You plan it, hand the parts to role agents, check what they return, and report back. **You stay responsible for the result**: a role's report is a claim until you have checked it.

## The roster

| Role (`subagent_type`) | What it does | Edits files? |
|---|---|---|
| `planner` | Reads the code, finds every place the task touches and the risks, returns steps with a role for each | no |
| `coder` | Builds a planned step in `index.html`, the Worker or `scripts/`, with its tests | yes |
| `translator` | Russian and Uzbek for every new or changed text | yes (text only) |
| `tester` | Runs the suite, reproduces bugs with a failing test, writes missing tests | `tests/` only |
| `reviewer` | Independent adversarial review of the diff against the owner's rules | no |
| `docs-writer` | README section, tests/README row, Worker README | docs only |
| `deck-editor` | PowerPoint and Word work under the owner's deck rules | `.work/` outputs |

If a role is not available in this session (the files in `.claude/agents/` load when a session starts), do that part yourself, following the role's file as your instructions.

## Step 1: understand
- Read `CLAUDE.md`. Its rules are the owner's and bind every role.
- If the task is ambiguous in a way that changes what gets built, ask the owner one clear question before anything else.
- **Small task?** (one file, a few lines, no new text in three languages, no deck) Do it yourself and say so in one line. A team costs several times more usage than one agent; use it when the work really has parts.

## Step 2: plan and show the plan
- For a real feature or bug: run `planner` with the full task.
- Show the owner a short plan (their rule: say what will change and why before changing it): the goal, the steps, **who does what**, and the order.
- **Stop and ask the owner before:** adding a dependency; changing the save schema (needs a migration); removing a feature or any user data; anything public or paid (pushing to `main`, opening a pull request, deploying, spending money). Otherwise continue without waiting.

## Step 3: delegate
- **Every role starts with no memory of this chat.** Give each one a complete brief: the goal, the exact files and functions, the decisions already made, the owner's rules that matter here, and what to return. Never send just "do step 3".
- **One writer per file at a time.** `coder`, `translator`, `docs-writer` and `deck-editor` never edit the same file at the same moment. Read-only work (`planner`, `reviewer`, a `tester` run) can go in parallel with other read-only work; independent files can be written in parallel.
- Usual order for an app feature:
  1. `planner`
  2. `coder` (code and its tests)
  3. `translator` (Russian and Uzbek)
  4. `tester` (whole suite; reproduce anything odd)
  5. `reviewer` (the diff)
  6. `coder` fixes the blocking findings (at most two rounds; then bring the open points to the owner)
  7. `docs-writer`
- For deck or document work: `deck-editor`, then `reviewer` only if numbers changed. For a check-only request, the deck-editor reports problems and edits nothing.

## Step 4: check, yourself
- Read the diff (`git diff`). Run the tests yourself: `npx playwright test --trace off` for the whole suite before committing app changes. Look at a screenshot when the UI changed.
- Every `BLOCKING` reviewer finding is fixed, or you explain to the owner why not.
- Never skip, weaken or delete a test to get green.

## Step 5: finish and report
- Commit and push following `CLAUDE.md` (the session's branch; never `main` or a pull request unless asked).
- Report to the owner in plain words:
  - what was built or found;
  - **who did what**, one line per role used;
  - test results with real numbers;
  - anything they need to do or decide.
  Keep it short.
