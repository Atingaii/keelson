# Durable decision frontier

## Requirement: Durable decision frontier

Decision records SHALL preserve ownership, dependencies, settlement basis and reopening history. By default the frontier SHALL expose at most three independent ready user-owned questions, preserve additional ready decisions in `remaining`, and separate agent/reality investigations. `--all` SHALL expose the complete ready user frontier; `--limit 1` SHALL support a single consequential gap. A display limit SHALL NOT imply that undisplayed decisions are settled.

### Scenario: Settled question
- WHEN an agent resumes after D17 was settled
- THEN D17 remains answered until explicitly reopened with a reason

### Scenario: Complex ready frontier
- WHEN more than three user decisions are ready and the agent requests `--all`
- THEN every ready user decision is returned in the same frontier
