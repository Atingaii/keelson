# How it works

Keelson is three surfaces in the agent's environment and one human-readable directory of project facts in the repository. `.keelson/README.md` is the map into that directory; it is package-owned and refreshed by `keelson update`, while project facts are never overwritten just to upgrade Keelson. This page describes each mechanism precisely.

## The canonical runtime and discovery shims

`keelson init` puts the complete runtime guidance under one project-local root:

```text
.keelson/
├── workflow.md
└── skill/
    ├── SKILL.md
    └── references/
```

`.keelson/workflow.md` is the operating kernel. `.keelson/skill/SKILL.md` is the task router; its references are loaded only when needed. This is the only full copy of Keelson guidance in an initialized project.

Hosts still need files at paths they know how to discover, so Keelson writes tiny adapters outside `.keelson/`: a marked block in `CLAUDE.md`, `AGENTS.md`, `GEMINI.md`, or `CODEBUDDY.md`, and one-file skill shims such as `.claude/skills/keelson/SKILL.md` or `.agents/skills/keelson/SKILL.md`. Those adapters only point back to `.keelson/workflow.md` and `.keelson/skill/SKILL.md`; they contain no reference tree. `keelson update` refreshes them in place and preserves user-authored content outside the marked block.

The portable `AGENTS.md` + `.agents/skills/keelson/SKILL.md` discovery layer is installed on every init. Native host shims are added only when they add discovery capability. No symlinks are used, so the layout behaves the same on Windows, macOS, and Linux.

## Managed desired state and recovery

Generated integration files are not inferred from whatever happens to be on disk. `.keelson/.managed.json` records the concrete discovery surfaces the current install owns. On `update`, Keelson computes the desired surfaces from `config.yaml`, removes stale **Keelson-owned** adapters, refreshes the selected adapters, and rewrites the manifest. Known legacy paths are removed only when their contents carry a Keelson signature, so neighboring user files survive migration.

Package-owned skill directories are replaced recoverably rather than deleted first. Keelson populates a sibling temporary directory, keeps the last complete directory as a backup during the rename, and restores it if replacement fails. A later `update` also recovers interrupted temp/backup residue.

`keelson doctor` checks more than presence: it compares the canonical workflow, canonical skill file set/content, discovery shims, managed desired state, and registered hook scripts with what this CLI version would generate. Its errors name the broken surface and point to the repair path, normally `keelson update`.

## Hooks (Claude Code)

`init` copies two self-contained Node scripts into `.keelson/hooks/` and registers them in `.claude/settings.json`. They do not depend on the CLI being installed.

| Hook | Event | Prints |
|---|---|---|
| `session-start.mjs` | `SessionStart` on `startup`, `resume`, `clear`, `compact` | One header line; `ROADMAP.md → Now` (up to 400 characters, skipped while it is the template placeholder); `NOW.md` (up to 900 characters); active changes with tier, status, task progress, and owner; each active change's handoff `Next step` (up to 200 characters) |
| `prompt-state.mjs` | `UserPromptSubmit` | One line: `[keelson] active: <name> · <work> · verify <state> · <done>/<total> tasks · <n> open`. Nothing when no change is active |

The session snapshot costs a few hundred tokens once per session. The prompt line costs a few dozen tokens per turn and zero when idle. Neither hook prints instructions; they print state.

`--no-hooks` persists `hooks: false` in project config, so later `update` keeps them disabled; `--hooks` turns them back on. Existing hooks in `settings.json` are preserved; Keelson only adds and removes entries whose command path contains `.keelson/hooks/`.

## The skill

`init` installs the full skill once at `.keelson/skill/` and stamps the package version into its `SKILL.md` frontmatter. Host skill directories receive only a versioned discovery `SKILL.md` that points to that canonical copy. The canonical skill contains `SKILL.md` and thirteen references:

