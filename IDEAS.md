# IDEAS — photographs of clouds

> *"When you see clouds, take photos of them instead of staring at them. Clouds go and thoughts go as well, but photos remain, so you can use them."*

Every idea goes in here raw, dated, unjudged. Nothing is deleted — ideas move between sections as they are triaged. An idea in a chat window is a lost cloud. An idea in this file is a photograph.

---

## The filter

Before anything is built, it must pass **one** of these:

1. **Does it make the user act today?**
2. **Does it make the app know the user better?**

And a room/section must also pass all three of these:

1. Can its purpose be said as a sentence a real person says out loud? If not, it is not a room.
2. Would the same person open two rooms in one sitting? Then they are one room.
3. Is it used daily? Then it does not get a room — it goes in the daily loop.

**The architecture rule:** the city is where you go to **start** something. The dock is where you go to **do** it. Anything touched daily is never more than one tap away.

---

## Built

| Idea | Shipped |
|---|---|
| Make the app a game world, not a menu | 2026-09-02 — walkable city, joystick, doors |
| A place that teaches discipline gradually, not just tracks it | 2026-09-02 — LEARN & GROW, 4 roads × 10 levels |
| Rooms inside buildings (the Academy) | 2026-09-02 — interiors as a first-class map system |
| The user's own words used against them when they want to quit | 2026-09-02 — THE OATH |
| Lessons must produce action, not just motivation | 2026-09-02 — Academy tasks become real System quests |
| Order sections by intent, not by feature | 2026-09-02 — 7 intent buildings, sections became rooms |
| Interval timer with rounds (distinct from the focus timer) | 2026-09-02 — TRAINING YARD |

---

## Next (agreed, not yet built)

- **Doctrine** — the owner writes their own laws and stories, tagged to moments (broken streak, first rank-up, a month of silence). The System quotes the owner instead of anonymous quotes. *This needs the owner to write the content; it cannot be faked.*
- **The Chronicle** — the app narrates the user's own history back to them: *"Chapter 3 — the winter you nearly stopped."* Uses data already stored (journal, honors, history, monthly reports).

---

## Raw — captured, not yet triaged

- Isometric 2.5D projection for the world (buildings with visible height). Real 3D via WebGL was rejected: it breaks offline, breaks cheap phones, and would be a rewrite rather than an upgrade.
- NPCs in the world — a quest-giver at the board, a mentor in the Academy. Makes a world feel alive more than better graphics do.
- Buildings visibly under construction until unlocked, instead of a padlock.
- Workout plans as a first-class thing (note: the Daily Package already is one — it may only need renaming and a better home).
- More interiors: Treasury, Sanctuary, Clan Hall, Hall of Honor as walkable rooms rather than direct page links.

---

## Rejected, and why

| Idea | Why not |
|---|---|
| Make it look like GTA / Roblox (real 3D) | 3D engines need asset pipelines and teams. Would break offline (the whole front door depends on a CDN library), break old phones, and require rewriting the world layer. Isometric 2.5D gets most of the visual gain at none of the cost. |
| "Combine all features of every app — habit breaker, running, sport, study, finance, everything" | Unbounded scope is how solo projects die. The app already has budgeting, quests, focus timing, clans, ranks and journaling. Features are not the differentiator; the content and the voice are. |
| A separate SELF-IMPROVEMENT building with a "be disciplined" room | Duplicates the Academy's Discipline road. One home per intent. |
| Separate rooms for workout plans / challenges / physical stats | Already exist as the Daily Package, quest tiers and STATS. The problem was findability, not absence — building duplicates would have made it worse. |
