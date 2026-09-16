# IDEAS — photographs of clouds

> *"When you see clouds, take photos of them instead of staring at them. Clouds go and thoughts go as well, but photos remain, so you can use them."*

Every idea goes in here raw, dated, unjudged. Nothing is deleted — ideas move between sections as they are triaged. An idea in a chat window is a lost cloud. An idea in this file is a photograph.

---

## The filter

Before anything is built, it must pass **one** of these:

1. **Does it make the user act today?**
2. **Does it make the app know the user better?**

And a section must also pass all three of these:

1. Can its purpose be said as a sentence a real person says out loud? If not, it is not a section.
2. Would the same person open two sections in one sitting? Then they are one section.
3. Is it used daily? Then it belongs at the front of the dock, not behind another tap.

**The architecture rule (revised 2026-09-16):** every action is **one tap from the dock**. Nothing may be placed between the hunter and the thing they came to do — that is the mistake the walkable world made, and it is why the world is gone. Depth goes into the **writing**, never into the navigation.

---

## Built

| Idea | Shipped |
|---|---|
| A place that teaches discipline gradually, not just tracks it | 2026-09-02 — LEARN & GROW, 4 roads × 10 levels |
| The user's own words used against them when they want to quit | 2026-09-02 — THE OATH |
| Lessons must produce action, not just motivation | 2026-09-02 — Academy tasks become real System quests |
| Order sections by intent, not by feature | 2026-09-02 — the dock order became the order of a real day (the buildings it shipped with are gone; the ordering survived) |
| Interval timer with rounds (distinct from the focus timer) | 2026-09-02 — TRAINING YARD |
| Finalize asks about interesting things and mistakes, not lessons | 2026-09-02 |
| Mandatory written weekly / monthly / annual reports with deadlines | 2026-09-02 — STATS → REPORTS |
| Per-quest full-screen record with its own interval timer | 2026-09-02 — tap any quest card |
| Rank must be earned, not bought with banked stat points | 2026-09-02 — RANK EVALUATION + stat point deflation |
| Audit fixes: HTML injection via icon fields, silent save loss, no crash recovery | 2026-09-02 |
| Automated test suite + CI on every push | 2026-09-02 — 51 tests, `tests/`, GitHub Actions |
| Prune the save so mechanical rows cannot grow without limit | 2026-09-02 — `pruneState()`, archive folding |
| Accessible names everywhere + live regions | 2026-09-02 — `a11yFix()` with a MutationObserver |
| Quest calendar: a month at a glance, then one day in full | 2026-09-16 — QUESTS → 📅 CALENDAR |
| Changing currency converts the money, not just the symbol | 2026-09-16 — editable offline rate table |
| Remove the walkable world entirely | 2026-09-16 — ~57,000 characters of engine deleted; the app opens on HOME |
| Split the quest log into four squares, Academy-style | 2026-09-16 — QUESTS · CALENDAR · GOALS · CHALLENGES, as a selector above the list, not a landing screen |
| Remove QUEST LOCKDOWN | 2026-09-16 — the one punishment that made returning impossible instead of expensive |
| A plain to-do list, outside the game | 2026-09-16 — QUESTS → ✅ TO-DO; dated items, flat XP, no tier or trophy |
| Somewhere for what you did NOT do | 2026-09-16 — HONOR → 💀 HALL OF SHAME, escaped only by doing it |
| Money fields readable while typing | 2026-09-16 — 12000 shows as 12,000 |

---

## Next (agreed, not yet built)

- **Doctrine** — the owner writes their own laws and stories, tagged to moments (broken streak, first rank-up, a month of silence). The System quotes the owner instead of anonymous quotes. *This needs the owner to write the content; it cannot be faked.*
- **The Chronicle** — the app narrates the user's own history back to them: *"Chapter 3 — the winter you nearly stopped."* Uses data already stored (journal, honors, history, monthly reports).

---

## Raw — captured, not yet triaged

- Workout plans as a first-class thing (note: the Daily Package already is one — it may only need renaming and a better home).
- **Focus is not trapped inside modals** — a keyboard or screen-reader user can tab out of an open dialog into the page behind it.
- The STATS page itself is still "awful" — the per-quest window solved *finding a single task's record*, but the whole-hunter view has not been redesigned yet.

---

## Rejected, and why

| Idea | Why not |
|---|---|
| **The walkable world, the isometric Academy and the 3D Academy — all of it** | **Built 2026-09-02, deleted 2026-09-16.** It put a walk between the hunter and every action; the dock already did the same job in one tap. ~57,000 characters of renderer, collision, joystick, isometric projection and Three.js scene served zero habits, and every line of it could break the part of the app that matters. The 3D room depended on a CDN fetch, so its best case was a feature you could not rely on seeing. *Simple, but compelling* — and compelling comes from the writing, not from graphics this project has no artist for. **Do not rebuild this.** |
| NPCs, buildings under construction, more walkable interiors, converting other maps to isometric | All of these were extensions of the world. The world is gone, so they are too. |
| "Combine all features of every app — habit breaker, running, sport, study, finance, everything" | Unbounded scope is how solo projects die. The app already has budgeting, quests, focus timing, clans, ranks and journaling. Features are not the differentiator; the content and the voice are. |
| A separate SELF-IMPROVEMENT building with a "be disciplined" room | Duplicates the Academy's Discipline road. One home per intent. |
| Separate rooms for workout plans / challenges / physical stats | Already exist as the Daily Package, quest tiers and STATS. The problem was findability, not absence — building duplicates would have made it worse. |
