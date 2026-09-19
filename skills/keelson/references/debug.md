# Debugging

A fix without a known cause is a guess that happened to pass. This reference exists so the cause is found, named, and fed back into the project.

## Reproduce, then locate, then fix
<!-- keelson: id=debug.reproduce-first | without: agent edits code on a hypothesis; symptom moves, cause stays, the bug returns under another name | sunset: when retro shows guessed-fix = 0 across the last 20 root-cause entries -->

1. Read the full error and stack. It usually names the line.
2. Reproduce deterministically: a failing test, a script, or exact steps. If you cannot reproduce it, you cannot know it is fixed.
3. Locate: where does observed behaviour first diverge from expected? Add logging or assertions at the boundaries rather than reading everything.
4. Form one hypothesis, test it with the smallest change, and only then write the fix.
5. Run the reproduction again; it must pass. Run `keelson check`.

If three hypotheses in a row fail, stop and re-read the problem from the top; you are probably in the wrong layer.

## Name the root cause
<!-- keelson: id=debug.category | without: bugs are fixed one at a time and the pattern behind them is never seen | sunset: never -->

Append to the ledger of the active change (or create a quick change for the fix):

```markdown
### Root cause: implicit-assumption
Callback handler assumed exactly one delivery; broker guarantees at-least-once.
Fix: idempotency key on `notify`. Prevention: rule in `rules/services.md`.
```

Categories, one per entry:

| category | meaning |
|---|---|
| `missing-rule` | no convention said how to do this |
| `cross-layer` | the contract between two layers was unclear |
| `propagation` | one place changed, dependants were missed |
| `test-gap` | units passed, integration failed |
| `implicit-assumption` | code relied on something undocumented |
| `guessed-fix` | an earlier fix addressed the symptom, not the cause |

If the category is `missing-rule` or `cross-layer`, propose the rule or the spec requirement that would have prevented it, and add it while the context is fresh.

<!-- guided -->
## When the fix is not obvious
Ask what changed recently (`git log -p` on the failing area), what the data looked like, and whether the failure is in your code or in an assumption about a dependency. Each of these is a distinct layer; pick the layer before the line.
<!-- /guided -->
