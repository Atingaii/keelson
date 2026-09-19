# Configuration

Two places hold configuration. `.keelson/config.yaml` is per project and committed. `~/.keelson/` is per user and never committed.

## `.keelson/config.yaml`

Every key is optional. `keelson init` writes the defaults. Unknown keys are ignored.

```yaml
version: 1
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
  - npm run test
context: ""
models: {}
effort:
  review_min: standard
  plan_min: deep
  verify_min: deep
  escalate_after: 2
```

| Key | Default | Meaning |
|---|---|---|
| `version` | `1` | Config schema version |
| `tools` | `[claude]` | Tools to generate files for. One or more of `claude`, `codex`, `cursor`, `opencode`, `gemini`. `keelson init --tools` sets it |
| `lang` | `en` | Language of the installed skill and templates: `en` or `zh`. `keelson init --lang` sets it |
| `profile` | `lean` | `lean` ships stance and principles only. `guided` keeps the extra step lists and examples. `keelson init --profile` sets it |
| `default_tier` | `auto` | Informational. `auto` means the agent sizes each change. Set `quick` or `spec` to state a preference in the file the agent reads |
| `confirm.quick` | `proceed` | `proceed`: the agent writes back its understanding and starts. `wait`: it waits for approval first |
| `confirm.spec` | `wait` | Spec changes always wait unless you set `proceed` |
| `land` | `fold` | `fold` removes the change directory after merging. `keep` moves it to `changes/archive/` |
| `check` | detected | Commands `keelson check` runs, in order, from the project root through the shell. Detected from `package.json` scripts, `pyproject.toml`, `go.mod`, or `Cargo.toml` on first init |
| `context` | `""` | Free text printed at the top of `keelson context` output. Use it for facts that do not fit INTENT.md, such as a tech stack summary |
| `models` | `{}` | Project-level tier overrides. Either `models: { deep: opus }` for all platforms or `models: { claude: { deep: opus } }` per platform. Aliases only |
| `effort.review_min` | `standard` | Lowest tier for a reviewer subagent |
| `effort.plan_min` | `deep` | Lowest tier for drafting `change.md` and delta specs |
| `effort.verify_min` | `deep` | Lowest tier for the final fresh-reader review on spec changes |
| `effort.escalate_after` | `2` | Failures at one tier before re-dispatching one tier up |

`keelson validate` errors on a `profile` or `land` value outside the allowed set.

## `.keelson/INTENT.md` working defaults

`INTENT.md` ends with a `Working defaults` section. It is prose the agent reads, not parsed config. Use it to state the same preferences in words, for example "treat anything touching `payments/` as spec". The two files should agree; `config.yaml` is what the CLI enforces.

## `~/.keelson/`

| File | Written by | Purpose |
|---|---|---|
| `models.yaml` | `keelson models rank <alias> <tier>` | User-level tier overrides, `platform → tier → alias`. Takes precedence over the registry, below project config |
| `models.cache.json` | `keelson init`, `keelson models --detect`, `--refresh` | Installed tools and versions, configured default models, which provider keys are present, models seen in provider catalogues, unranked models. Considered stale after 24 hours |
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
