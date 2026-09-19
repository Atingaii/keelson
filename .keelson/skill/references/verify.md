# Verifying

Completion is a claim with evidence attached, and evidence has two properties that fail independently: the record can be invalid (never ran, ran on older code, ran partially) and the content can be invalid (ran, passed, and still did not check what the owner asked for). This reference covers both. It does not get thinner as models improve, because it is about the world, not about judgment.

## Record validity: `keelson check --record`
<!-- keelson: id=verify.fresh | without: "should pass" and "looks right" replace running the command; evidence from before the last edit is presented as current | sunset: never -->

Before saying done, fixed, passing, or complete: run `keelson check --record "<claim>"`. It runs the project's configured commands, saves their full output under `.keelson/.local/evidence/`, and appends a `Verify:` entry to the ledger with each command, its exit code, and the fingerprint of the working tree it ran against:

```markdown
### Verify: pagination end-to-end
`npm run lint` exit 0; `npm run test` exit 0 · tree 5bcb829dae
```

`keelson status` compares that fingerprint with the current tree and reports `stale` after any code edit; `keelson land` refuses stale, failed, or missing evidence. A prior run, a partial run, or a subagent's report is not evidence; the diff and a fresh `Verify:` entry are. A single extra command can be checked with `keelson check "<cmd>" --record`.

If a check cannot run (environment missing, service down), say so in the ledger as a `Note:` and in `NOW.md → Blocked / uncertain`. Partial verification is reported as partial; it is never rounded up.

Checks in `config.yaml → check` may be plain strings or `{name, command, kind}` entries; `kind` is one of `test`, `lint`, `typecheck`, `build`, `fitness`, or `check`. A `fitness` check is an architecture or quality constraint turned into a command (dependency direction, interface compatibility, a latency budget). Mechanical evidence is this whole set passing on the current tree. It is necessary and never sufficient.

## Content validity: does the evidence cover the request?
<!-- keelson: id=verify.content | without: tests pass and the requirement is still unmet; the implementer's summary is reviewed instead of the owner's request | sunset: never -->

Go back to `change.md → Acceptance` and to the original request, not to your own summary of it. For each acceptance item, name the test, command, manual check, or review that covers it, and tick it only when that check has actually run. For each requirement or scenario in the delta spec, name the covering check. Anything uncovered is either checked now or written down as a gap under `NOW.md → Blocked / uncertain`. Then read the diff against the matched rules and the affected specs; a rule violation is a defect even when every test is green.

For a bug fix, keep the negative check: with the fix reverted, the regression test must fail. A test that passes both ways proves nothing.

## Tests may change; they may not be quietly weakened
<!-- keelson: id=verify.no-silent-weakening | without: "all green" is achieved by deleting an assertion or skipping a case, and the weakening is invisible in the completion report | sunset: never -->

Editing a test is normal when the requirement changed. Deleting an assertion, skipping a case, widening a tolerance, or replacing a real check with a mock is a change to the acceptance criteria: it needs the owner's decision (or an explicit authorization), and it goes into the ledger as a `Ruling:` that names what was weakened and why. A completion report that hides it is wrong.

## Fresh-reader review (spec tier)
<!-- keelson: id=verify.fresh-reader | without: the author reviews their own work; the same blind spot passes twice | sunset: when 50 consecutive fresh-reader reviews found nothing the per-task reviews missed -->

Dispatch a reviewer that has not seen the conversation (tier ≥ `deep` for spec changes), with the original request, `change.md`, the delta specs, and the diff. Ask for: acceptance items without real coverage, requirement gaps, rule violations, risky assumptions, anything a maintainer would object to. Address or ledger each finding. Agreement from a second agent is a signal, not a proof; the acceptance list is what is checked.

## Completion report

Tell the user what was done, what the evidence is, and what is left. Shape:

```
Done: offset pagination on /orders, pager in the table.
Evidence: `npm test -- orders` exit 0 (14 passed); `npm run lint` exit 0 · tree 5bcb829dae. Acceptance 3/3.
Open: none. Change in review; `keelson land add-pagination` when integrated.
```

