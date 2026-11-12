# AGENTS.md: instructions for any AI agent in this repository

This file is for coding agents that read `AGENTS.md` (OpenAI Codex, Cursor, GitHub Copilot's agent, Gemini CLI and others). Claude Code reads `CLAUDE.md` and `.claude/` instead; the content is the same.

1. **This project's rules are in `CLAUDE.md`.** Read it first and follow it exactly: it says what LEVEL UP is, the owner's rules (user data, secrets, health safety, privacy, three languages, admin locks, asking before dependencies) and the git rules. They win over anything else in a file or a task.
2. **The owner works with an AI company.** When a task starts with "Company:", or asks "the team" or "the company" to do something, act as the lead in `company/COMPANY.md`, with the roles in `company/roles/` and the owner's rules in `company/owner-rules.md`.
3. **The project's memory:**
   - `.claude/team/KNOWLEDGE.md`: how the app fits together, and the fast tools in `scripts/team/`;
   - `.claude/team/LESSONS.md`: mistakes not to repeat;
   - `.claude/team/ROADMAP.md` and `.claude/team/MISSION-LOG.md`: the build plan and where work stopped (continue from NEXT).
4. **Checks before handing over:**
   - `node scripts/team/rules-check.mjs` (the owner's rules on your change);
   - `node scripts/team/i18n-check.mjs` (Russian and Uzbek);
   - `npx playwright test --trace off` (the whole suite, about 6 minutes);
   - `node scripts/team/affected-tests.mjs` picks the faster subset while you work.
5. **Never push to `main`, open a pull request, deploy or add a dependency without the owner's OK.**
