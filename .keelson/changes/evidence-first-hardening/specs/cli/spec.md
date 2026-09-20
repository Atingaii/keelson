---
base: c9f929bc64
---
## ADDED Requirements

### Requirement: Durable decision frontier
Decision records SHALL preserve ownership, dependencies, settlement basis and reopening history. The frontier SHALL expose at most three independent ready user-owned questions and separate agent/reality investigations.

#### Scenario: Settled question
- WHEN an agent resumes after D17 was settled
- THEN D17 remains answered until explicitly reopened with a reason

### Requirement: Bounded execution and serialized reconciliation
Checks SHALL use closed stdin, finite deadlines and output caps, and record every completed result. Landing and cancellation SHALL not race active checks.

#### Scenario: Active check
- WHEN land or cancel is requested while checks execute
- THEN the operation refuses even when force is requested
