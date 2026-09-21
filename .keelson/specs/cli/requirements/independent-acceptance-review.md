# Independent acceptance review

## Requirement: Independent acceptance review

Spec changes, all changes with deltas and quick changes marked review: independent SHALL require a current structured independent review report. Other quick changes retain the lightweight path. The agent SHALL dispatch a fresh context, retaining original request and settled decisions; the CLI validates the submitted report but does not authenticate reviewer identity or reasoning independence. Missing host review capability SHALL be reported without inventing evidence.

### Scenario: Green tests miss the owner's boundary
- WHEN self-authored tests pass
- THEN review still covers every exact acceptance, observed discriminating counterexamples, every complete projected capability and unresolved findings before final signed checks

### Scenario: Incomplete, failed or stale review
- WHEN required coverage is missing or duplicated, findings remain, or code/contract inputs change
- THEN review cannot satisfy landing

### Scenario: Multiple deltas for one capability
- WHEN a change contains multiple ordered deltas and durable decisions for one capability
- THEN the review packet contains one cumulative final contract matching landing's projection
