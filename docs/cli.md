# CLI reference

All commands run from anywhere inside the project; Keelson walks up to find a `.keelson/` that holds `config.yaml` or `INTENT.md` (the user-level `~/.keelson/` never counts). Exit code 0 means success, 1 means an error or a failed check, 2 means an unknown command. `--json` on most commands prints machine-readable output. `--help` and `--version` work everywhere; `keelson <command> --help` prints that command's usage line.

Boolean flags: `--json`, `--force`, `--dry-run`, `--no-hooks`, `--onboard`, `--refresh`, `--detect`, `--keep`, `--quiet`, `--confirm-assumptions`, `--accept-drift`, `--worktree`, `--purge`. Value flags accept `--key value` or `--key=value`. `--guide` is a value flag that also works bare: `--guide` and `--guide true` turn guided mode on, `--guide false` turns it off.

## `keelson init`

```text
keelson init [--tools claude,codex,cursor,opencode,gemini] [--profile lean|guided]
             [--lang en|zh] [--guide] [--no-hooks] [--onboard] [--dry-run] [--dir <path>]
```

Creates `.keelson/` with `INTENT.md`, `NOW.md`, `ROADMAP.md`, `GLOSSARY.md`, `rules/index.md`, `rules/general.md`, `config.yaml`, an empty `changes/`, and the specs directory. On a fresh init it detects existing material (architecture notes, decision records, CI, GitHub issues) into `refs`, detects check commands, and adds `.keelson/.local/` to `.gitignore`. Installs the skill (stamped with the CLI version), the resident block, and (Claude Code) the hooks for each tool. Runs local model detection. Never overwrites existing `.keelson/` files.

- `--onboard` rewrites `NOW.md` with an onboarding task for existing codebases.
- `--guide` sets `guide: true` in `config.yaml` and adds one line to the resident block saying the owner is learning engineering; the skill then explains choices with scenarios and trade-offs. `--guide false` turns it off again.
- `--no-hooks` skips hook installation.
- `--dry-run` lists every skill file as create, update, or unchanged, whether the instructions file would be created, appended, or refreshed, and any pending config migration. Writes nothing.
- `--dir` targets another directory.

```text
$ keelson init --dry-run
Keelson update (dry run) in /home/you/shop
  unchanged .claude/skills/keelson/SKILL.md
  update    .claude/skills/keelson/references/verify.md
  refresh   CLAUDE.md
  migrate   .keelson/config.yaml v2 → v3
nothing written
```

Exit 1 on an unknown tool or profile.

## `keelson update`

Same as `init` with the values already in `config.yaml`. Run after upgrading the package to regenerate the skill, resident blocks, and hooks, and to migrate `config.yaml`. Accepts `--dry-run`.

## `keelson context`

```text
keelson context [--paths a/,b/**] [--json]
```

Prints, as Markdown: the `context` text from config, `INTENT.md`, `ROADMAP.md`, `NOW.md`, existing references from `refs`, active changes (tier, owner, work and verification state, progress, open questions, handoff next step), capabilities with specs, the rule files whose globs match the given paths, and uncommitted files. Rules under `**` always print. Paths may also be given as positional arguments.

```bash
keelson context --paths src/services/notify.js
```

## `keelson impact`

```text
keelson impact <file> [file...] [--json]
```

Mechanical hints for a set of files: importers found by module name, specs whose path or text matches, rules that apply, and active changes whose `touches` or capabilities overlap. Every line is navigation; dynamic entry points are found by reading.

```text
$ keelson impact src/api/orders.js
Impact hints for src/api/orders.js
Callers / importers (1):
  src/web.js
Specs that may be affected (1):
  orders (mentions orders)
Rules that apply (2):
  rules/general.md  **
  rules/api.md  src/api/**
! active change add-pagination (ann, in-progress) declares these paths or capabilities — coordinate before editing
```

## `keelson new`

```text
keelson new <name> [--tier quick|spec] [--capability a,b] [--touches globs]
                   [--depends change[,change]] [--worktree] [--owner who] [--json]
```

Slugifies the name and creates `.keelson/changes/<name>/` with `change.md`, `tasks.md`, `ledger.md`, and one delta spec per `--capability`, each stamped with `base:` (a hash of the current main spec, or `new`). Frontmatter records `tier`, `created`, `status` (`clarifying` for spec, `in-progress` for quick), `owner` (git user name unless `--owner`), `branch`, and any `depends` and `touches`. `--worktree` runs `git worktree add -b <name> ../<repo>-<name>` and records `branch: <name>` and `worktree:`.

