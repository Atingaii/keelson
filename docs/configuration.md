# Configuration

Two places hold configuration. `.keelson/config.yaml` is per project and committed. `~/.keelson/` is per user and never committed.

## `.keelson/config.yaml`

Every key is optional. `keelson init` writes the defaults. Unknown keys are ignored.

```yaml
version: 3
tools:
  - claude
lang: en
profile: lean
default_tier: auto
confirm:
  quick: proceed
  spec: wait
land: fold
check:
  - npm run lint
  - name: unit
    command: npm run test
    kind: test
  - name: boundaries
    command: npm run test:architecture
    kind: fitness
guide: false
budgets:
  INTENT: 120
  ROADMAP: 80
  NOW: 60
  GLOSSARY: 200
  spec: 250
  rule: 120
  change: 200
  handoff: 100
  always-on: 300
context: ""
paths:
  specs: .keelson/specs
refs:
  architecture: null
  decisions: docs/adr
  tasks: https://github.com/acme/shop/issues
  ci: .github/workflows
models: {}
effort:
  review_min: standard
  plan_min: deep
  verify_min: deep
  escalate_after: 2
```

| Key | Default | Meaning |
|---|---|---|
| `version` | `3` | Config schema version. Older files are migrated in memory on every read and rewritten by `keelson update` |
| `tools` | `[claude]` | Tools to generate files for. One or more of `claude`, `codex`, `cursor`, `opencode`, `gemini`. `keelson init --tools` sets it |
| `lang` | `en` | Language of the installed skill and templates: `en` or `zh`. `keelson init --lang` sets it |
| `profile` | `lean` | `lean` ships stance and principles only. `guided` keeps the extra step lists and examples. `keelson init --profile` sets it |
| `default_tier` | `auto` | Informational. `auto` means the agent sizes each change. Set `quick` or `spec` to state a preference in the file the agent reads |
| `confirm.quick` | `proceed` | `proceed`: the agent writes back its understanding and starts. `wait`: it waits for approval first |
| `confirm.spec` | `wait` | Spec changes always wait unless you set `proceed` |
| `land` | `fold` | `fold` removes the change directory after merging. `keep` moves it to `changes/archive/` |
| `check` | detected | What `keelson check` runs, in order, from the project root through the shell. Each entry is a command string, or an object `{name, command, kind}` where `kind` is one of `test`, `lint`, `typecheck`, `build`, `fitness`, `check`. For a plain string the kind is guessed from the command. Detected from `package.json` scripts, `pyproject.toml`, `pytest.ini`, `go.mod`, or `Cargo.toml` on first init |
| `guide` | `false` | `true` when the owner is learning engineering. Adds a guided-mode line to the resident block and a note to `keelson context`; the skill then explains with scenarios and trade-offs and closes spec changes with a short teaching note. `keelson init --guide` sets it |
| `budgets` | see below | Line budgets per document type. `keelson doctor` reports a document over its budget and asks for a compaction; nothing is rewritten automatically |
| `context` | `""` | Free text printed at the top of `keelson context` output. Use it for facts that do not fit INTENT.md, such as a tech stack summary |
| `paths.specs` | `.keelson/specs` | Directory of behaviour contracts, one `<capability>/spec.md` each. Point it at an existing contracts directory to reuse it |
| `refs.architecture` | detected | Path to architecture notes, referenced by `keelson context`, never copied |
| `refs.decisions` | detected | Path to the decision record directory |
| `refs.tasks` | detected | URL or path of the issue tracker. The tracker stays authoritative for what is wanted |
| `refs.ci` | detected | Path to CI configuration |
| `models` | `{}` | Project-level tier overrides. Either `models: { deep: opus }` for all platforms or `models: { claude: { deep: opus } }` per platform. Aliases only |
| `effort.review_min` | `standard` | Lowest tier for a reviewer subagent |
| `effort.plan_min` | `deep` | Lowest tier for drafting `change.md` and delta specs |
| `effort.verify_min` | `deep` | Lowest tier for the final fresh-reader review on spec changes |
| `effort.escalate_after` | `2` | Failures at one tier before re-dispatching one tier up |

`keelson validate` errors on a `profile` or `land` value outside the allowed set, and warns when `paths.specs` or a local `refs.*` path does not exist.