| Reference | Read when |
|---|---|
| `discover.md` | The owner is not sure what they want, or is learning: scenario before technology, gap ownership, the one highest-value question, scope guard, explore before committing, guided mode |
| `shape.md` | Understanding what is wanted: facts first, assumption audit, write-back, decision states, stop rule, one-question interviewing, authorization, unattended runs, sizing |
| `model.md` | Words or boundaries are drifting: glossary and bounded contexts, boundaries and invariants, deep modules, design it twice |
| `context.md` | Knowing what the code touches: three context layers, impact analysis, budget |
| `plan.md` | Creating `change.md`, vertical slices, acceptance, delta specs, effort tiers, working with an existing tracker |
| `engineer.md` | A design or reliability question: engineering lenses by delivery, structure, evolution, and operation; named patterns as vocabulary; quality targets as numbers |
| `build.md` | Executing tasks: rulings, subagent dispatch by tier, escalation, parallel work, keeping artifacts true |
| `verify.md` | Record validity, content validity, no silent weakening of tests, fresh-reader review, completion report |
| `harness.md` | Evolving the control system: invariants, feedforward/feedback placement, repeated-failure promotion, baselines, sunset conditions |
| `handoff.md` | What goes where, writing a handoff, resuming safely, `NOW.md` |
| `land.md` | Landing gates, code and specs reviewed together, collisions, release state, promoting learnings |
| `reconcile.md` | Writing new facts back and keeping the project small: where each fact goes, rewrite not append, budgets and compaction, gardening cadence |
| `debug.md` | Reproduce, locate, fix, name the root-cause category |

`SKILL.md` routes by need. The agent reads one reference at a time. During BOUND, ambiguous work uses a compact assumption audit and asks at most one user-owned, load-bearing question at a time; the audit itself is not stored, while material outcomes are routed into `change.md`, specs, rules, or the glossary. Every guideline carries a hidden HTML comment with an `id`, the failure it prevents (`without`), and its deletion condition (`sunset`). `keelson retro` reads those comments.

`profile` selects how much text ships. `lean` strips blocks marked `<!-- guided -->`. `guided` keeps them.

Package-owned Markdown is normalized to LF when Keelson renders or installs it. Parsers and hooks treat LF and CRLF as semantically equivalent, so a Windows checkout or a user-edited CRLF file does not change the project state Keelson sees; user files are not rewritten merely to change line endings.

## The change directory

`keelson new <name> --tier quick|spec [--capability a,b] [--touches globs] [--depends other] [--worktree]` creates `.keelson/changes/<name>/`:

```text
change.md      frontmatter (tier, created, status, owner, branch, worktree, depends, touches)
               + Why, What (outcome + non-goals) [, How, Alternatives, Impact], Acceptance, Open questions [, Rollout], Decisions
tasks.md       "## Slice: name" + "Delivers: …" + checkbox tasks with (effort: tier) and verify: `cmd`
ledger.md      append-only ### entries
handoff.md     created by `keelson handoff`, stamped with at/updated/by
specs/<cap>/spec.md   delta spec with a base: stamp, created per --capability
```

`owner` is the git user name (or the OS user), `branch` the current branch. `--worktree` runs `git worktree add -b <name> ../<repo>-<name>` and records `branch: <name>` and `worktree:`. `--touches` declares path globs the change will edit; `--depends` names other active changes it waits on.

### Lifecycle

```text
keelson new  →  build and tick tasks  →  keelson check --record  →  (keelson handoff when stopping)
             →  keelson land   (fold or archive, specs merged)
             →  keelson cancel (archive as cancelled, nothing merged)
```

`config.yaml → land: fold` (default) removes the change directory after merging; its ledger and handoff remain in git history and `keelson retro` reads them from there. `land: keep`, or `keelson land --keep`, moves the directory to `.keelson/changes/archive/YYYY-MM-DD-<name>/` with `status: integrated`. `keelson cancel` moves it to `archive/YYYY-MM-DD-<name>-cancelled/` with `status: cancelled` and a `## Cancelled` note.

