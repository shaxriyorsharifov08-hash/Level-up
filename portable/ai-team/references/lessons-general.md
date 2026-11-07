# Lessons that apply in any project

Real mistakes from the owner's projects, kept so no role makes them twice. One line each: the rule, then why.

## Code
- `\b` does not work next to Cyrillic letters in JavaScript regexes (it only knows A–Z, 0–9 and _): use `(?=\s|$)` or a lookbehind. Russian keywords silently failed to match.
- Uzbek puts the verb last and asks questions mid-sentence ("… qanday … qilaman"): a command parser must accept only the command form and treat question words as questions. A question became a command until a test caught it.
- Escape every user or AI text before it goes into HTML, including text from your own server. A reviewer drill showed one missing escape lets an AI-proposed name run script.
- A code path that runs when the user only *looks* (opens a window, reads a card) must not change or save data.
- A new field in saved data needs its default, or a migration; otherwise old saves crash on first use (`undefined.x`).
- Do not change a user's default settings to serve one request; change the running session instead.

## AI features
- Models break JSON: they add a code fence, add text around it, or stop halfway. Parse from the first `{` to the last `}`, accept a fence, and treat a cut-off answer as "busy". Never show raw JSON to a user.
- Check AI output twice, on the server and in the app, against an allowed list with clamped fields. The app never trusts the network.
- Health and crisis words are blocked before the AI (on the device and on the server) and after it (in anything the AI proposes).
- No keys in a public page: the page calls a small server that holds the key, checks sign-in, and limits requests per user and in total, so a free tier can never turn into a bill.

## Tests
- Read the failure before blaming the code: copy expected text from the code (a test looked for "placeholders differ" when the message said "{placeholders} differ").
- `toEqual` on an object compares every key; expected objects need every key the test reads.
- A failure in an unrelated test: run it alone twice before calling it flaky; if it fails alone, it is real.
- Chain a check and a commit with `&&`, never `;`, or the commit goes through when the check fails.
- Run a project's own checks on the team's own work too: a new checker's first run found two false alarms of its own.

## Decks and documents (python-pptx)
- Retargeting a relationship: also `rel.__dict__.pop("target_part", None)`, or the cached target wins. Links pointed to deleted slides.
- Imported slides with SVG pictures need a `Default` content type for `svg`, or PowerPoint calls the file damaged.
- After reordering slides, re-sort the section lists (`p14:sectionLst`).
- "Shrink text on overflow" makes text tiny: turn autofit off and make the box taller or the insets smaller.
- Charts: no fill on the chart and plot area so the slide background shows; place labels above or below points so nothing overlaps.
- To copy a paragraph's style, use the last paragraph that has runs.
- Every number must agree across the deck and its speaker notes; find the source of truth before changing one.

## Working with the owner
- A plan in a few lines before medium or large work; plain words after it.
- When asked for two files, File A changes only what is wrong; File B is the improved version; say what differs.
- Break-even (monthly profit ≥ 0) is not payback (cumulative profit ≥ 0); revenue is not cash. Label every figure.
