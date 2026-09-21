# Changelog

Notable changes to Keelson, organized by version.

## [0.4.1] - 2026-09-21

### Changed

- Explain Keelson through four everyday development problems, connecting its workflow to behaviour-driven development, shared domain language, decision records, short feedback loops and usability heuristics.
- Align both READMEs with public npm installation, add a live version badge and use links that work on GitHub and npm.
- Document publishing each completed update, including README changes, under a new version with the `latest` tag.
- Normalize the project's Ubuntu commit identity to Atingaii with a Git mailmap; subsequent commits use Atingaii directly.

## [0.4.0] - 2026-09-20

First public npm release as `@zyaiting/keelson`. Install with `npm install -g @zyaiting/keelson`.

### Added

- Bilingual frontend design workflows with focused action briefs, installed reference discovery and concise command help.

- Ed25519 DSSE/in-toto verification records, full code and acceptance fingerprints, bound output logs, explicit command trust, deadlines and output caps.
- `keelson ask` decision ownership, dependency-aware question frontier, settlement and reopening history; `attest` evidence export.
- Git-private runtime, serialized evidence appends, active-check guards and recoverable landing/cancellation transactions.
- English/Chinese migration and trust documentation plus a generated wide project banner.

### Changed

- Concurrent Windows checks retry transient lock-release failures without repeating completed writes.
- Default init installs small discovery shims and project facts; `guide` loads installed guidance on demand. `--vendor` explicitly copies it.
- No generated .gitignore changes. Signed logs and public keys stay with archived changes; private keys, trust and focus remain local.
- Codex uses CODEX_THREAD_ID. Host capability, documentation confidence and actual testing are distinguished.
- Completion uses structured evidence; legacy Verify prose requires rechecking. Force needs a reason and leaves a signed override.
- Markdown parsing supports fenced examples, nested headings and Unicode; edits preserve unknown content and sharding rejects unsafe paths.
- Malformed host JSON fails without replacement; generated-surface reconciliation protects user content.
- Task checkboxes remain advisory. Settled decisions cannot be silently reopened, and structured assumptions require explicit settlement.
- Package name is scoped as `@zyaiting/keelson`; the executable remains `keelson`. Syntax checks run on every CI platform.

### Migration

Review `keelson update --dry-run`, run update, then review and rerun the configured checks with `--trust --record`. Old evidence cannot satisfy the new completion gate. See [verification](docs/verification.md) for trust and recovery limits.

## [0.3.0] - 2026-09-19

The engineering judgment layer: how to find out what is wanted, keep vocabulary and boundaries straight, pick the design questions that matter, and keep the project's knowledge small.

### Added

- Skill references `discover.md` (scenario before technology, which unknowns to raise, scope guard, explore before committing, guided mode), `model.md` (glossary and bounded contexts, boundaries and invariants, deep modules, design it twice), `engineer.md` (engineering lenses by delivery, structure, evolution, and operation; named patterns as vocabulary; quality targets as numbers), and `reconcile.md` (where each new fact goes, rewrite not append, budgets and compaction, gardening cadence). `plan.md` gained "Slices are vertical".
- `.keelson/GLOSSARY.md`, seeded by `keelson init` and printed by `keelson context` once it has content.
- `keelson init --guide` and `config.yaml → guide`: guided mode for owners who are learning engineering; adds one line to the resident block and a note to `keelson context`.
- `config.yaml → budgets`: line budgets per document type (`INTENT`, `ROADMAP`, `NOW`, `GLOSSARY`, `spec`, `rule`, `change`, `handoff`, `always-on`).
- `keelson doctor` reports knowledge health: documents over budget, requirement text that reads like history, duplicated requirement names across capabilities, changes idle for 14 days or more, changes with more than 25 tasks, always-on rules over budget, and `docs/generated/` files older than the source tree. Findings are suggestions with a fix; nothing is rewritten.
- `config.yaml → check` entries may be `{name, command, kind}` with `kind` in `test`, `lint`, `typecheck`, `build`, `fitness`, `check`; `keelson check` prints the name and kind, and guesses the kind for plain strings.
- `keelson validate` warns when a slice is named after a layer.
- `keelson land` names the active changes that share a capability or declared paths with the change being landed, so their owners know their delta will drift; the skill says what to do when that owner cannot be reached.
- `config.yaml` version 3; `keelson update` migrates version 1 and 2 files.

