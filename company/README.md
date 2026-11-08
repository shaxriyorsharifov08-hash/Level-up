# Agent Company

Your own company of AI agents: a lead and ten roles (planner, coder, tester, translator, reviewer, designer, health-safety, analyst, deck editor, docs writer) that follow **your** rules. It is plain text, so it works in almost any AI, free ones included, and in the company runner without any chat at all. You set it up once; after that you just give tasks.

**Be realistic about one thing:** how well the company works depends on the AI behind it. Strong models follow the whole manual; small or free ones follow it in a simpler form. Chat apps that cannot run code cannot really test their work, and the company is told to say so instead of pretending.

## What is in this folder

| Path | What it is |
|---|---|
| `COMPANY.md` | The operating manual the lead follows. |
| `owner-rules.md` | Your standing rules (built from the master copy; do not edit here). |
| `roles/` | One file per role (built from the master copy). |
| `prompts/short.md` | 1,251 characters: fits ChatGPT's "Customize ChatGPT" box (limit 1,500). |
| `prompts/medium.md` | About 5,000 characters: for a Custom GPT, a Gemini Gem, a Claude Project, a Le Chat agent… (limit 8,000). |
| `prompts/chat-starter.md` | The medium version plus a start line: paste it as the first message in any chat app. |
| `templates/` | `PROJECT.md` (describe a project once), `MISSION-LOG.md` (memory between chats), `LESSONS.md`. |
| `tools/office-text.py` | Reads decks and Word files as text and numbers (Python, no packages). |
| `runner/` | Independent mode: the company runs a task by itself with any AI service. |

**The master copy** of the roles and your rules is `portable/ai-team/` in the LEVEL UP repository. Change them there, then run `python3 scripts/team/build-portable.py`. It rebuilds this folder and the Claude skill zip, and checks every size limit.

## Set it up in the AI you use

| Where | Setup (once) | Then |
|---|---|---|
| **ChatGPT** (free or paid) | Settings → Personalization → Customize ChatGPT: paste `prompts/short.md` into "How would you like ChatGPT to respond?" | Start messages with "Company:" |
| **ChatGPT Custom GPT or Project** (where your plan allows creating them) | Paste `prompts/medium.md` as instructions; upload `COMPANY.md`, `owner-rules.md` and `roles/*.md` as files | Just give the task |
| **Google Gemini** (Gems) | Create a Gem: paste `prompts/medium.md` as its instructions; add the role files if it accepts files | Open the Gem, give the task |
| **Google AI Studio** (free, long instructions) | Paste `prompts/medium.md` into "System instructions" | Give the task |
| **Claude** (claude.ai, desktop, Claude Code on the web) | Upload `portable/dist/ai-team.zip` at Customize → Skills; or a Project with `prompts/medium.md` | `/ai-team <task>` |
| **Any other chat** (DeepSeek, Qwen, Mistral Le Chat, Microsoft Copilot, Perplexity…) | Nothing to set up | Paste `prompts/chat-starter.md` as the first message, then give the task |
| **Coding agents in a repository** (OpenAI Codex, Cursor, GitHub Copilot agent, Gemini CLI, Claude Code) | Copy this `company/` folder into the repository and add an `AGENTS.md` at its root that points to it (see the LEVEL UP one) | Ask "Company: …" in the agent |
| **No chat at all** | See "Independent mode" below | One command, or one button on GitHub |

Plans, limits and menu names change often. If a step does not match what you see, the idea stays the same: put `medium.md` (or `short.md`) where the app keeps standing instructions, and attach the files if it allows.

## Never explain twice: the memory
1. **For each project, fill in `templates/PROJECT.md` once.** Attach or paste it with your first task in any chat.
2. **For work that spans days, keep a `MISSION-LOG.md`.** In a chat, the lead ends each reply with the updated log in one code block. Save it, paste it into the next chat (even a different AI), and the company continues from its NEXT line.
3. **Keep `LESSONS.md`.** Add the "Lessons from this task" lines you agree with, and the company stops repeating old mistakes.

## Independent mode: the company works by itself
`runner/run.mjs` takes one task and runs the company with any service that speaks the common OpenAI-style chat API:
1. the lead plans;
2. the roles work in turn;
3. the reviewer checks;
4. you get a written report.

It only writes the report. It never changes files, publishes or spends anything by itself. It stops and asks when the lead needs your decision.

```bash
node company/runner/run.mjs "Company: review the onboarding text of LEVEL UP" --project company/templates/PROJECT.md --out report.md
```

Choose the AI with three settings:

| Service | AI_BASE_URL | AI_API_KEY | AI_MODEL (example) |
|---|---|---|---|
| GitHub Models (free tier, with a GitHub account) | `https://models.github.ai/inference` (default) | a GitHub token, or nothing inside GitHub Actions | `openai/gpt-4.1-mini` (default) |
| Your own computer with Ollama (free, offline) | `http://localhost:11434/v1` | any text | a model you pulled, for example `qwen2.5:14b` |
| Any OpenAI-compatible provider (Groq, OpenRouter, Gemini's OpenAI endpoint, OpenAI…) | the provider's base URL | your key for it | a model it offers |

**On GitHub, with no keys at all:**
- **Actions → "Company task" → Run workflow:** type the task, and the report appears in the run summary.
- **Or label an issue `company-task`:** the company answers in a comment.
- It uses the repository's own GitHub token and GitHub's free model allowance.

Free tiers have daily limits:
- The runner stops at `AI_MAX_CALLS` (8 by default; at most 20), so one task never uses more than that.
- It cuts each request to `AI_MAX_INPUT_CHARS` (18,000 characters by default), which fits free tiers' input limits.
- If a service asks it to wait more than 30 seconds, it stops and tells you instead of wasting a call.
- On GitHub, the repository variable `COMPANY_PROJECT_FILE` names a project file for tasks that come from issues.

## Keep keys safe
Never put an API key in a file in the repository or in a web page. Use environment variables on your computer, or repository secrets on GitHub. The runner never prints the key.
