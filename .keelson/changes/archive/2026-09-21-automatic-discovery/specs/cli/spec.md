---
base: f14310e25c
---

# cli — delta

## ADDED Requirements

### Requirement: Automatic integrated agent guidance
Packaged guidance SHALL route ordinary project requests through relevant discovery, domain/architecture, frontend, implementation, verification and reconciliation references without requiring the user to name a skill, design action or workflow phase. Both languages and profiles SHALL enable this behavior by default. These are host-agent instructions, not a deterministic model execution guarantee.

#### Scenario: Ordinary feature with unresolved decisions
- WHEN the owner requests team sharing and repository evidence does not settle audience, permission semantics or success criteria
- THEN guidance directs the agent to investigate first, automatically work a dependency-aware decision tree, ask ready owner decisions with recommendations and reasons, recompute after answers, and settle material branches before committing to dependent design

#### Scenario: Clear or already settled work
- WHEN the requested behavior and relevant constraints are established
- THEN guidance directs the agent to reuse those decisions and proceed without an unnecessary interview; new evidence is required to reopen a settled answer

#### Scenario: New evidence changes a premise
- WHEN a follow-up or repository finding contradicts a consequential settled premise
- THEN guidance directs automatic reassessment of the affected branches, explaining any reopening and retaining unrelated settled decisions

#### Scenario: Exploration without implementation authorization
- WHEN the owner discusses an unclear idea without asking for changes
- THEN automatic discovery stays read-only and uses the conversation for new answers until implementation is requested

#### Scenario: Implied interface work
- WHEN an ordinary feature or fix changes a user-visible interface path
- THEN guidance routes to frontend design and affected interaction verification even when the owner did not request a design action

#### Scenario: Default installation and profiles
- WHEN an owner initializes or updates a supported project with either language/profile and with or without vendoring
- THEN the discovery entry and canonical guidance deliver the automatic workflow without an extra activation flag; guide mode adds teaching only

### Requirement: Agent-operated execution start
Product-edit guidance SHALL create the smallest useful tracked change and call start before implementation. The CLI SHALL reject open or assumed decisions, unresolved prose questions, missing concrete acceptance, blocked states and unfinished prerequisites. Successful start SHALL record the current plan and bind the session. Supported Claude Code and CodeBuddy file-edit hooks and Codex apply_patch hooks SHALL deny modification when the session has no focus or the start record is absent or stale; planning artifacts remain editable. This guard SHALL preserve host permissions and SHALL NOT claim to cover arbitrary shell or MCP writes.

#### Scenario: Decision or plan changes after starting
- WHEN a registered decision reopens or the change scope or delta changes
- THEN the file-tool guard rejects product modification until the current plan passes start again

### Requirement: Phase-specific contract injection
Implementation and checking SHALL receive original request, change, decisions, relevant current/delta specs and rules, plus declared per-phase context files. Missing declared files SHALL fail visibly. Touches globs SHALL conservatively include narrower applicable rules. Claude and CodeBuddy Agent/Task hooks SHALL preserve original input while appending the phase pack using the host protocol. Codex SHALL supply child phase context without granting tool permission to rewrite arguments: tracked dispatch includes an explicit change marker and the child automatically binds it and loads its phase pack. Child hooks SHALL use the child thread identity, never infer the direct parent from the shared root session ID. Generic subagent startup SHALL preserve the assigned task scope and SHALL NOT overwrite an unknown phase. Injection caches SHALL distinguish agents, and session compaction SHALL restore context.

#### Scenario: Independent review preparation
- WHEN a fresh reviewer is assigned the check phase
- THEN it receives the request and contracts without treating the implementer's summary as proof, and guidance assigns repairs to the implementer before affected-scope re-review

### Requirement: Complete ready decision frontier
Frontier output SHALL preserve all ready owner questions, expose omitted ones as remaining by default, support --limit 1 and --all, and separate agent/reality investigations and blocked dependencies. Invalid limits SHALL fail before mutation. A complete registered graph SHALL NOT be represented as proof that all relevant decisions were discovered.

#### Scenario: Complex round has five ready questions
- WHEN the agent requests --all
- THEN all five questions are returned in the same frontier, with none silently lost to the default presentation limit

### Requirement: Preserve generated runtime ownership across upgrades
Published unmodified 0.4.0/0.4.1 discovery and vendor surfaces SHALL upgrade without force. New installations SHALL record runtime content digests for later upgrades. Edited generated files and unknown neighboring files SHALL be preserved, and conflicts SHALL fail before configuration mutation.

#### Scenario: Customized workflow during upgrade
- WHEN an installed workflow differs from its recorded generated content
- THEN update reports the conflict and preserves the workflow and existing configuration

### Requirement: Three primary CLI hosts
Initialization and update SHALL support Claude Code, Codex and CodeBuddy through native project discovery and workflow hook registration. Protocol differences SHALL be handled explicitly. Updates and hook removal SHALL preserve neighboring user settings and matcher groups. Codex hook trust SHALL remain host-controlled. Registration checks SHALL NOT imply live host trust or successful model execution.

#### Scenario: Multiple hosts in one repository
- WHEN an owner initializes all three hosts and later disables hooks
- THEN each host has its own discovery entry and protocol adapter, and disabling removes only Keelson registrations while preserving project knowledge and user hooks

## MODIFIED Requirements

## REMOVED Requirements
