# project-layout

## Purpose
The on-disk contract between a project and every agent that works in it.

## Requirement: Standing facts
The `.keelson/` directory SHALL contain `INTENT.md`, `NOW.md`, `config.yaml`, `specs/`, `rules/`, and `changes/`, and nothing under `specs/` or `rules/` is generated.

### Scenario: Fresh init
- WHEN `keelson init` runs in a directory without `.keelson/`
- THEN those files and directories exist and no existing file outside `.keelson/` is modified except the tool's instructions file, its skills directory, and (for Claude Code) `.claude/settings.json`

## Requirement: Change directory lifecycle
A change SHALL live in `changes/<name>/` with `change.md`, `tasks.md`, and `ledger.md`, and SHALL leave `changes/` when it lands.

### Scenario: Fold on land
- WHEN `keelson land <name>` succeeds with `land: fold`
- THEN `changes/<name>/` no longer exists, delta specs are merged into `specs/`, and `Decisions` lines are appended to the matching spec

## Requirement: Rules routing
The agent SHALL be able to find every rule that applies to a path from `rules/index.md` alone.

### Scenario: Path match
- WHEN `keelson context --paths src/api/orders.js` runs and `index.md` lists `` `src/api/**` → api.md ``
- THEN the output includes the content of `rules/api.md`

## Decisions
- project-layout: changes fold into specs and git history by default; a permanent archive directory was rejected because it duplicates what git already keeps and grows without bound
- project-layout: decisions live inside the affected spec rather than in a separate decision log, so the reason for a behaviour sits next to the behaviour
