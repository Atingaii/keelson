# Changelog

All notable changes to this project are documented here. The format follows Keep a Changelog, and the project follows Semantic Versioning.

## [Unreleased]

### Changed

- `keelson init` is the only step. It auto-detects the coding tools installed on the machine when none is named, accepts one flag per tool (`--claude`, `--cursor`, `--kiro`, …) or `--tools a,b`, and writes a first-contact task into `NOW.md` so the agent drafts `INTENT.md` (and specs and rules for an existing codebase) and confirms them with the owner. The user is never asked to edit `INTENT.md` by hand; `--onboard` is no longer needed.
- Supported tools grow from five to twenty-two, defined in `registry/platforms.json` with per-tool instruction and skill locations, a rules file where the tool has one, a Kiro steering format, and a confidence label (verified, documented, convention). Every non-Claude selection also installs the cross-tool layer (`AGENTS.md` + `.agents/skills/`). Paths can be overridden per project under `config.yaml → platforms.<id>`.
- New `keelson platforms` command lists the tools, their locations, and which are installed or configured.
- The binary no longer calls `process.exit()` after printing, which truncated large `--json` output on macOS.

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

[Unreleased]: https://github.com/Atingaii/keelson/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/Atingaii/keelson/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/Atingaii/keelson/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/Atingaii/keelson/releases/tag/v0.1.0