### Document budgets

| Key | Default | Applies to |
|---|---|---|
| `INTENT` | `120` | `.keelson/INTENT.md` |
| `ROADMAP` | `80` | `.keelson/ROADMAP.md` |
| `NOW` | `60` | `.keelson/NOW.md` |
| `GLOSSARY` | `200` | `.keelson/GLOSSARY.md` |
| `spec` | `250` | each `<paths.specs>/<capability>/spec.md` |
| `rule` | `120` | each file listed in `rules/index.md` |
| `change` | `200` | each active `change.md` |
| `handoff` | `100` | each active `handoff.md` |
| `always-on` | `300` | the rule files routed by `**` or `*`, added together, because every session reads them |

Budgets are in lines. Crossing one is a signal to compact that document (rewrite in the present tense, split by capability or scope, delete what git already keeps, move a checkable rule into `check:`), never an error. Set a key to `0` to disable that budget.

### Check kinds

`fitness` marks a check that turns an architecture or quality constraint into a command: a dependency-direction test, an interface compatibility check, a latency budget. `keelson check` prints the name and kind next to each result, and the skill's `verify.md` reference treats the full set as mechanical evidence, which is necessary and never sufficient.

### Migration

A `version: 1` file gains `paths` and `refs` with defaults; a `version: 2` file gains `guide` and `budgets`. Every command reads older files correctly without changes; `keelson update` rewrites them as version 3, and `keelson doctor` reminds you until then. `keelson update --dry-run` shows the pending migration.

## `.keelson/INTENT.md`

Not configuration, but the file that decides how much the agent may do alone. The template's `Authorizations` section has three lines:

- **Decides alone**: local implementation choices inside a confirmed scope; test structure; naming that follows existing patterns.
- **Recommends, owner decides**: anything that changes user-visible behaviour, scope, or a long-term commitment; new dependencies; public interface changes.
- **Always confirms**: irreversible data operations, production changes, permission widening, breaking compatibility.

Edit the lines to fit the project. The `Working defaults` section states the sizing and approval preferences in words; `config.yaml` is what the CLI enforces, and the two should agree.

## Change frontmatter

`keelson new` writes these keys into `change.md`:

| Key | Set by | Meaning |
|---|---|---|
| `tier` | `--tier` | `quick` or `spec` |
| `created` | date | Creation date |
| `status` | `new`, `land --keep`, `cancel`, or the agent | Work status: `clarifying`, `in-progress`, `blocked`, `in-review`, `integrated`, `cancelled`. Explicit values win over derived ones |
| `owner` | git user name, or `--owner` | Who is driving the change |
| `branch` | current branch, or the worktree branch | Where the work happens |
| `worktree` | `--worktree` | Relative path of the worktree created for the change |
| `depends` | `--depends a,b` | Active changes this one waits on |
| `touches` | `--touches globs` | Path globs the change will edit; used for shared-contract warnings and impact |
| `release` | the agent | Free text shown in `status`; `unreleased` when absent |

## `~/.keelson/`

| File | Written by | Purpose |
|---|---|---|
| `models.yaml` | `keelson models rank <alias> <tier>` | User-level tier overrides, `platform → tier → alias`. Above the registry, below project config |
| `models.cache.json` | `keelson init`, `keelson models --detect`, `--refresh` | Installed tools and versions, configured default models, which provider keys are present, models seen in provider catalogues, unranked models. Stale after 24 hours |
| `registry.json` | `keelson models --refresh` | A newer copy of the bundled registry, used when its `updated` date is later |
| `ablations/<hash>/` | `keelson ablate` | The stashed files and manifest for one project. Removed by `keelson restore` |

## Environment variables

| Variable | Effect |
|---|---|
| `ANTHROPIC_MODEL`, `OPENAI_MODEL` | Reported as the tool's default model by `keelson models --detect` |
| `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY` | Their presence is recorded by detection. `--refresh` uses the first two to query provider catalogues |
| `CLAUDE_PROJECT_DIR` | Set by Claude Code; the hooks use it to find the project |
| `NO_COLOR` | Disables coloured CLI output |
| `KEELSON_DEBUG` | Prints stack traces on errors |
