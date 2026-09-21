---
base: e73c2bdcc8
---
## MODIFIED Requirements

### Requirement: Landing requires evidence that matches the code
Normal landing SHALL require completed acceptance, resolved decisions/questions/dependencies, reconciled contracts, required rollout, current required independent review and fresh complete signed evidence. Task checkboxes are advisory. An authorized --force requires a reason and archives a signed override without converting failed evidence to success. For a change requiring independent review, force SHALL NOT bypass review or verification gates.

#### Scenario: Prose forgery
- WHEN a user writes a passing Verify paragraph without valid structured evidence
- THEN normal landing fails

#### Scenario: Changed acceptance or review
- WHEN request, acceptance, decision records, declared context or review changes after a check
- THEN verification is stale until the full suite is rerun

#### Scenario: Forced behavioral landing
- WHEN a spec, delta-bearing or explicitly independent-review change lacks current review or full checks
- THEN --force also refuses without folding or archiving the change

### Requirement: Purpose discovery continues into delivery
Packaged interview guidance SHALL distinguish the requested mechanism from the desired observable outcome, investigate facts before asking and ask only material unresolved owner decisions in dependency order. It SHALL use a single question for one consequential gap, or the complete relevant ready frontier for connected uncertainty, without a fixed question quota. Questions SHALL use concrete outcomes, a grounded recommendation and its main trade-off.

#### Scenario: Requested solution has an uncertain purpose
- WHEN the owner requests a mechanism but evidence does not establish the underlying problem or success criterion
- THEN guidance investigates available facts, uses a concrete scenario or discriminating question to clarify the desired outcome, and compares the simplest sufficient solution without overriding an explicit constraint

#### Scenario: Settled interview drives implementation and review
- WHEN the current request authorizes changes and material decisions are settled
- THEN guidance records their basis on the same active change, maps relevant decision IDs to scope, acceptance and implementation slices, loads implementation context after start, and directs independent review to verify the original purpose and decisions

#### Scenario: Upstream purpose changes
- WHEN a later answer changes a premise used by settled downstream work
- THEN guidance explains and reopens affected decisions, updates scope, acceptance, deltas and tasks, retains unrelated answers and obtains a fresh start receipt before dependent edits

#### Scenario: Clear small request
- WHEN the outcome, acceptance and constraints are already established
- THEN guidance proceeds without extra questions or a mandatory interview document

#### Scenario: Small feature with unresolved experience
- WHEN a small requested feature permits materially different user-visible outcomes and no existing answer or delegation settles the choice
- THEN guidance replays the proposed experience against the original frustration, distinguishes data preservation from presentation, records the decision and asks one concrete contrast with a recommendation before dependent implementation

## ADDED Requirements

### Requirement: Independent acceptance review
Spec changes, all changes with deltas and quick changes marked review: independent SHALL require a current structured independent review report. Other quick changes retain the lightweight path. The agent SHALL dispatch a fresh context, retaining original request and settled decisions; the CLI validates the submitted report but does not authenticate reviewer identity or reasoning independence. Missing host review capability SHALL be reported without inventing evidence.

#### Scenario: Green tests miss the owner's boundary
- WHEN self-authored tests pass
- THEN review still covers every exact acceptance, observed discriminating counterexamples, every complete projected capability and unresolved findings before final signed checks

#### Scenario: Incomplete, failed or stale review
- WHEN required coverage is missing or duplicated, findings remain, or code/contract inputs change
- THEN review cannot satisfy landing

#### Scenario: Multiple deltas for one capability
- WHEN a change contains multiple ordered deltas and durable decisions for one capability
- THEN the review packet contains one cumulative final contract matching landing's projection

### Requirement: Exact delta operations
MODIFIED and REMOVED SHALL reference existing canonical requirement identities; ADDED SHALL introduce a new identity. Invalid or ambiguous operations SHALL fail before durable writes. Review SHALL inspect merged current truth for semantic contradictions across differently named requirements and superseded decisions.

#### Scenario: Misspelled or misclassified operation
- WHEN a modified/removed requirement is absent, an added name exists or an unknown operation contains requirement blocks
- THEN preparation and merge report the invalid operation rather than silently append, overwrite or skip it

#### Scenario: Replacing existing behavior
- WHEN MODIFIED names a current requirement
- THEN the replacement removes its superseded body while preserving unrelated requirements and current decisions
