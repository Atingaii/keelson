# CLI reference

All commands run from anywhere inside the project; Keelson walks up to find a `.keelson/` that holds `config.yaml` or `INTENT.md` (the user-level `~/.keelson/` never counts). Exit code 0 means success, 1 means an error or a failed check, 2 means an unknown command. `--json` on most commands prints machine-readable output. `--help` and `--version` work everywhere; `keelson <command> --help` prints that command's usage line.

Boolean flags: `--json`, `--force`, `--dry-run`, `--hooks`, `--no-hooks`, `--refresh`, `--detect`, `--keep`, `--quiet`, `--confirm-assumptions`, `--accept-drift`, `--worktree`, `--purge`, and one flag per first-class host (`--claude`, `--codex`, `--opencode`, `--pi`, `--gemini`, `--kiro`, `--codebuddy`) plus `--agents`. Value flags accept `--key value` or `--key=value`. `--guide` is a value flag that also works bare: `--guide` and `--guide true` turn guided mode on, `--guide false` turns it off.

## `keelson init`

```text
keelson init [--<platform> ...] [--tools a,b] [--guide] [--profile lean|guided]
             [--lang en|zh] [--hooks|--no-hooks] [--dry-run] [--dir <path>]
```

The normal one-time setup. Creates the minimal standing control plane: package-owned `README.md`, `workflow.md`, `skill/`, user-controlled `config.yaml`, package-owned `manifest.json`, and core project facts `INTENT.md` + `NOW.md`. It does **not** pre-create empty ROADMAP, glossary, rules, specs, changes, tasks, ledgers, or handoffs.

Installs only the discovery blocks/Skill shims required by the selected hosts; every project also gets the portable `AGENTS.md + .agents/skills/` layer. Detects check commands and existing project material on first run.

The first-contact task asks the agent to infer and confirm project intent. It does not inventory an existing repository into specs/rules; those grow later when real work exposes a durable behavior contract or engineering invariant.

Tool selection precedence: `--tools a,b`; first-class flags (`--claude`, `--codex`, `--opencode`, `--pi`, `--gemini`, `--kiro`, `--codebuddy`) or `--agents`; saved project config on update; then detected installed first-class hosts. If none are found, the portable `agents` layer is used.

- `--guide` enables guided conversation style.
- `--no-hooks` persists `hooks: false`; `--hooks` re-enables host hooks.
- `--dry-run` previews create/update/remove/migrate actions and writes nothing.
- `--dir` targets another directory.

Exit 1 for an unknown/retired host or invalid profile.

## `keelson platforms`

```text
keelson platforms [--json]
```

Lists the seven first-class hosts plus the portable fallback with discovery support, `sessionFocus` capability (`native|degraded`), instruction/Skill paths, hooks, confidence, and installed/configured state.

## `keelson update`

Same as `init` with the values already in `config.yaml`. Run after upgrading the package to refresh `.keelson/workflow.md`, `.keelson/skill/`, discovery shims, and hooks, and to migrate `config.yaml`. Accepts `--dry-run`.

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

## `keelson focus`

```text
keelson focus [change] [--auto|--clear] [--json]
```

Agent-facing session routing. It changes only the gitignored conversation pointer; it never changes durable work status.

- `focus <change>`: bind this session to one active change when a stable session identity is available.
- `--auto`: keep an existing valid focus; otherwise choose a unique branch match or sole active change.
- `--clear`: clear this session pointer without cancelling/completing the change.
- degraded mode: when the host exposes no verified session identity, Keelson returns a safe candidate but does not persist a global/shared focus. Ambiguity is never guessed.

## `keelson new`

```text
keelson new <name> [--tier quick|spec] [--capability a,b] [--touches globs]
                   [--depends change[,change]] [--worktree] [--owner who] [--json]
```

Creates the smallest useful change workspace.

For `quick`:

```text
changes/<name>/
└── change.md
```

For `spec`, Keelson also creates `tasks.md`; each `--capability` creates one delta spec with a `base:` stamp (hash of the current main spec, or `new`).

`ledger.md` is **not** created by `new`; it appears when the first verification/ruling/root-cause/dispatch event is recorded. `handoff.md` appears only when `keelson handoff` is used.

Frontmatter records tier, created date, work status, owner, branch, and optional dependencies/touched paths. `--worktree` creates an isolated Git worktree/branch.

Exit 1 when the change exists, the tier is unknown, or `--worktree` is used outside Git.

## `keelson status`

```text
keelson status [--json]
```

