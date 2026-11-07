# Lessons the team has learned

Short, concrete rules learned from real work on this project. Every role reads the sections for its area before starting. **After every task, the lead adds what went wrong or what was slow, as one line: the rule, then why (what happened).** Merge duplicates and keep the file under about 80 lines; a lesson that a tool or test now enforces can be removed.

## Code (index.html)
- `\b` does not work next to Cyrillic in JavaScript regexes: it only knows A–Z, 0–9 and _. Use `(?=\s|$)` or a lookbehind instead. (The Mentor's Russian keywords needed this; rules-check now warns.)
- Uzbek puts the verb last ("kitob oʻqishni qanday odat **qilaman**") and asks mid-sentence. A command parser must accept only the imperative ("qoʻsh", "qoʻshing", "och") and treat question words (qanday, nega, qachon) as questions. (A question became an "add quest" command until a test caught it.)
- `mNorm()` lowers case and turns every apostrophe kind into `'`. Match on the normalised text, but cut names from the original so capitals survive (both have the same length).
- The ASK box is a single-line `<input>`: newlines never reach the code. Several commands in one line are separated with `;`.
- Escape every user or AI text with `esc()` before it goes into HTML, including text that "only comes from our own Worker".
- `startTimer()` may ask "a timer is already running, replace it?" with `confirm()`. Code that changes the new session afterwards must check that a new timer really started (`state.activeTimer !== before`).
- Never change the hero's default settings to serve one request (e.g. `fo().goalMin`). Change the running session instead.
- A preset for `openQuestModal()` only fills the window; SAVE still runs `questCreationBlock()`. That is how suggestions respect the slot rules.

## AI and the Worker
- Models break JSON: they wrap it in a code fence, add text around it, or stop halfway. Parse the first `{` to the last `}`, accept a fence, and treat a cut-off object as "busy". Never show raw JSON to the hero. (The Worker's tests now cover all three.)
- Check AI output twice, on the Worker and in the app, against an allowed list with clamped fields. The app never trusts the network.
- Health words are blocked before the AI (on the device and in the Worker) and after it (in proposed actions).

## Tests
- Copy expected strings from the code: the message said "{placeholders} differ", and a test looked for "placeholders differ". Read the failure before blaming the app.
- `toEqual` on an object compares every key. If the test reads extra values into the object, the expected object needs them too (a to-do test failed only because `tomorrow` was missing from the expectation).
- `page.clock.setSystemTime` fixes "today"; a test that builds dates must use the app's own `todayStr()` / `addDays()` inside `page.evaluate`, not Node's clock.
- When a full-suite run fails in an unrelated spec, rerun that one spec alone before calling it flaky; if it fails alone, it is real.

## Translation
- The Uzbek menu name for MORE is "KOʻPROQ", not "YANA". Search the dictionaries for the app's own term before translating.
- Uzbek uses `ʻ` (U+02BB). An apostrophe or a backtick is wrong, even in a dictionary value.

## Decks and documents (python-pptx)
- When the owner asks only for a check: list the problems with slide numbers. Do not remake the deck.
- Retargeting a relationship: `rel._target` is not enough, because `target_part` is cached; also `rel.__dict__.pop("target_part", None)`. (Zoom links pointed to removed slides.)
- Imported slides with SVG pictures need a `Default` content type for `svg` in `[Content_Types].xml`, or PowerPoint calls the file damaged.
- After reordering slides, re-sort the section lists (`p14:sectionLst`) to match, or sections show the wrong slides.
- "Shrink text on overflow" (normAutofit) made text tiny. Set no autofit and make the box taller or the insets smaller.
- Charts: set `noFill` on the chart and plot area so the slide background shows through. Put labels above or below points so they never overlap the lines. Use `ch.value_axis` only after the chart exists.
- To copy a paragraph's style, use the last paragraph that has runs; an empty last paragraph has no style to copy.
- Every number must agree across sales, finance, payback and the speaker notes. Find the source of truth (the model or the owner's latest figure) before changing any of them.

## Working with the owner
- Before a change, say what will change and why; after it, say what changed. Ask one clear question only when the answer changes what gets built.
- The owner compares versions themselves. When asked for two files, make File A (checked, nothing existing touched) and File B (improved), and say what differs.
