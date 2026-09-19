# Contributing

Thanks for helping. This page covers setup, layout, the two most common additions, and what a pull request needs.

## Setup

Node.js 20 or newer.

```bash
git clone https://github.com/Atingaii/keelson.git
cd keelson
npm install
npm test        # node --test tests/
npm run lint    # syntax check every source file
node bin/keelson.js --help
```

To try a local build in another project:

```bash
npm link
cd ../some-project
keelson init
```

## Layout

```text
bin/keelson.js        entry point
src/cli.js            command table and dispatch
src/commands/*.js     one file per command
src/lib/              config, paths, glob, markdown parsers, changes, git, models
src/platforms/        per-tool generators (skill dir, instructions file, hooks)
skills/keelson/       the English skill: SKILL.md, references/, templates/
skills/zh/keelson/    the Chinese skill, same layout
hooks/*.mjs           self-contained hook scripts copied into projects
registry/models.json  tier → alias registry
docs/                 documentation (docs/zh/ mirrors it)
tests/                node:test suites
.keelson/             this repository's own facts
```

The repository uses Keelson on itself. `.keelson/INTENT.md` states what the project is for; `.keelson/specs/` describes the CLI's behaviour; non-trivial pull requests come with a change directory.

## Adding a platform generator

1. Add an entry to `PLATFORMS` in `src/platforms/index.js` with `label`, `instructions` (the file that gets the resident block), `skillsDir`, optional `rulesFile`, and `hooks` (true only if the tool runs hooks the way Claude Code does).
2. If the tool needs a different file shape, extend `installInstructions`.
3. Add a row to the supported tools table in `README.md` and `README_CN.md`.
4. Add a test in `tests/` that runs `init --tools <id>` in a temporary directory and asserts the files.

## Adding a registry entry

Edit `registry/models.json`:

- `platforms.<id>.rank`: family aliases from least to most capable.
- `platforms.<id>.tiers`: recommended `light`, `standard`, `deep` aliases. Leave empty if the tool has no stable aliases.
- `platforms.<id>.subagents`: whether the tool can dispatch subagents.
- Bump `updated` to today's date; `keelson models --refresh` uses it to decide whether the remote copy is newer.

Aliases only. Never a dated model ID; `tests/` checks this.

## Pull requests

- Tests for behaviour changes. `npm test` must pass.
- Docs for user-visible changes, in both `docs/` and `docs/zh/`.
- No dated model IDs anywhere in the repository.
- A change directory under `.keelson/changes/` for non-trivial work, landed in the same pull request so `.keelson/specs/` stays true.
- Keep skill references short. Each guideline needs its `<!-- keelson: id=… | without: … | sunset: … -->` annotation; a guideline that cannot say what it prevents does not go in.
- `CHANGELOG.md` gets a line under Unreleased.

Open an issue first for anything that changes the `.keelson/` layout or the ledger format.
