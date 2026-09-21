---
base: a5b1eaedfc
---

## ADDED Requirements

### Requirement: Readable durable project memory
Packaged guidance SHALL automatically shape human-facing project memory around its current purpose, state and actionable continuation, while retaining complete requirements, owner decisions and original verification evidence. Both language/profile variants SHALL provide the same behavior. Existing project facts SHALL survive integration updates.

#### Scenario: Returning to an unfinished change
- WHEN an agent writes or refreshes NOW, tasks or a handoff
- THEN it identifies the current state and a concrete next action or blocker, links supporting detail and does not invent work after completion

#### Scenario: Concise presentation of complex work
- WHEN more than five requirements or ready owner decisions matter
- THEN guidance groups them while preserving all relevant items and the complete ready frontier