## [0.2.0] - 2026-09-19

Keelson becomes an engineering collaboration layer for long-lived projects: reviewable state, evidence tied to the code it was produced on, and continuation across sessions and people.

### Added

- Three status dimensions per change: work (`clarifying`, `in-progress`, `blocked`, `in-review`, `integrated`, `cancelled`), verification (`not-run`, `passed`, `failed`, `partial`, `stale`), release (from git tags). `keelson status` reports all three.
- Worktree fingerprint on every `Verify:` entry; verification goes stale after any code edit. `keelson check --record` runs the checks, saves output under `.keelson/.local/evidence/`, and appends the entry.
- Acceptance lists in `change.md` (`test:`, `check:`, `manual:`, `review:`), open questions with `blocks:`, and `(assumed)` decisions. `keelson land` refuses unchecked acceptance, open questions, stale evidence, unconfirmed assumptions (`--confirm-assumptions`), breaking changes without a `Rollout` section, and delta specs whose `base:` no longer matches (`--accept-drift`).
- Slices in `tasks.md` (`## Slice:` with `Delivers:`).
- `keelson handoff` and per-change `handoff.md` stamped with commit, time, and author; the session-start hook prints each active change's next step.
- `keelson impact <files>`: importers, affected specs and rules, overlapping active changes.
- `keelson new --touches`, `--depends`, `--worktree`, `--owner`; owner and branch recorded in the frontmatter; shared-contract warnings in `status` and `impact`.
- `keelson cancel`, `keelson doctor`, `keelson uninstall [--purge]`, `keelson init|update --dry-run`.
- `ROADMAP.md`, `INTENT.md → Authorizations`, `config.yaml` version 2 with `paths.specs` and `refs` (architecture, decisions, tasks, ci) detected on init; `.keelson/.local/` gitignored.
- Skill references `context.md` and `handoff.md`; skill version stamped into `SKILL.md`.

### Changed

- The skill entry routes by need instead of by phase; guidance on decision states, the stop rule, authorization, parallel work, no silent weakening of tests, collisions, and promoting learnings.
- Escalation is only for work that failed verification; dispatches that never ran (rate limits, timeouts, tool errors) are retried once and then done inline.
- Unattended sessions build under `(assumed)` decisions and stop before landing.
- `SKILL.md` lists the CLI commands the agent will use; `keelson <command> --help` prints per-command usage.
- `Dispatch:` ledger entries carry an explicit `Result: pass|fail` line; `keelson retro` counts only known results, and `keelson validate` warns when the line is missing.
- Task titles in `keelson status` no longer include prose that follows the verify command.
- The user-level `~/.keelson/` directory is never mistaken for a project root.

## [0.1.0] - 2026-09-19

Initial release.

### Added

- `keelson init` and `keelson update`: create `.keelson/` and install the skill, resident block, and hooks for Claude Code, Codex CLI, Cursor, OpenCode, and Gemini CLI.
- Project facts: `INTENT.md`, `NOW.md`, `specs/`, `rules/` with glob routing, `config.yaml`.
- Change directories with `change.md`, `tasks.md`, `ledger.md`, and delta specs; `quick` and `spec` tiers.
- `keelson context`, `new`, `status`, `validate`, `check`, `land`, `retro`.
- Effort tiers `light`, `standard`, `deep` with a bundled registry, user overrides, local detection, and optional provider catalogue refresh via `keelson models`.
- `keelson ablate` and `keelson restore` for A/B comparisons.
- `lean` and `guided` skill profiles; English and Chinese skills and docs.
- Guidance annotations with sunset conditions, read by `keelson retro`.

[0.4.1]: https://www.npmjs.com/package/@zyaiting/keelson/v/0.4.1
[0.4.0]: https://www.npmjs.com/package/@zyaiting/keelson/v/0.4.0
[0.3.0]: https://github.com/Atingaii/keelson/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/Atingaii/keelson/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/Atingaii/keelson/releases/tag/v0.1.0
