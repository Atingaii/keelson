# Contributing

Thanks for helping. This page covers setup, layout, the two most common additions, and what a pull request needs.

## Setup

Node.js 20 or newer.

```bash
git clone https://github.com/Atingaii/keelson.git
cd keelson
npm install
npm test        # node --test tests/**/*.test.js
npm run lint    # syntax check every source file
node bin/keelson.js --help
```

To try a local build in another project without a global install:

```bash
npm pack
npm install -g --prefix ~/.local/npm ./keelson-*.tgz   # then put ~/.local/npm/bin on PATH
cd ../some-project
keelson init
```

## Layout

```text
bin/keelson.js        entry point
src/cli.js            command table and dispatch
src/commands/*.js     one file per command
src/lib/              config, paths, glob, markdown parsers, changes, git, models, health (knowledge-health findings for doctor)
src/platforms/        registry.js (what hosts) · runtime.js (canonical rendering) · integration.js (manifest/shims/hooks) · index.js facade
skills/keelson/       the English skill: SKILL.md, references/, templates/
skills/zh/keelson/    the Chinese skill, same layout
hooks/*.mjs           self-contained hook scripts copied into projects
registry/models.json  tier → alias registry
docs/                 documentation (docs/zh/ mirrors it)
tests/                node:test suites
.keelson/             this repository's own facts
```

The repository uses Keelson on itself. `.keelson/INTENT.md` states what the project is for and what the agent may decide alone; `.keelson/specs/` describes the CLI's behaviour; non-trivial pull requests come with a change directory, landed in the same pull request.

## How the pieces fit

- `src/lib/markdown.js` is the only place that parses the Markdown shapes (tasks, slices, acceptance, open questions, decisions, ledger entries, specs, deltas, handoffs). Templates under `skills/*/templates/` and the parsers must stay in step; a heading the parser recognises is part of the contract.
- `src/lib/changes.js` derives work status and verification status; `src/lib/git.js` computes the worktree fingerprint, tags, folded changes, and importers.
- `src/commands/land.js` exports `landingBlockers`, the single list of reasons a landing is refused. `doctor` and `land` share it.
- `hooks/*.mjs` have no imports beyond Node built-ins; they run in projects where the CLI is not installed.
- `src/platforms/registry.js` owns the first-class host contract; `runtime.js` renders the canonical workflow/Skill; `integration.js` owns manifest reconciliation, discovery shims, hooks, migration, and removal. `index.js` only re-exports the stable platform API.

## Artifact rule

Do not create a new standing document or change artifact because a template exists. A file should appear only when it carries information another session/person needs. Fresh init stays minimal; quick changes may have only `change.md`; ledger and handoff are event-driven.

## Adding a first-class host adapter

First-class support is intentionally expensive. Do not add a host because a directory name looks plausible.

1. Start from the host's current primary documentation (or a real maintained session) for its project instruction file and Agent Skills discovery path. No `convention`-only first-class entries.
2. Prefer the portable `AGENTS.md` + `.agents/skills/` surface when the host documents it. Add a native path only when it adds discovery the portable layer does not provide.
3. Add the host to `registry/platforms.json` with `support: first-class`, a CLI `bin`, and `confidence: verified|documented`; keep the canonical workflow and skill under `.keelson/`.
4. Add/update the host in `registry/models.json` only for stable capability facts; never guess release-specific model IDs.
5. The shared platform-contract test must pass: init, canonical single-root runtime, discovery-only shim, `doctor`, update reconciliation, uninstall ownership, and Windows/macOS/Linux CI.
6. Update English and Chinese support tables. State the evidence level honestly; documented discovery is not the same claim as an end-to-end exercised workflow.

Hosts outside the first-class matrix should use the portable `agents` fallback until they meet this bar. Retired adapters go into the signature-matched migration list so existing users are cleaned up without deleting unrelated files.
## Adding a registry entry

Edit `registry/models.json`:

- `platforms.<id>.rank`: family aliases from least to most capable.
- `platforms.<id>.tiers`: recommended `light`, `standard`, `deep` aliases. Leave empty if the tool has no stable aliases.
- `platforms.<id>.subagents`: whether the tool can dispatch subagents.
- Bump `updated` to today's date; `keelson models --refresh` uses it to decide whether the remote copy is newer.

Aliases only. Never a dated model ID; `tests/` checks this.

## Changing agent guidance

Every guideline in `skills/keelson/references/*.md` carries `<!-- keelson: id=… | without: … | sunset: … -->`. A guideline that cannot say what failure it prevents does not go in; one that cannot say when it should be deleted says `sunset: never` and explains why in the text. Optional depth goes inside `<!-- guided -->…<!-- /guided -->`. `SKILL.md` stays under 60 lines. Change the Chinese mirror in the same pull request; a test checks that both mirrors carry the same ids.

## Pull requests

- Tests for behaviour changes. `npm test` must pass, and `node bin/keelson.js validate` on this repository.
- Docs for user-visible changes, in both `docs/` and `docs/zh/`.
- No dated model IDs anywhere in the repository.
- A change directory under `.keelson/changes/` for non-trivial work, with acceptance items and a `Verify:` entry from `keelson check --record`, landed in the same pull request so `.keelson/specs/` stays true.
- `CHANGELOG.md` gets a line under Unreleased.

Open an issue first for anything that changes the `.keelson/` layout, the ledger format, the config schema, or the landing gates.