### Landing gates

`keelson land` refuses, and names every reason, when:

- any task is unchecked;
- any acceptance item is unchecked, or a spec-tier change has no `## Acceptance` list;
- any open question remains;
- verification is `not-run`, `failed`, `partial`, or `stale`;
- `(assumed)` decisions exist and `--confirm-assumptions` was not passed;
- a `What` bullet starts with `**BREAKING**` and there is no `## Rollout` section;
- a delta spec's `base:` no longer matches the main spec and `--accept-drift` was not passed.

`--dry-run` previews the merge. `--force` overrides every gate and prints what it overrode; it is for the owner's explicit decision.

## Spec merge semantics

Main specs live at `<paths.specs>/<capability>/spec.md`:

```markdown
# orders

## Purpose
...

## Requirement: Order listing
The system SHALL ...

### Scenario: Default page
- WHEN ...
- THEN ...

## Decisions
- orders: offset pagination over cursor; cursor rejected because the table needs page jumps
```

A delta spec in a change carries a `base:` stamp (a hash of the main spec when the delta was created, or `new`) and three sections:

```markdown
---
base: 4233e56865
---
## ADDED Requirements
### Requirement: Page size limit
...

## MODIFIED Requirements
### Requirement: Order listing
(full replacement text)

## REMOVED Requirements
### Requirement: Legacy CSV export
```

At landing, per capability:

- `REMOVED` deletes the requirement by name; a missing name is reported.
- `MODIFIED` replaces the requirement by name; a missing name is added instead and reported.
- `ADDED` appends; an existing name is replaced and reported as modified.
- Names compare case-insensitively. `#### Scenario:` headings in a delta are normalised to `###` in the main spec.

Then every line under `## Decisions` in `change.md` that starts with a capability prefix (`- orders: …`, optionally after `(confirmed)` or `(assumed)`) is appended to that capability's `## Decisions` section. Lines already present are skipped. Lines without a prefix are skipped with a warning. A capability with no spec yet gets one created.

Drift: if the main spec changed after the delta was written, `base:` no longer matches and landing refuses until the agent re-reads it and passes `--accept-drift`.

## The worktree fingerprint

Verification staleness needs a stable identity for "the code as it is now". In a git repository Keelson builds a real tree object from a throw-away index: `git add -A` into a temporary `GIT_INDEX_FILE` with `.keelson/` excluded, then `git write-tree`, truncated to 10 characters. Tracked and untracked files count, `.gitignore` is respected, and appending to a ledger does not invalidate the evidence it records. Without git, the fingerprint is a content hash of every file outside `node_modules`, `.git`, and `.keelson`.

`keelson check` writes the fingerprint into the `Verify:` entry as `tree <hash>`. `keelson status`, `land`, and `doctor` recompute it and compare.

## GLOSSARY.md

`.keelson/GLOSSARY.md` holds one line per term: the meaning that code, specs, and conversation all use. `init` seeds it with the template; `keelson context` prints it once it has real content (the template placeholder line is skipped). A term that means something different in another part of the system keeps both lines, each naming its part. It has a line budget like every other document.

## Check entries

`config.yaml → check` accepts a command string or an object `{name, command, kind}`. `keelson check` normalises both into name, command, and kind; for a string the name is the command and the kind is guessed from it (`lint` for lint and format tools, `typecheck` for type checkers, `build` for build steps, `fitness` for commands that mention architecture, dependencies, boundaries, compatibility, or contracts, `test` for test runners, otherwise `check`). Named entries print their name and kind in the output and in `--json`. A `fitness` check is a constraint made executable; the skill asks for one whenever a rule keeps being broken.

## Knowledge health

`keelson doctor` computes, without editing anything:

