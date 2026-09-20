# project-layout

## Purpose
The on-disk contract between a project and every agent that works in it.

## Requirement: Minimal standing control plane
A fresh `.keelson/` SHALL contain only package-owned navigation/runtime (`README.md`, `workflow.md`, `skill/`), user-controlled `config.yaml`, package-owned `manifest.json`, and the two core project facts `INTENT.md` and `NOW.md`. ROADMAP, GLOSSARY, rules, specs, changes, ledger, tasks, transfer handoff, hooks, and local runtime/evidence SHALL appear only when they carry information or the selected host requires them. `.keelson/.runtime/` SHALL be gitignored and SHALL never be authoritative for durable work completion.

### Scenario: Fresh init
- WHEN `keelson init` runs in a directory without `.keelson/`
- THEN the minimal standing files exist; empty ROADMAP/GLOSSARY/rules/specs/changes directories are not created; full Keelson workflow/skill guidance exists only under `.keelson/`; and outside `.keelson/` only discovery shims plus selected host integration files may be modified

### Scenario: Knowledge grows on demand
- GIVEN a project has no glossary, rules, specs, or active changes
- WHEN real work first needs a durable term, scoped invariant, behaviour contract, or reviewable change boundary
- THEN only the corresponding artifact is created; unrelated empty artifacts remain absent

### Scenario: Update human map
- WHEN `keelson update` runs after the package changes its project-map documentation
- THEN `.keelson/README.md` is refreshed while project-fact files such as `INTENT.md`, `NOW.md`, existing specs, and rules are not overwritten

## Requirement: Single runtime authority
Every initialized project SHALL keep its canonical workflow in `.keelson/workflow.md` and its canonical skill plus references in `.keelson/skill/`. `AGENTS.md`, `.agents/skills/keelson/SKILL.md`, and any tool-specific instruction/skill locations SHALL be discovery shims that point into `.keelson/` rather than duplicate the guidance.

### Scenario: Claude-only init remains portable
- WHEN `keelson init --claude` runs
- THEN `.keelson/workflow.md` and `.keelson/skill/` exist; Claude and portable discovery shims both point to them; neither shim directory contains copied references

## Requirement: First-class host contract
Keelson SHALL expose first-class adapters only for Claude Code, Codex CLI, OpenCode, Pi, Gemini CLI, Kiro CLI, and CodeBuddy CLI. Every first-class discovery path SHALL be verified in a real session or backed by primary host documentation; guessed convention-only paths SHALL NOT be advertised as supported. Every project SHALL also receive the portable `AGENTS.md` + `.agents/skills/` fallback.

### Scenario: Standard-compatible hosts reuse the portable surface
- WHEN `keelson init` selects Codex, OpenCode, or Pi
- THEN their project instructions use `AGENTS.md`, their skill discovery uses `.agents/skills/keelson/SKILL.md`, and no duplicate host-native Skill tree is created

### Scenario: Host-native discovery adds capability only where documented
- WHEN `keelson init` selects Claude Code, Gemini CLI, Kiro CLI, or CodeBuddy CLI
- THEN only the host-documented instruction and/or skill discovery path is added, each shim points to the same `.keelson/` runtime, and references are not copied outside `.keelson/`

### Scenario: Retired guessed adapters migrate away
- GIVEN an older project contains a known legacy Keelson adapter whose content can be identified as Keelson-owned
- WHEN `keelson update` runs
- THEN that legacy adapter is removed without deleting neighboring user files, and the portable layer remains available

## Requirement: Reconciled generated surfaces
Keelson SHALL track the generated discovery surfaces it owns and reconcile actual disk state toward the configured desired state. Package-owned runtime/skill directory replacement SHALL preserve the last complete copy until the new copy is ready.

### Scenario: Host selection changes
- GIVEN a project was initialized for Claude Code and Kiro CLI
- WHEN the owner updates the configured hosts to Codex CLI
- THEN stale Claude/Kiro discovery surfaces and Claude hook registrations are removed, user-authored content outside Keelson markers remains, and `.keelson/manifest.json` records only the new desired surfaces

### Scenario: Interrupted directory replacement
- GIVEN the previous canonical skill directory is complete
- WHEN generating its replacement fails before completion
- THEN the previous complete directory remains usable and temporary/backup residue is recoverable on the next update

### Scenario: Doctor detects drift
- WHEN a package-owned canonical reference, discovery shim, or registered hook script differs from the version Keelson would generate
- THEN `keelson doctor` reports actionable drift and `keelson update` can restore the package-owned surface
## Requirement: Session focus is not work state
Keelson SHALL model an AI conversation/session as an ephemeral machine-local pointer to a durable active change. Session creation, loss, idle time, topic explanation, compaction, or window close SHALL NOT complete, cancel, archive, or land a change.

### Scenario: Close a conversation mid-change
- GIVEN a durable active change is focused by one session
- WHEN that session ends or its runtime pointer disappears
- THEN the change remains active with unchanged work/verification state

### Scenario: Parallel conversations
- GIVEN two sessions have stable identities
- WHEN each session focuses a different active change
- THEN session-local pointers are stored separately under `.keelson/.runtime/sessions/`, and change-targeting commands prefer only the caller's focus

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
- GIVEN stale local session pointers or old verification-output files exist
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
- project-layout: session focus is ephemeral and machine-local while change state is durable and committed; using chat-window lifetime or a global current-task pointer as work state was rejected because users keep asking questions, close sessions unpredictably, and may run parallel agents
- project-layout: optional knowledge and change artifacts are lazy; pre-creating empty ROADMAP/GLOSSARY/rules/specs/tasks/ledger/handoff was rejected because empty scaffolding increases cognitive load without preserving any truth
- project-layout: continuation state that another machine needs (handoff.md, NOW.md) is committed; check output and session focus stay in `.keelson/.runtime/`; gitignoring everything was rejected because a team cannot resume from files that never leave one laptop
- project-layout: decisions carry a state (confirmed or assumed) inside change.md rather than in a separate approvals file; a separate file was rejected because approval and decision would drift apart
- project-layout: changes fold into specs and git history by default; a permanent archive directory was rejected because it duplicates what git already keeps and grows without bound
- project-layout: task checkboxes are mutable execution-plan state, not lifecycle authority; requiring every historical task to remain checked was rejected because implementation paths legitimately change while acceptance and evidence remain authoritative
- project-layout: total durable knowledge may grow, but frequently-read physical files stay bounded through automatic sharding, scoping, rewriting, and runtime garbage collection; asking the owner to perform periodic housekeeping was rejected because control-plane maintenance is Keelson's responsibility
- project-layout: capability-local current rationale stays beside the affected capability and may shard into `decisions/*.md`; surprising cross-cutting or expensive-to-reverse architecture decisions use the project's referenced ADR system when present, avoiding both a giant global decision log and duplicated rationale
- project-layout: `.keelson/workflow.md` + `.keelson/skill/` are the sole runtime authority; root/platform files are discovery shims only. Full copies in host directories and symlink-based sharing were rejected because copies drift and symlinks are brittle across Windows/tooling.
