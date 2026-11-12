# Lessons

One line each: the rule, then why (what happened). Read the parts for your area before you start. Merge duplicates; keep it short.

## Code
- Escape every user or AI text before it goes into HTML, including text from your own server.
- A new field in saved data needs its default, or a migration; otherwise old saves crash on first use.
- Models break JSON (a code fence, extra text, a cut-off answer): parse from the first { to the last }, and treat a broken answer as "try again", never show it raw.

## Tests
- Read the failure before blaming the code; copy expected text from the code itself.
- A failure in an unrelated test: run it alone twice before calling it flaky.

## Decks and documents
- When the owner asks only for a check, list the problems; do not remake the file.
- Every number must agree across the deck and its notes; find the source of truth first.

## Working with the owner
- A plan in a few lines before medium or large work; plain words after it.
