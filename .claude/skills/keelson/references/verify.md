# Verifying

Completion is a claim with evidence attached. This reference is the evidence layer; it does not get thinner as models improve, because it is about the world, not about judgment.

## Fresh evidence
<!-- keelson: id=verify.fresh | without: "should pass" and "looks right" replace running the command; regressions ship | sunset: never -->

Before saying done, fixed, passing, or complete: identify the command that proves it, run it now in full, read the exit code and the failure count. Then, and only then, make the claim, with the evidence beside it. A prior run, a partial run, or a subagent's report is not evidence; the diff and the fresh command output are.

`keelson check` runs the project's configured commands (`config.yaml → check:`) and prints one exit code per command. Append the result to the ledger:

```markdown
### Verify: pagination end-to-end
`keelson check` exit 0 — test 14 passed, lint 0 errors, typecheck clean.
```

Every ledger `Verify:` entry states a command in backticks and an `exit N`.

## Review against specs and rules
<!-- keelson: id=verify.spec-review | without: code passes tests but violates a rule or a requirement nobody tested | sunset: never -->

Read the diff against the matched `rules/` files and the affected `specs/` (main plus delta). For each requirement touched, name the test or manual check that covers it. Anything uncovered is either tested now or listed as an explicit gap in the ledger.

## Fresh-reader review (spec tier)
<!-- keelson: id=verify.fresh-reader | without: the author reviews their own work; the same blind spot passes twice | sunset: when 50 consecutive fresh-reader reviews found nothing the per-task reviews missed -->

Dispatch a reviewer that has not seen the conversation (tier ≥ `deep` for spec changes), with the change.md, the delta specs, and the diff. Ask for: requirement gaps, rule violations, risky assumptions, anything a maintainer would object to. Address or ledger each finding.

## Completion report

Tell the user what was done, what the evidence is, and what is left. Shape:

```
Done: offset pagination on /orders, pager in the table.
Evidence: `npm test -- orders` exit 0 (14 passed); `npm run lint` exit 0.
Open: none. Change ready to land.
```

