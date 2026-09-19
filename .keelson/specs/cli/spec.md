# cli

## Purpose
Maintains `.keelson/` and the generated surfaces; every command is safe to run repeatedly.

## Requirement: Idempotent init and update
Running `keelson init` or `keelson update` twice SHALL produce the same files as running it once.

### Scenario: Second run
- WHEN `keelson update` runs on an initialised project
- THEN the instructions file contains exactly one resident block and `.claude/settings.json` contains exactly one Keelson hook per event

## Requirement: Landing requires evidence
`keelson land` SHALL refuse a change with unchecked tasks or without a passing `Verify:` ledger entry unless `--force` is passed.

### Scenario: Unverified change
- WHEN `keelson land` runs on a change whose last `Verify:` entry has a non-zero exit
- THEN the command exits 1 and names the blocker

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
- cli: tiers resolve to floating family aliases, never dated IDs, so new model versions need no repository change
- cli: hooks are copied into the project rather than invoked from the global install, so they keep working when the CLI is absent
