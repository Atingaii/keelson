# Changelog

All notable changes to this project are documented here. The format follows Keep a Changelog, and the project follows Semantic Versioning.

## [Unreleased]

### Changed

- Escalation is only for work that failed verification; dispatches that never ran (rate limits, timeouts, tool errors) are retried once and then done inline.
- New guidance for unattended sessions: build under stated assumptions, stop before landing.
- `SKILL.md` lists the CLI commands the agent will use; `keelson <command> --help` prints per-command usage.
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

[Unreleased]: https://github.com/Atingaii/keelson/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/Atingaii/keelson/releases/tag/v0.1.0
