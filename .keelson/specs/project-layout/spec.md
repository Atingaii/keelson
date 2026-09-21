# project-layout

## Purpose

The on-disk contract between a project and every agent that works in it.

## Requirement: Minimal standing control plane

Default Codex init SHALL create no more than ten files, four hundred generated lines and three top-level paths. It SHALL keep config, manifest, INTENT and NOW with a small discovery shim, create optional knowledge only on demand, and never modify .gitignore.

### Scenario: Fresh Codex project
- WHEN init --codex runs
- THEN empty rules/specs/changes and copied guidance are absent

## Requirement: Single runtime authority

Guidance SHALL load from the installed package through keelson guide. Explicit vendor mode MAY copy it under .keelson; host locations remain small discovery shims.

### Scenario: Claude only
- WHEN init --claude runs
- THEN only required Claude integration is installed, without an implicit portable agents layer

## Requirement: First-class host contract

The platform registry SHALL distinguish declared capability, source confidence, fixture coverage and actual host verification. Selecting a host SHALL install only its required surfaces.

### Scenario: Codex session identity
- WHEN CODEX_THREAD_ID is present
- THEN session diagnostics report native identity

### Scenario: Unsupported runtime identity
- WHEN the host provides no verified identity
- THEN diagnostics report degraded routing rather than claiming native support

## Requirement: Reconciled generated surfaces

Generated ownership SHALL be reconciled without overwriting malformed host JSON or deleting unrelated and user-modified files. Known unchanged legacy surfaces MAY migrate away.

### Scenario: Invalid settings
- WHEN host JSON cannot be parsed
- THEN update fails while preserving its original bytes

### Scenario: Neighboring user material
- WHEN installation mode or selected host changes
- THEN user material survives removal of identified unchanged generated files

## Requirement: Session focus is not work state

Keelson SHALL model an AI conversation/session as an ephemeral machine-local pointer to a durable active change. Session creation, loss, idle time, topic explanation, compaction, or window close SHALL NOT complete, cancel, archive, or land a change.

### Scenario: Close a conversation mid-change
- GIVEN a durable active change is focused by one session
- WHEN that session ends or its runtime pointer disappears
- THEN the change remains active with unchanged work/verification state

### Scenario: Parallel conversations
- GIVEN two sessions have stable identities
- WHEN each session focuses a different active change
- THEN session-local pointers are stored separately in private runtime sessions, and change-targeting commands prefer only the caller's focus

### Scenario: Ambiguous degraded host
- GIVEN session identity is unavailable and multiple active changes are plausible
- WHEN `keelson focus --auto` runs
- THEN Keelson SHALL NOT persist a shared/global focus and SHALL require explicit disambiguation

### Scenario: Mechanical readiness
- GIVEN the active change has satisfied acceptance, no active dependencies, no blocking open questions or assumptions, no unreconciled contract drift, required rollout, and fresh passing verification on the current tree
- WHEN status is evaluated
- THEN its derived work state is `ready` without requiring the owner to say that the task is finished or every historical task checkbox to remain relevant

### Scenario: Land clears focus
- WHEN a change lands or is cancelled
- THEN every local session pointer that referenced that change is removed without affecting other sessions

## Requirement: Progressive change workspace

Every non-trivial change SHALL start with `changes/<name>/change.md`. Additional artifacts SHALL be created only when they carry state: `tasks.md` for an explicit multi-step/spec plan, `ledger.md` after the first ruling/failure/dispatch/verification event, `handoff.md` only for explicit ownership/machine transfer, and delta specs only for behaviour-contract changes. The change SHALL leave active `changes/` when it lands or is cancelled.

### Scenario: Quick change starts small
- WHEN `keelson new <name> --tier quick` runs
- THEN `change.md` exists and empty `tasks.md`, `ledger.md`, and `handoff.md` do not

### Scenario: Spec change has a plan surface
- WHEN `keelson new <name> --tier spec --capability orders` runs
- THEN `change.md`, `tasks.md`, and the delta spec exist, while `ledger.md` remains absent until an event is recorded

### Scenario: Handoff
- WHEN `keelson handoff <name>` runs for an explicit ownership/machine transfer
- THEN `handoff.md` exists with `at`, `updated`, and `by` in its frontmatter; ordinary session resume does not require this artifact