- line counts of `INTENT.md`, `ROADMAP.md`, `NOW.md`, `GLOSSARY.md`, every spec, every rule file listed in `rules/index.md`, and every active `change.md` and `handoff.md`, compared with `config.yaml → budgets`; the rule files routed by `**` or `*` are also summed and compared with `always-on`;
- requirement bodies in each spec matched against history phrasing (`used to be`, `was changed to`, `has been replaced by`, `we then/later moved`, `as of <year>`, a dated sentence with `changed`, `moved`, `switched`, or `replaced`) and headings named `Update`, `Changelog`, `History`, or `Migration notes`;
- requirement names, case-insensitively, across capabilities, to find duplicates;
- for each active change, the newest modification time among `change.md`, `tasks.md`, `ledger.md`, and `handoff.md` (idle after 14 days) and the task count (oversized above 25);
- for files under `docs/generated/`, whether they are more than a day older than the newest file under `src/` (or the project root when there is no `src/`).

Each finding carries a suggested fix. The output is a list of small compactions for a person or the agent to make and land like any other change.

## NOW.md

`NOW.md` is a snapshot, not a log. It is rewritten in full at every landing and whenever work stops mid-way: what is active, what is blocked or uncertain (including "not yet checked: …"), the next concrete step. `keelson land --now "<text>"` writes it. The session-start hook prints it.

## Rules routing

`.keelson/rules/index.md` maps globs to files in the same directory, one per line:

```markdown
- `**` → general.md — applies to every change
- `src/api/**` → api.md — HTTP layer
- `src/services/**` → services.md
```

The arrow may be `→`, `->`, or `:`. The trailing note after a dash is optional. `keelson context --paths a,b` prints every rule file whose glob matches any of the paths; `**` and `*` alone always match.

Glob semantics: `**/` matches zero or more directories; `**` alone matches anything; `*` matches within one segment; `?` matches one character; `{a,b}` matches alternatives. A glob with no wildcard, such as `src/api` or `src/api/`, matches that path and everything beneath it.

`keelson validate` reports index entries whose file is missing as errors, and rule files not listed in the index as warnings.

## Impact hints

`keelson impact <files>` prints, for the given files:

- callers: files whose `import`, `require`, `from`, `include`, or `use` line names the module's basename (via `git grep`, or a file walk without git);
- specs that may be affected: capabilities whose directory name appears in a file path, or whose spec text contains a word from a file's basename;
- rules that apply, by the same routing as `context`;
- active changes whose `touches` cover the files or whose capabilities match the specs found.

Every line of that output is a hint. Dynamic entry points, routes, jobs, and templates are found by reading.

## Ledger entries and retro

`ledger.md` is append-only. Each entry is a `###` heading followed by a body:

| Entry | Meaning | Parsed fields |
|---|---|---|
| `### Ruling: <topic>` | A decision the agent made inside its authorization instead of stopping | count |
| `### Root cause: <category>` | Category of a fixed bug | `missing-rule`, `cross-layer`, `propagation`, `test-gap`, `implicit-assumption`, `guessed-fix` |
| `### Verify: <claim>` | Evidence for a status claim | commands in backticks, `exit N` (the highest counts), `tree <hash>` |
| `### Dispatch: task N → <tier> (<alias>)` | A subagent dispatch | tier, task, and a `Result: pass\|fail` first line in the body |
| `### Escalate: task N <tier> → <tier>` | A re-dispatch one tier up | from, to |
| `### Note: <text>` | Anything else | none |

`keelson validate` requires every `Verify:` entry to have a command and an exit code, warns when it has no `tree`, warns when a `Dispatch:` has no `Result:` line, and requires every `Root cause:` to use a known category.

`keelson retro` gathers ledgers from active changes, the archive, and git history (ledgers deleted under `.keelson/changes/` in past commits). It computes root-cause counts per category; per tier, dispatches, failures, entries without a result, escalations away from the tier, and first-pass rate over known results; verify entries and how many failed; rulings. It then lists every guidance block with its sunset condition and prints suggestions when thresholds are met: prune a block, add a rule for a recurring category, or adjust effort tagging.
