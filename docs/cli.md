# CLI reference

All commands run from anywhere inside the project; Keelson walks up to find `.keelson/`. Exit code 0 means success, 1 means an error or a failed check, 2 means an unknown command. `--json` on most commands prints machine-readable output. `--help` and `--version` work everywhere; `keelson <command> --help` prints that command's usage line.

Boolean flags: `--json`, `--force`, `--dry-run`, `--no-hooks`, `--onboard`, `--refresh`, `--detect`, `--keep`, `--quiet`. Value flags accept `--key value` or `--key=value`.

## `keelson init`

```text
keelson init [--tools claude,codex,cursor,opencode,gemini] [--profile lean|guided]
             [--lang en|zh] [--no-hooks] [--onboard] [--dir <path>]
```

Creates `.keelson/` with `INTENT.md`, `NOW.md`, `rules/index.md`, `rules/general.md`, `config.yaml`, and an empty `changes/`. Installs the skill, the resident block, and (Claude Code) the hooks for each tool. Detects check commands on first run. Runs local model detection. Never overwrites existing `.keelson/` files.

- `--onboard` rewrites `NOW.md` with an onboarding task for existing codebases.
- `--no-hooks` skips hook installation.
- `--dir` targets another directory.

Exit 1 on an unknown tool or profile.

## `keelson update`

Same as `init` with the values already in `config.yaml`. Run after upgrading the package to regenerate the skill, resident blocks, and hooks.

## `keelson context`

```text
keelson context [--paths a/,b/**] [--json]
```

Prints, as Markdown: the `context` text from config, `INTENT.md`, `NOW.md`, active changes with phase and progress, capabilities with specs, and the rule files whose globs match the given paths. Rules with `**` always print. Uncommitted files are listed when in a git repository. Paths may also be given as positional arguments.

```bash
keelson context --paths src/services/notify.js
```

## `keelson new`

```text
keelson new <name> [--tier quick|spec] [--capability <name>]
```

Creates `.keelson/changes/<slug>/` from the templates. `quick` (default) writes a short `change.md`; `spec` writes the full one and, with `--capability`, a delta spec at `specs/<capability>/spec.md`. Exit 1 if the change exists.

```bash
keelson new "NATS migration" --tier spec --capability messaging
```

## `keelson status`

```text
keelson status [--json]
```

```text
Keelson — demo
1 capability with specs · 1 active change

nats-migration  [spec]  building  2/4 tasks
   ✓ 1 Add NATS publisher adapter (standard)
   ✓ 2 Migrate notify consumer (light)
   · 3 Decide ack semantics (deep)
   · 4 Remove CSV export (light)
   1 ruling; last verify: none

NOW.md
...
```

## `keelson validate`

```text
keelson validate [--json]
```

Checks: `INTENT.md` and `NOW.md` exist; `profile` and `land` values; every `rules/index.md` entry points to a file; specs have requirements, scenarios, and no duplicate names; each change has the sections its tier requires; spec changes list at least two alternatives; task effort tags are valid; `Verify:` entries carry a command and exit code; root-cause categories are known; no dated model IDs anywhere in `.keelson/`. Warnings do not affect the exit code. Exit 1 on any error.

## `keelson check`

```text
keelson check [--quiet] [--json]
```

Runs each command in `config.yaml → check` from the project root and prints its exit code. `--quiet` hides the commands' own output. Ends with a ready-to-paste ledger line. Exit 1 if any command fails; exit 0 with a warning when none are configured.

```text
keelson check — 2 commands
✓ `npm run lint` exit 0
✓ `npm run test` exit 0

all checks passed
Ledger line:
### Verify: <claim>
`npm run lint` exit 0; `npm run test` exit 0
```

## `keelson land`

```text
keelson land [name] [--now "<text>"] [--keep] [--force] [--dry-run]
```

The name is optional when exactly one change is active. Refuses when tasks are unchecked or the last `Verify:` entry is missing or non-zero; `--force` overrides. Merges delta specs, folds decisions, then removes the directory (or archives it with `--keep` or `land: keep`). `--now` rewrites `NOW.md`. `--dry-run` reports without writing.

```text
Landing nats-migration (spec)
✓ specs/messaging: +1 added, ~1 modified, -1 removed
✓ specs/messaging: 2 decision lines folded
✓ removed .keelson/changes/nats-migration (ledger stays in git history)
✓ NOW.md rewritten
· commit the landing together with the last code change
```

## `keelson retro`

```text
keelson retro [--json]
```

Reads ledgers from active changes, the archive, and git history. Prints root-cause counts, per-tier dispatch statistics, verify totals, every guidance block with its sunset condition, and suggestions. Exit 0 always; a warning when no ledger entries exist.

## `keelson models`

```text
keelson models [--platform <id>] [--json]
keelson models --detect
keelson models --refresh [--no-providers]
keelson models --resolve light|standard|deep
keelson models rank <alias> light|standard|deep [--platform <id>]
```

- No flags: a table of tier → alias with the source of each mapping, plus the local detection summary.
- `--detect`: scan installed tools, their configured default models, and which provider keys are set; write `~/.keelson/models.cache.json`.
- `--refresh`: fetch the latest registry; with provider keys set, list each provider's catalogue and record models not seen before. `--no-providers` skips the catalogue calls. This is the only command that uses the network.
- `--resolve`: print just the alias. Exit 1 if unresolved.
- `rank`: write a user-level override. Rejects dated model IDs.

Platform defaults to the first entry in `config.yaml → tools`, or `claude` outside a project.

## `keelson ablate` and `keelson restore`

```text
keelson ablate [--dry-run]
keelson restore [--force] [--dry-run] [--dir <path>]
```

`ablate` copies every Keelson surface (instructions files, skill directories, `.cursor/rules/keelson.mdc`, `.claude/settings.json`, `.keelson/`) to `~/.keelson/ablations/<hash>/`, records hashes, removes the resident blocks and hook entries, and deletes the rest. Use it to compare an agent session with and without Keelson. Exit 1 if an ablation already exists.

`restore` verifies the stash is intact and that no managed path changed while ablated, then copies everything back and removes the stash. `--force` overwrites paths that changed.
