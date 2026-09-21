---
tier: spec
review: independent
created: 2026-09-21
status: in-progress
owner: Atingaii
branch: main
touches: [src/**, skills/**, tests/**, docs/**, README*, package*.json]
---
# Close live-validation gaps

## What
- Check the desired experience before choosing a mechanism, including small requests.
- Require current independent acceptance and merged-contract review for behavioral deltas, regardless of tier.
- Reject misspelled or misclassified delta operations instead of silently appending or replacing contracts.

## Why
A live Codex run archived an implementation with green self-authored tests despite an unmet explicit requirement and contradictory current specs. Initial discovery also preserved the user's original overload.

## How
Add a compact review report gate, exact delta operations and focused bilingual guidance. Validate lifecycle failures, then exercise ordinary requests with Luna in an isolated repository.

## Impact
Existing behavioral changes need a review report before normal landing after update. Non-behavioral quick edits remain lightweight; reviewer identity is a host assertion, not cryptographic proof of independent reasoning.

## Acceptance
- [x] A behavioral quick change with passing tests cannot land without complete, current independent review; findings, omitted acceptance and later edits block it — test: review integration tests.
- [x] Contract revisions replace named requirements and preserve unrelated ones; malformed operations fail before writes — test: delta and landing tests.
- [x] Discovery checks the user's desired outcome, asks only consequential unresolved choices and carries answers into the same change — check: bilingual guidance plus isolated Luna scenario.
- [x] Review includes discriminating counterexamples and projected current contracts; the full configured checks pass — test: npm run lint and npm test.

## Decisions
- cli: Behavioral deltas need a fresh independent acceptance/contract report before landing, including quick changes; local signatures bind records but cannot prove reasoning independence.
- cli: Delta requirement names are exact identities; incorrect ADDED/MODIFIED/REMOVED operations fail rather than changing their meaning implicitly.
