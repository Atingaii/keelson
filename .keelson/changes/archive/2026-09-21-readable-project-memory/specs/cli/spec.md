---
base: 8a47e5b622
---

## ADDED Requirements

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

## MODIFIED Requirements

### Requirement: Durable decision frontier
Decision records SHALL preserve ownership, dependencies, settlement basis and reopening history. By default the frontier SHALL expose at most three independent ready user-owned questions, preserve additional ready decisions in `remaining`, and separate agent/reality investigations. `--all` SHALL expose the complete ready user frontier; `--limit 1` SHALL support a single consequential gap. A display limit SHALL NOT imply that undisplayed decisions are settled.

#### Scenario: Settled question
- WHEN an agent resumes after D17 was settled
- THEN D17 remains answered until explicitly reopened with a reason

#### Scenario: Complex ready frontier
- WHEN more than three user decisions are ready and the agent requests `--all`
- THEN every ready user decision is returned in the same frontier
