# cli

## Purpose

Maintains `.keelson/` and the generated surfaces; every command is safe to run repeatedly.

## Requirement: Idempotent init and update

Running init/update repeatedly SHALL preserve project facts and user-authored integration content, maintain one owned discovery block per selected surface, and use package guidance unless vendor mode is explicitly configured.

### Scenario: Repeated update
- WHEN update runs twice
- THEN generated desired state is stable and no unrelated content or .gitignore line changes

## Requirement: Landing requires evidence that matches the code

Normal landing SHALL require completed acceptance, resolved decisions/questions/dependencies, reconciled contracts, required rollout and fresh complete signed evidence. Task checkboxes are advisory. An authorized --force requires a reason and archives a signed override without converting failed evidence to success.

### Scenario: Prose forgery
- WHEN a user writes a passing Verify paragraph without valid structured evidence
- THEN normal landing fails

### Scenario: Changed acceptance
- WHEN acceptance or decision records change after a check
- THEN verification is stale until the full suite is rerun

## Requirement: Session focus routing

Session focus SHALL live in Git-private keelson-runtime/sessions or an external per-project cache. KEELSON_SESSION_ID, CODEX_THREAD_ID or PI_SESSION_ID selects a caller-local pointer. Missing identity SHALL degrade without storing a shared focus.

### Scenario: Independent Codex threads
- WHEN two CODEX_THREAD_ID values focus different changes
- THEN each command resolves only its caller

### Scenario: Clear focus
- WHEN focus --clear runs
- THEN durable work remains active

## Requirement: Ready is derived from durable gates

Ready SHALL be derived from completed acceptance and passing lifecycle gates with fresh complete evidence. Historical task checkboxes and conversation phrases SHALL NOT determine completion.

### Scenario: Final gate
- WHEN complete recorded checks pass after all other gates
- THEN check reports ready and recommends land

## Requirement: Evidence is recorded with a fingerprint

Check --record SHALL bind full code and acceptance-input fingerprints, exact commands, exit codes, timestamps and log digests in an Ed25519 DSSE envelope. Signed JSONL and logs SHALL remain with the change when archived. Private keys and command trust SHALL stay machine-local.

### Scenario: Input-changing command
- WHEN a command edits bound inputs during execution
- THEN the record cannot satisfy normal landing

### Scenario: Command trust
- WHEN a new or changed command suite lacks local trust
- THEN no command executes until --trust explicitly authorizes it

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

- cli: full code and acceptance-input fingerprints are independent so evidence appends do not invalidate their own checks.
- cli: Ed25519 DSSE records provide local tamper detection, not a security boundary against a process with the same user permissions.
- cli: release state is derived from Git tags; model names use floating aliases.
- cli: package guidance and hook dispatch keep default installation small; copied guidance is explicit vendor mode.