Exit 1 if the change exists, the tier is unknown, or `--worktree` is used outside git.

## `keelson status`

```text
keelson status [--json]
```

Per active change: work, verification, and release state; owner and branch; slices with progress and what they deliver (or the task list when there are no slices); acceptance progress; open questions and what they block; assumed decisions awaiting the owner; handoff stamp and whether HEAD moved since. Then shared-contract warnings between active changes, the last tag with changes landed since it, and `NOW.md`.

```text
Keelson — shop
2 capabilities in .keelson/specs · 1 active change · HEAD 7a9f37c2b1 · 3 uncommitted

share-links  [spec]  work: in-progress  verify: ~ stale  release: unreleased  (ann @ share-links)
   verified at tree 5bcb829dae, worktree is 9a92f4bead — re-run `keelson check --record` before landing
   ✓ slice Create and access 2/2 — a link can be created and opens the album
   · slice Revoke and expiry 0/3 — revoked or expired links refuse every access path
   acceptance 2/4
   open: default expiry for share links? (blocks Revoke and expiry)
   1 assumed decision awaiting the owner
   handoff 2026-09-19 14:02 at 7a9f37c2b1
```

## `keelson handoff`

```text
keelson handoff [name] [--by who] [--json]
```

Creates `changes/<name>/handoff.md` from the template, or re-stamps an existing one, with `at` (short HEAD), `updated`, and `by`. The agent fills the sections. With one active change the name may be omitted.

## `keelson validate`

```text
keelson validate [--json]
```

Structural checks over `.keelson/` and the specs directory. Errors (exit 1): missing `INTENT.md` or `NOW.md`; bad `profile` or `land`; rule files referenced but missing; spec directories without `spec.md`; duplicate requirements; bad tier or work status; missing `Why`/`What`; spec tier missing `How`/`Alternatives`/`Impact` or fewer than two alternatives; bad effort tags; `Verify:` entries without command or exit; unknown root-cause categories; dated model IDs anywhere under `.keelson/`. Warnings: template placeholders, rules not listed in the index, requirements without scenarios, acceptance items without a check kind, open questions without `blocks:`, dependencies on inactive changes, `**BREAKING**` without `Rollout`, slices without `Delivers:`, `Verify:` entries without `tree`, `Dispatch:` entries without `Result:`, handoffs without `at:`, missing refs paths, `.gitignore` without `.keelson/.local/`, and a slice named after a layer (`database`, `backend`, `frontend`, `ui`, `api`, `model`, `storage`, `infra`, and their variants), because a slice should be one user-observable path through every layer.

```text
! changes/demo/tasks.md: slice "Backend" is named after a layer; a slice should be one user-observable path through all layers (tracer bullet)
```

## `keelson check`

```text
keelson check [cmd...] [--record [claim]] [--change name] [--quiet] [--json]
```

Runs the entries in `config.yaml → check` (or the single command given as positional arguments), saves each output to `.keelson/.local/evidence/<timestamp>-<n>.log`, and prints one exit code per entry. An entry may be a command string or `{name, command, kind}`; named entries print their name and kind before the command:

```text
keelson check — 3 commands
✓ unit (test) `npm run test` exit 0
✓ boundaries (fitness) `npm run test:architecture` exit 0
✓ `npm run lint` exit 0
``` Computes the worktree fingerprint and forms a `Verify:` entry naming every command, its exit code, and `tree <hash>`. Without `--record` the entry is printed; with `--record` it is appended to the active change's `ledger.md` (`--change` picks one when several are active). `--record "<claim>"` sets the entry title; otherwise it is `checks pass` or `checks failed`.

Exit 1 when any command failed; the entry is still recorded with the failing exit code.

```bash
keelson check --record "pagination end to end"
keelson check "npm test -- orders" --record --change add-pagination
```

## `keelson land`

```text
keelson land [name] [--now "<text>"] [--confirm-assumptions] [--accept-drift]
             [--keep] [--force] [--dry-run]
```

