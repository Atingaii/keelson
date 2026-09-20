# cli

## Purpose
Maintains `.keelson/` and the generated surfaces; every command is safe to run repeatedly.

## Requirement: Idempotent init and update
Running `keelson init` or `keelson update` twice SHALL produce the same files as running it once.

### Scenario: Second run
- WHEN `keelson update` runs on an initialised project
- THEN `.keelson/workflow.md` and `.keelson/skill/` contain one canonical runtime, each host skill directory contains only its discovery `SKILL.md`, the instructions file contains exactly one discovery block, and `.claude/settings.json` contains exactly one Keelson hook per event

## Requirement: Landing requires evidence that matches the code
`keelson land` SHALL refuse a change while any task or acceptance item is unchecked, an open question remains, verification is missing, failed, partial, or stale, an assumed decision is unconfirmed, a delta's base spec has drifted, or a breaking change has no Rollout section, unless `--force` is passed; each blocker is named.

### Scenario: Stale evidence
- WHEN the last `Verify:` entry carries a tree fingerprint that differs from the current working tree
- THEN `keelson land` exits 1 and reports the verification as stale

### Scenario: Assumed decision
- WHEN `change.md` holds a `(assumed)` decision and `--confirm-assumptions` is not passed
- THEN `keelson land` exits 1 and says the owner must confirm it

## Requirement: Session focus routing
The CLI SHALL keep per-session focus under gitignored `.keelson/.runtime/sessions/` when a stable opaque session identity is available. Focus SHALL select an active change for agent-facing commands but SHALL NOT mutate durable work lifecycle state.

### Scenario: New change becomes current focus
- GIVEN `KEELSON_SESSION_ID` identifies a session
- WHEN `keelson new alpha` succeeds
- THEN that session's local focus points to `alpha`

### Scenario: Commands prefer focused change
- GIVEN two active changes and the current session focuses `alpha`
- WHEN `keelson check --record`, `keelson land`, `keelson cancel`, or `keelson handoff` omits a change name
- THEN the command targets `alpha`, not the other active change

### Scenario: Auto resume in degraded mode
- GIVEN no stable session identity is available
- WHEN `keelson focus --auto` finds one unique branch/active candidate
- THEN it reports that candidate without creating a global/shared mutable focus

### Scenario: Clear focus
- WHEN `keelson focus --clear` runs with a stable session identity
- THEN only the session pointer is deleted; the active change remains unchanged

## Requirement: Ready is derived from durable gates
The CLI SHALL derive `ready` independently of conversation phrasing when all required tasks and acceptance are complete, no blocking open questions or unconfirmed assumptions remain, breaking rollout requirements are satisfied, and current-tree verification passes.

### Scenario: Verification closes the final gate
- GIVEN all non-verification gates already pass
- WHEN `keelson check --record` records passing evidence for the current tree
- THEN the change reports `ready` and the CLI tells the agent to land without waiting for an owner "done" phrase
## Requirement: Evidence is recorded with a fingerprint
`keelson check --record` SHALL run the configured checks, save their output under `.keelson/.runtime/evidence/`, and append a `Verify:` entry that names each command, its exit code, and the working-tree fingerprint with `.keelson/` excluded.

### Scenario: Ledger append
- WHEN `keelson check --record "claim"` runs with one active change
- THEN its ledger ends with `### Verify: claim` followed by the commands, exit codes, and `tree <hash>`

## Requirement: Three status dimensions
`keelson status` SHALL report work status (from `status:` in change.md or derived from the artifacts), verification status (not-run, passed, failed, partial, stale), and release status (unreleased, or landed since the last tag) separately.

### Scenario: Code edited after verification
- WHEN a file outside `.keelson/` changes after a passing `Verify:` entry
- THEN `keelson status` shows verification `stale` while work status is unchanged

## Requirement: Shared contracts are exposed
`keelson status` SHALL warn when two active changes carry delta specs for the same capability or declare overlapping `touches` paths.

### Scenario: Two deltas on one capability
- WHEN two active changes both have `specs/orders/spec.md`
- THEN `keelson status` prints a shared-contract warning naming both

## Requirement: No dated model IDs
`keelson validate` SHALL fail when any file under `.keelson/` contains a dated model identifier.

### Scenario: Dated ID in a ledger
- WHEN a ledger contains a model identifier ending in an eight-digit date
- THEN `keelson validate` exits 1 and names the file

## Requirement: Tier resolution order
`keelson models --resolve <tier>` SHALL resolve in the order explicit, project config, user overrides, registry, platform rank fallback.

### Scenario: User override
- WHEN `~/.keelson/models.yaml` maps `claude.deep` to an alias and the project config does not
- THEN `--resolve deep` prints that alias

## Decisions
- cli: verification staleness is detected by a git tree object built from a throw-away index with `.keelson/` excluded; hashing file contents was rejected because it would not respect `.gitignore` and would make a ledger append invalidate its own evidence
- cli: release state is derived from git tags rather than stored; a release ledger file was rejected because it duplicates what tags already record and would need its own upkeep
- cli: tiers resolve to floating family aliases, never dated IDs, so new model versions need no repository change
- cli: hooks are copied into the project rather than invoked from the global install, so they keep working when the CLI is absent
