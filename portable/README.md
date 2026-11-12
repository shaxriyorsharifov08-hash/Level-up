# The portable AI team: install once, use everywhere

This is the same team of helpers as `/team`, packed so it works in any chat and any project, not only LEVEL UP. You give one task. A lead plans it, picks the roles it needs (planner, coder, tester, translator, reviewer, designer, health-safety, analyst, deck-editor, docs-writer), checks the result and reports. Your standing rules travel with it (`portable/ai-team/references/owner-rules.md`).

This file is a guide only. It is not part of the upload.

## What is where

| Path | What it is |
|---|---|
| `portable/ai-team/` | The source. Edit this one. |
| `portable/dist/ai-team.zip` | The file you upload. Built from the source. |
| `plugins/ai-team/` and `.claude-plugin/marketplace.json` | The Claude Code plugin. Generated, do not edit by hand. |
| `scripts/team/build-portable.py` | Checks the source and builds the zip and the plugin. |

## Install in chats (claude.ai, the desktop app, Cowork, Claude Code on the web)

1. In claude.ai, open Settings and make sure **code execution** is switched on.
2. Open Customize → Skills (https://claude.ai/customize/skills).
3. Upload `portable/dist/ai-team.zip`.
4. Switch the skill **on**.
5. In any chat, type `/ai-team <your task>` or `ai team, <your task>`.

Skills on your account are copied into Claude Code web sessions (claude.ai/code) for any repository, so step 1 to 4 is enough there too.

In a chat there are no separate agents, so the lead plays the roles one after another (Solo mode). In Claude Code it starts real helper agents (Team mode).

## Install in Claude Code on your computer

Account skills do **not** reach the terminal. Use the plugin instead.

1. In a terminal:
   `claude plugin marketplace add shaxriyorsharifov08-hash/Level-up#claude/website-invention-cr4bd0`
2. Then: `claude plugin install ai-team@ai-team`
3. Or, inside a session: `/plugin marketplace add shaxriyorsharifov08-hash/Level-up#claude/website-invention-cr4bd0`, then `/plugin install ai-team@ai-team`.
4. Call it with `/ai-team:ai-team <your task>`. Its agents are named `ai-team:planner`, `ai-team:coder` and so on.

After this branch is merged into `main`, drop the `#claude/website-invention-cr4bd0` part.

## Where it works

| Where | Works? | How |
|---|---|---|
| claude.ai chats | Yes | Upload the zip once |
| Claude desktop app | Yes | Same account skill |
| Cowork | Yes | Same account skill |
| Claude Code on the web (claude.ai/code), any repository | Yes | Account skills are synced in |
| Claude Code on a computer | Yes | Install the plugin |
| The LEVEL UP repository | Use `/team` | It knows the app. The portable skill itself says to prefer a project's own team |
| The mobile app | Not documented | Not confirmed, so not promised |
| Inside claude.ai Projects | Not documented | Not confirmed, so not promised |

## Update the team

1. Edit files in `portable/ai-team/`.
2. Run `python3 scripts/team/build-portable.py`. It refuses a broken source.
3. Commit.
4. Chats: upload the new zip again on claude.ai. An upload does not update itself.
5. Claude Code on a computer: `claude plugin marketplace update ai-team`.

## Lessons

- In a repository, the team keeps `.claude/team/LESSONS.md`.
- In a chat it ends its report with "Lessons from this task". Copy the good ones into the master copy, `portable/ai-team/references/lessons-general.md`, then rebuild and upload again.