Refuses, listing every reason, while tasks or acceptance items are unchecked, a spec-tier change has no acceptance list, open questions remain, verification is not `passed`, `(assumed)` decisions exist without `--confirm-assumptions`, a `**BREAKING**` bullet has no `## Rollout`, or a delta's `base:` no longer matches the main spec without `--accept-drift`. Then merges each delta into `<paths.specs>/<capability>/spec.md`, appends `Decisions` lines, and removes the change directory (or archives it as `integrated` with `--keep` or `land: keep`). `--now` rewrites `NOW.md`. `--dry-run` previews. `--force` overrides the gates and prints what it overrode.

```text
$ keelson land add-pagination
keelson: cannot land "add-pagination":
  - 1 acceptance item(s) unchecked
  - verification stale (verified at tree 5bcb829dae, worktree is 9a92f4bead)
Fix them, or pass --force if the user explicitly asked.
```

## `keelson cancel`

```text
keelson cancel <name> [--reason "<why>"]
```

Sets `status: cancelled`, appends a `## Cancelled` note with the date and reason, and moves the directory to `changes/archive/YYYY-MM-DD-<name>-cancelled/`. Nothing is merged into the specs.

## `keelson retro`

```text
keelson retro [--json]
```

Reads ledgers from active changes, the archive, and git history. Prints root-cause counts, per-tier dispatch statistics, verify entries, every guidance block with its sunset condition, and suggestions (prune guidance, add a rule, adjust effort tagging) when thresholds are met.

## `keelson models`

```text
keelson models [--platform <id>] [--json]
keelson models --detect
keelson models --refresh [--no-providers]
keelson models --resolve <light|standard|deep>
keelson models rank <alias> <light|standard|deep>
```

Default: a table of tier to alias with the source of each resolution, plus the local detection summary. `--detect` rescans installed tools and provider keys. `--refresh` fetches the registry and, with keys set, provider catalogues. `--resolve` prints one alias for scripts, exit 1 when unresolved. `rank` writes a user-level override and refuses dated IDs. See [models.md](models.md).

## `keelson doctor`

```text
keelson doctor [--json]
```

Reports the Node version, pending config migration, and per configured tool: skill presence and version match, resident block presence, hook registration and script presence. Then every `validate` finding, stale verification, HEAD moved since a handoff, dependencies on active changes, shared-contract conflicts, knowledge health, and tool CLIs missing from the path. Exit 1 when any finding is an error.

### Knowledge health

Findings about the project's documents, reported as warnings or information with a suggested fix, never applied automatically:

| Kind | Reported when |
|---|---|
| `budget` | `INTENT.md`, `ROADMAP.md`, `NOW.md`, `GLOSSARY.md`, a spec, a rule file, an active `change.md` or `handoff.md` is over its line budget in `config.yaml → budgets`; or the rule files routed by `**` add up to more than the `always-on` budget |
| `narrative` | a spec's requirement text reads like history (`used to be`, `was changed to`, `has been replaced by`, dated change sentences, a heading such as `Update` or `Changelog`) |
| `duplicate` | the same requirement name appears in two capabilities |
| `idle` | an active change has not been touched for 14 days or more |
| `oversized` | an active change has more than 25 tasks |
| `stale-generated` | a file under `docs/generated/` is older than the source tree by more than a day |

```text
knowledge health: findings are suggestions for small compactions, never automatic rewrites
! budget: INTENT.md is 153 lines (budget 120) → compact: rewrite the current truth, split by capability or scope, delete history that git already keeps, move automatable rules into checks
! narrative: .keelson/specs/orders/spec.md reads like history in places → current truth is present tense; reasons go to Decisions, the sequence of changes stays in git
```

## `keelson ablate` / `keelson restore`

```text
keelson ablate [--dry-run]
keelson restore [--force] [--dry-run] [--dir <path>]
```

`ablate` copies every Keelson surface (instructions files, skill directories, `.cursor/rules/keelson.mdc`, `.claude/settings.json`, `.keelson/`) to `~/.keelson/ablations/<hash>/`, records a hash of the stash and of each path after removal, then removes them. `restore` verifies the stash is intact, refuses if any managed path changed while ablated (unless `--force`), copies everything back, and deletes the stash.

## `keelson uninstall`

```text
keelson uninstall [--purge]
```

Removes the generated surfaces: skill directories, resident blocks, `.cursor/rules/keelson.mdc`, hook entries in `.claude/settings.json`, `.keelson/hooks/`, and `.keelson/.local/`. Keeps `.keelson/` (INTENT, NOW, ROADMAP, rules, specs, changes). `--purge` removes `.keelson/` as well; specs stored outside it are untouched.
