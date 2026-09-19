# Changelog

All notable changes to this project are documented here. The format follows Keep a Changelog, and the project follows Semantic Versioning.

## [Unreleased]

### Added

- Per-session focus runtime under gitignored `.keelson/.runtime/sessions/`: session pointers select durable changes but never carry completion state.
- `keelson focus [change] [--auto|--clear]`: safe agent-facing session routing with explicit degraded behavior when a host has no verified identity bridge.
- Derived work state `ready`: when acceptance/tasks, blockers/assumptions, rollout, and current-tree verification satisfy the gates, `check --record` tells the agent to land immediately without waiting for a user finish phrase.
- Claude hooks now hash the host session id, persist only an opaque local pointer, bridge `KEELSON_SESSION_ID` into later CLI commands, and keep parallel conversations isolated.
- `.keelson/README.md`: a package-owned human project map that explains what to read first, what every Keelson artifact means, and what survives landing; `keelson update` refreshes it without overwriting project facts.
- New `harness.md` skill reference: feedforward/feedback controls, mechanical invariants, repeated-failure promotion, verification baselines, and sunset conditions for model-specific guidance.

### Changed

- Conversation/session lifecycle is now independent from durable change lifecycle: closing a window, going idle, compaction, or switching focus cannot complete/cancel/land work.
- `handoff.md` is reserved for explicit ownership/machine transfer; ordinary new sessions recover from durable change state plus local focus/candidate resolution.
- Machine-local check output moved from `.keelson/.local/evidence/` to `.keelson/.runtime/evidence/`; the legacy `.local/` path remains gitignored/cleaned for compatibility.
- Platform metadata now reports session-focus capability separately from discovery support (`native` vs `degraded`).
- Fresh init is now a minimal standing control plane: `README.md`, `INTENT.md`, `NOW.md`, `config.yaml`, `manifest.json`, `workflow.md`, and `skill/`. Empty ROADMAP/GLOSSARY/rules/specs/changes trees are no longer pre-created.
- Change workspaces now grow progressively: quick changes start with `change.md` only; spec changes add `tasks.md` and behavior deltas; `ledger.md` and `handoff.md` appear only after the corresponding event or session boundary.
- The canonical Skill now routes five **conversation** intents — Explore, Change, Fix, Resume, Improve. Completion/Finish is no longer a user intent; `ready` is derived from durable gates and current-tree verification.
- Top-level CLI help now separates the small user command surface from agent workflow and advanced maintenance commands.
- README and documentation were reorganized around one golden path, with a documentation home and complete end-to-end user flow in English and Chinese.
- Generated surfaces are now reconciled as desired state through `.keelson/manifest.json`: switching hosts removes stale Keelson adapters and hook registrations without touching neighboring user files.
- Canonical skill/shim directories are replaced recoverably: the last complete directory remains available until the new one is fully populated, and interrupted temp/backup residue is recovered on the next update.
- `keelson doctor` now detects package-owned runtime, shim, managed-state, rule-file, and registered-hook drift rather than checking only file presence/version.
- `--no-hooks` is persistent (`hooks: false`) and can be reversed with `--hooks`; config schema is version 4. Fresh init falls back to portable `agents` instead of assuming Claude Code when no first-class host is detected.
- Keelson now uses a single project-local runtime root: `.keelson/workflow.md` and `.keelson/skill/` hold the canonical workflow, skill, and references. `AGENTS.md`, `CLAUDE.md`, `.agents/skills/keelson/`, and native host skill paths are discovery shims only, eliminating duplicated guidance while preserving platform discovery.
- Platform generation is now standards-first: Cursor, GitHub Copilot, and Kilo Code reuse the canonical `AGENTS.md` + `.agents/skills/` surface instead of receiving duplicate Keelson copies; Kiro keeps only its native skill path where it adds discovery, Qoder's documented skill path is retained, and speculative duplicate rule files are removed.
- The canonical `SKILL.md` is now a thin on-demand router rather than a second copy of the resident ORIENT → BOUND → BUILD → SENSE → RECONCILE loop; a repository test caps it at 60 lines.
- Markdown parsing and generated agent surfaces are now line-ending agnostic: LF and CRLF parse identically, while package-owned rendered Markdown emits LF for stable cross-platform output.
- BOUND now performs an assumption audit before ambiguous non-trivial work: established facts stay separate from plan-required assumptions, reality-owned gaps are investigated, user-owned load-bearing gaps produce one highest-value question, and material results route into existing change/spec/rule artifacts instead of a new prompt diary.
- `keelson init` is the only setup step. It auto-detects first-class hosts, writes a first-contact task that infers and confirms `INTENT.md`, and deliberately avoids a whole-repository spec/rule inventory; durable contracts grow only when real work needs them.
- Official support is intentionally narrowed to seven first-class CLI hosts — Claude Code, Codex CLI, OpenCode, Pi, Gemini CLI, Kiro CLI, and CodeBuddy CLI — plus the portable `AGENTS.md` + `.agents/skills/` fallback. First-class paths must be verified or host-documented and pass the shared lifecycle contract; guessed convention-only adapters are retired and signature-matched legacy Keelson surfaces are cleaned during update.
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
