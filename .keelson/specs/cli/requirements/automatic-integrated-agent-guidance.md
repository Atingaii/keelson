# Automatic integrated agent guidance

## Requirement: Automatic integrated agent guidance

Packaged guidance SHALL route ordinary project requests through relevant discovery, domain/architecture, frontend, implementation, verification and reconciliation references without requiring the user to name a skill, design action or workflow phase. Both languages and profiles SHALL enable this behavior by default. These are host-agent instructions, not a deterministic model execution guarantee.

### Scenario: Ordinary feature with unresolved decisions
- WHEN the owner requests team sharing and repository evidence does not settle audience, permission semantics or success criteria
- THEN guidance directs the agent to investigate first, automatically work a dependency-aware decision tree, ask ready owner decisions with recommendations and reasons, recompute after answers, and settle material branches before committing to dependent design

### Scenario: Clear or already settled work
- WHEN the requested behavior and relevant constraints are established
- THEN guidance directs the agent to reuse those decisions and proceed without an unnecessary interview; new evidence is required to reopen a settled answer

### Scenario: New evidence changes a premise
- WHEN a follow-up or repository finding contradicts a consequential settled premise
- THEN guidance directs automatic reassessment of the affected branches, explaining any reopening and retaining unrelated settled decisions

### Scenario: Exploration without implementation authorization
- WHEN the owner discusses an unclear idea without asking for changes
- THEN automatic discovery stays read-only and uses the conversation for new answers until implementation is requested

### Scenario: Implied interface work
- WHEN an ordinary feature or fix changes a user-visible interface path
- THEN guidance routes to frontend design and affected interaction verification even when the owner did not request a design action

### Scenario: Default installation and profiles
- WHEN an owner initializes or updates a supported project with either language/profile and with or without vendoring
- THEN the discovery entry and canonical guidance deliver the automatic workflow without an extra activation flag; guide mode adds teaching only
