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
src/platforms/        per-tool generators (skill dir, instructions file, hooks)
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
- `src/platforms/index.js` renders the canonical `.keelson/skill/` (profile applied, version stamped), the canonical workflow, and one-file host discovery shims for installation and `--dry-run`.

## Adding a platform generator

1. Add an entry to `PLATFORMS` in `src/platforms/index.js` with `label`, `instructions` (the file that gets the discovery block), `skillsDir` (where the one-file skill shim is discovered), optional `rulesFile`, and `hooks` (true only if the tool runs hooks the way Claude Code does). The canonical workflow and skill always remain under `.keelson/`.
2. If the tool needs a different file shape, extend `installInstructions`.
3. Add the tool's CLI name to `detectLocal` in `src/lib/models.js` and a platform entry to `registry/models.json`.
4. Add a row to the supported tools table in `README.md` and `README_CN.md`.
5. Add a test in `tests/` that runs `init --tools <id>` in a temporary directory and asserts the files.

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