Per active change: derived work state (including `ready`), verification, and release; current session focus; owner and branch; slices with progress and what they deliver (or the task list when there are no slices); acceptance progress; open questions and what they block; assumed decisions awaiting the owner; handoff stamp and whether HEAD moved since. Then shared-contract warnings between active changes, the last tag with changes landed since it, and `NOW.md`.

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

Creates/re-stamps an explicit transfer package. This is for ownership/machine transfer, not ordinary chat resume. With a session focus, that change is preferred; otherwise a sole active change may be omitted.

## `keelson validate`

```text
keelson validate [--json]
```

Structural checks over `.keelson/` and the specs directory. Errors (exit 1): missing `INTENT.md` or `NOW.md`; bad `profile` or `land`; rule files referenced but missing; spec directories without `spec.md`; duplicate requirements; bad tier or work status; missing `Why`/`What`; spec tier missing `How`/`Alternatives`/`Impact` or fewer than two alternatives; bad effort tags; `Verify:` entries without command or exit; unknown root-cause categories; dated model IDs anywhere under `.keelson/`. Warnings: template placeholders, rules not listed in the index, requirements without scenarios, acceptance items without a check kind, open questions without `blocks:`, dependencies on inactive changes, `**BREAKING**` without `Rollout`, slices without `Delivers:`, `Verify:` entries without `tree`, `Dispatch:` entries without `Result:`, handoffs without `at:`, missing refs paths, `.gitignore` without `.keelson/.runtime/`, and a slice named after a layer (`database`, `backend`, `frontend`, `ui`, `api`, `model`, `storage`, `infra`, and their variants), because a slice should be one user-observable path through every layer.

```text
! changes/demo/tasks.md: slice "Backend" is named after a layer; a slice should be one user-observable path through all layers (tracer bullet)
```

## `keelson check`

```text
keelson check [cmd...] [--record [claim]] [--change name] [--quiet] [--json]
```

Runs the entries in `config.yaml → check` (or the single command given as positional arguments), saves each output to `.keelson/.runtime/evidence/<timestamp>-<n>.log`, and prints one exit code per entry. An entry may be a command string or `{name, command, kind}`; named entries print their name and kind before the command:

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

Refuses, listing every real lifecycle blocker, while acceptance is incomplete, an active dependency remains, a spec-tier change has no acceptance contract, open questions or unreconciled contract drift remain, verification is not `passed`, `(assumed)` decisions still need owner confirmation, or a breaking change has no rollout. Task checkboxes are advisory only. Landing projects all durable writes first; large capability contracts automatically shard into a bounded `spec.md` index + `requirements/*.md` + optional `decisions.md`, then the change folds or archives. `--now` rewrites `NOW.md`; `--dry-run` previews; `--force` is reserved for explicit owner overrides.

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

Reports the Node version, pending config migration, canonical runtime integrity, `.keelson/manifest.json` desired-state integrity, and per configured host: discovery shim target/content, instruction block, hook registration, and registered hook script integrity. Then every `validate` finding, stale verification, HEAD moved since a handoff, dependencies on active changes, shared-contract conflicts, knowledge health, and tool CLIs missing from the path. Exit 1 when any finding is an error.

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
knowledge health: diagnostics for Keelson/Agent maintenance
! budget: INTENT.md is 153 lines (budget 120) → internal RECONCILE rewrites current truth
! narrative: .keelson/specs/orders reads like history in places → internal RECONCILE keeps current truth present-tense
```

## `keelson ablate` / `keelson restore`

```text
keelson ablate [--dry-run]
keelson restore [--force] [--dry-run] [--dir <path>]
```

`ablate` copies every Keelson surface (generated instruction files, host skill shim directories, host-specific rule files when configured, `.claude/settings.json`, `.keelson/`) to `~/.keelson/ablations/<hash>/`, records a hash of the stash and of each path after removal, then removes them. `restore` verifies the stash is intact, refuses if any managed path changed while ablated (unless `--force`), copies everything back, and deletes the stash.

## `keelson uninstall`

```text
keelson uninstall [--purge]
```

Removes generated runtime/integration surfaces: host skill shim directories, discovery blocks, host-specific rule files when configured, hook entries in `.claude/settings.json`, `.keelson/workflow.md`, `.keelson/skill/`, `.keelson/hooks/`, `.keelson/.runtime/`, and legacy `.keelson/.local/`. Keeps the project facts under `.keelson/` (INTENT, NOW, ROADMAP, rules, specs, changes). `--purge` removes `.keelson/` as well; specs stored outside it are untouched.
