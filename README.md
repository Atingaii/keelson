# Keelson

A load-bearing workflow layer for AI coding agents. Init once, then just talk.

[![npm version](https://img.shields.io/npm/v/keelson?style=flat-square)](https://www.npmjs.com/package/keelson)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg?style=flat-square)](LICENSE)
[![CI](https://img.shields.io/github/actions/workflow/status/Atingaii/keelson/ci.yml?branch=main&style=flat-square)](https://github.com/Atingaii/keelson/actions/workflows/ci.yml)

Keelson keeps a project's working facts in a small `.keelson/` directory: why the project exists, what is in flight, how the system behaves today, and which conventions apply to which paths. Your agent reads those facts before it works and writes new ones when it finishes. You keep talking to it the way you already do. There are no commands to type in chat.

## Why

- **Agents forget the project every session.** Conventions, decisions, and half-finished work live in chat history and vanish. Keelson keeps them in the repo, in files an agent reads in seconds.
- **Specs drift from code.** A description of "how it works" written once is wrong within a month. Keelson merges each change back into the specs, so they describe the current system.
- **Every task runs on the most expensive model.** A rename and a design decision cost the same. Keelson tags tasks with an effort tier and resolves each tier to a model alias at runtime.

## How it feels

```text
You:   Add pagination to the orders list.

Agent: Understood as: offset pagination on GET /orders (page, size, default 20)
       using the response envelope from rules/api.md; the table gets a pager,
       no infinite scroll. Assumed: sort stays created_at desc.
       Done when `npm test -- orders` passes and the pager renders.
       This is a quick change; proceeding.

       ... edits, runs tests ...

       Done: offset pagination on /orders, pager in the table.
       Evidence: `npm test -- orders` exit 0 (14 passed); `npm run lint` exit 0.
       Landed: .keelson/specs/orders updated, NOW.md rewritten.
```

Next day, new session:

```text
You:   continue

Agent: NOW.md says nothing is in flight; the last step was to watch the
       orders latency dashboard for a week. Anything new?
```

## Quick start

Requires Node.js 20 or newer.

```bash
npm install -g keelson
cd your-project
keelson init                      # Claude Code by default
keelson init --tools claude,codex # or several tools at once
```

Then:

1. Edit `.keelson/INTENT.md`. Say why the project exists and what it will not do.
2. Talk to your agent. Nothing else to type.

Existing codebase? Run `keelson init --onboard`. It sets `NOW.md` to an onboarding task; say "continue" to your agent and it drafts specs and rules from the code for you to confirm.

Claude Code users can also install the skill from the plugin marketplace:

```text
/plugin marketplace add Atingaii/keelson
/plugin install keelson@keelson
```

The CLI is still needed for `keelson init` and the other commands.

## What lives in `.keelson/`

| Path | Holds | Written by |
|---|---|---|
| `INTENT.md` | Why the project exists, boundaries, hard constraints, working defaults | You, once |
| `NOW.md` | What is in flight, what is blocked, the next step. Present tense, overwritten | The agent, at landing |
| `specs/<capability>/spec.md` | How the system behaves today: requirements, scenarios, decisions | The agent, merged at landing |
| `rules/index.md` and `rules/*.md` | Conventions routed by path glob | You and the agent |
| `changes/<name>/` | One directory per change in progress: `change.md`, `tasks.md`, `ledger.md`, delta specs | The agent |
| `config.yaml` | Tools, profile, check commands, model overrides | `keelson init` |

`changes/` is empty when nothing is in flight. When a change lands, its delta specs merge into `specs/`, its decisions fold into the spec's `Decisions` section, and the directory is removed. The ledger stays in git history.

## How it works

Three small mechanisms let the agent know what to do without being told each time.

1. **A resident block** of under 20 lines in `CLAUDE.md` or `AGENTS.md`. It says what `.keelson/` contains, how to size a change, and how to prove work is done.
2. **Two hooks** (Claude Code). One prints `NOW.md` and the active changes at session start. The other prints one line per prompt with the active change and its phase, and nothing when the project is idle. Hooks inject state, never instructions.
3. **One skill**, routed by phase. `SKILL.md` is about 50 lines. It points to one reference each for shaping, planning, building, verifying, landing, and debugging. The agent reads only the one it needs.

Nothing in the skill is a gate. Every guideline states why it exists so the agent can judge when it does not apply.

## Change sizes

The agent decides the size. You can override with "treat this as spec" or "just do it".

| Size | Signals | What happens |
|---|---|---|
| trivial | Style, typo, one-file explicit fix, no behaviour change | Just done. No change directory |
| quick | Several files, clear intent, no behaviour contract changes | Agent writes back its understanding in a few lines, creates a change, proceeds |
| spec | Behaviour contract changes, new or removed capability, abandoning the obvious approach | Agent interviews you, drafts `change.md` and delta specs, waits for approval |

Set `confirm.quick: wait` in `config.yaml` if you want to approve quick changes too.

## Effort tiers and models

Tasks in `tasks.md` carry an effort tier: `light`, `standard`, or `deep`. When the host offers subagents, the agent dispatches each task on a model resolved from its tier. Reviewers are never a lower tier than the implementer. Two failures at a tier escalate one tier.

Tiers resolve to model aliases in this order: explicit → project `config.yaml` → `~/.keelson/models.yaml` → bundled registry → platform rank fallback. The registry maps tiers to floating family aliases, never to dated model IDs. When a new model ships under an existing family, nothing changes. `keelson validate` rejects dated IDs anywhere in `.keelson/`.

```bash
keelson models                    # tier → alias for this platform
keelson models --resolve light    # prints the alias, for scripts
keelson models --refresh          # fetch the latest registry; check provider catalogues if keys are set
keelson models rank <alias> deep  # user-level override for a new family
```

See [docs/models.md](docs/models.md).

## Designed to get thinner

Every guideline in the skill references carries a hidden annotation: the failure it prevents and the condition under which it should be deleted. `keelson retro` reads every ledger, including ledgers of landed changes recovered from git history, computes root-cause counts, tier first-pass rates, and verification failures, and suggests which guidance to prune and which rules to add.

Two profiles ship from one source. `lean` (default) keeps only stance and principles. `guided` adds step lists and examples. Switch with `keelson init --profile guided`.

## Supported tools

| Tool | Skill location | Instructions file | Hooks |
|---|---|---|---|
| Claude Code (`claude`) | `.claude/skills/keelson/` | `CLAUDE.md` | Yes |
| Codex CLI (`codex`) | `.agents/skills/keelson/` | `AGENTS.md` | No |
| Cursor (`cursor`) | `.agents/skills/keelson/` | `AGENTS.md` and `.cursor/rules/keelson.mdc` | No |
| OpenCode (`opencode`) | `.agents/skills/keelson/` | `AGENTS.md` | No |
| Gemini CLI (`gemini`) | `.agents/skills/keelson/` | `GEMINI.md` | No |

Without hooks, the resident block tells the agent to run `keelson context` before non-trivial work.

## CLI

| Command | Purpose |
|---|---|
| `keelson init` | Create `.keelson/`, install the skill, resident block, and hooks |
| `keelson update` | Regenerate generated files after upgrading |
| `keelson context --paths <files>` | Print INTENT, NOW, active changes, and the rules matching the paths |
| `keelson new <name> --tier quick\|spec` | Scaffold a change directory |
| `keelson status` | Active changes, phases, tasks, NOW.md |
| `keelson validate` | Structural checks; non-zero on errors |
| `keelson check` | Run the project's check commands and report exit codes |
| `keelson land [name]` | Merge delta specs, fold decisions, remove or archive the change |
| `keelson retro` | Ledger metrics and pruning suggestions |
| `keelson models` | Resolve effort tiers to model aliases |
| `keelson ablate` / `restore` | Remove every Keelson surface for an A/B comparison, then bring it back |

Full reference: [docs/cli.md](docs/cli.md).

## Docs

- [Getting started](docs/getting-started.md)
- [How it works](docs/how-it-works.md)
- [Configuration](docs/configuration.md)
- [CLI reference](docs/cli.md)
- [Effort tiers and models](docs/models.md)
- [FAQ](docs/faq.md)
- [简体中文](README_CN.md)

## Contributing

Issues and pull requests are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md). The repository uses Keelson on itself; look in `.keelson/` for a live example.

## License

[MIT](LICENSE)