## Requirement: Bounded self-maintaining knowledge

Keelson SHALL allow total project knowledge to grow with the project while keeping frequently-read physical documents bounded. Knowledge maintenance SHALL be internal to Keelson/Agent workflow and SHALL NOT require the owner to run housekeeping commands. A capability spec SHALL remain one logical contract even when its physical representation is automatically sharded.

### Scenario: Large capability contract
- GIVEN a capability's logical contract exceeds the configured spec budget
- WHEN a change lands
- THEN Keelson automatically stores a bounded `spec.md` index plus `requirements/*.md` and, when needed, `decisions/*.md`, while future base hashes, drift checks, validation, and delta merges operate on the reconstructed logical contract

### Scenario: Existing project material is never overwritten by sharding
- GIVEN the capability directory already contains an unmanaged `requirements/`, `decisions/`, or legacy `decisions.md`
- WHEN Keelson needs managed shards
- THEN it chooses a collision-free managed path, records that path in the bounded index, and preserves the pre-existing files byte-for-byte

### Scenario: Invisible runtime maintenance
- GIVEN stale local session pointers or old unrecorded verification-output files exist
- WHEN normal Keelson commands run
- THEN obsolete runtime cache entries are garbage-collected without changing durable work state or asking the owner to maintain them

### Scenario: Singleton current-state documents
- GIVEN NOW, INTENT, or an always-on rule becomes difficult to keep within its configured reading budget
- WHEN the Agent reconciles project knowledge
- THEN it rewrites, deduplicates, scopes, or automates the content as internal maintenance; only a change to product semantics, authorization, or compatibility is escalated to the owner

## Requirement: Existing material is referenced, not copied

`keelson init` SHALL detect existing architecture documents, decision records, CI configuration, and a GitHub issue tracker, record them under `config.yaml → refs`, and print them in `keelson context`.

### Scenario: Brownfield init
- WHEN `keelson init` runs in a repository with `docs/adr/` and `.github/workflows/`
- THEN `config.yaml` references both and `keelson context` lists them under existing project material

### Scenario: Fold on land
- WHEN `keelson land <name>` succeeds with `land: fold`
- THEN `changes/<name>/` no longer exists, delta specs are merged into `specs/`, and `Decisions` lines are appended to the matching spec

## Requirement: Rules routing

The agent SHALL be able to find every rule that applies to a path from `rules/index.md` alone.

### Scenario: Path match
- WHEN `keelson context --paths src/api/orders.js` runs and `index.md` lists `` `src/api/**` → api.md ``
- THEN the output includes the content of `rules/api.md`

## Decisions

- project-layout: session pointers, private keys and command trust remain local; facts, decisions and signed output evidence are reviewable project data.
- project-layout: optional knowledge grows on demand; frequently read files remain bounded without discarding unowned content.
- project-layout: structured decisions preserve answers and reopening reasons; open or assumed decisions gate normal landing.
- project-layout: signed changes always archive, including logs and public keys; disposable unsigned scaffolding may fold.
- project-layout: existing architecture documents and ADRs remain authoritative through references.

- project-layout: Human-facing project memory uses small current-state views with links to complete contracts and evidence; concise presentation never truncates durable information.
## Requirement: Markdown and path integrity

Recognized requirement edits SHALL preserve frontmatter, fenced examples and unknown sections. Sharding SHALL avoid deleting unowned files or following paths outside the capability.

### Scenario: Unowned content
- WHEN a requirement changes in a document with custom sections
- THEN custom content remains; if safe sharding is unavailable, budget validation reports the issue without discarding content

## Requirement: Readable durable project memory

Packaged guidance SHALL automatically shape human-facing project memory around its current purpose, state and actionable continuation, while retaining complete requirements, owner decisions and original verification evidence. Both language/profile variants SHALL provide the same behavior. Existing project facts SHALL survive integration updates.

### Scenario: Returning to an unfinished change
- WHEN an agent writes or refreshes NOW, tasks or a handoff
- THEN it identifies the current state and a concrete next action or blocker, links supporting detail and does not invent work after completion

### Scenario: Concise presentation of complex work
- WHEN more than five requirements or ready owner decisions matter
- THEN guidance groups them while preserving all relevant items and the complete ready frontier
