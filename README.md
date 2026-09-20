<p align="center"><img src="docs/assets/keelson-banner.png" alt="Keelson — a keel-shaped navy and copper project mark" width="100%"></p>

# Keelson

**Project memory, design guidance, and verified changes for your coding agent.**

[![CI](https://github.com/Atingaii/keelson/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/Atingaii/keelson/actions/workflows/ci.yml)
[![Node.js 20+](https://img.shields.io/badge/Node.js-20%2B-417e38)](package.json)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

[中文](README_CN.md) · [Quick start](#quick-start) · [Frontend design](#frontend-design) · [Documentation](docs/README.md)

Keelson is a **local CLI + Agent Skill** for working on real projects with a coding agent. It keeps project intent, decisions, acceptance criteria, and check results in your repository so work can continue across conversations. Your agent uses focused guidance to plan, build, review, and verify each change.

- **Pick up where you left off.** Keep project context and settled decisions alongside the code.
- **Work at the right scale.** Use lightweight changes for small fixes and explicit behavior contracts for larger work.
- **Improve the whole interface.** Apply design guidance to visual hierarchy, copy, interaction states, accessibility, and responsive behavior.
- **Know what was checked.** Record the commands that ran and the code they checked; changed inputs make the record stale.

Works with your existing code and test tools. The CLI runs locally, with no account, telemetry, or model API calls.

## Quick start

Requires **Node.js 20+**. Install from this repository:

```bash
git clone https://github.com/Atingaii/keelson.git
cd keelson
npm ci
npm link
```

Then initialize the project you want to work on:

```bash
cd /path/to/your/project
keelson init --codex
```

Open your coding agent in that project and make a normal request:

> Improve the settings page. Keep the existing brand, preserve entered values when saving fails, and check the mobile and keyboard flows.

The agent reads `keelson guide`, inspects the project, records the intended outcome, and loads the guidance needed for the task. On the first change, it should also configure your existing test, lint, or build commands in `.keelson/config.yaml`. Review those commands before allowing execution.

**Initialize once, then keep working through conversation.** The agent handles the change workflow; use `keelson status` to see progress and blockers.

`npm link` uses this local checkout, so keep it in place. See the [full walkthrough](docs/getting-started.md) for configuration and your first completed change.

## How work moves forward

1. **Understand the project.** Read its code, constraints, and existing decisions. Ask for user input when a choice needs it.
2. **Define the change.** Write the intended result and observable acceptance criteria. Add behavior contracts when the scope calls for them.
3. **Build and review.** Implement the change, review the diff, and exercise the affected behavior. Interface work includes browser checks when tools are available.
4. **Verify and retain the result.** Run the configured checks, resolve acceptance items and decisions, and archive the completed change with its evidence.

Project notes grow with the work. A small fix can stay small; a feature spanning several sessions can leave enough context for the next agent to continue. [Everyday workflow →](docs/user-flow.md)

## Frontend design

Keelson includes **22 design actions**, with guidance in English and Chinese. Ask for the outcome in conversation, or inspect a focused brief:

```bash
keelson design                               # list all design actions
keelson design audit "checkout flow"
keelson design harden "settings form"
keelson design polish "dashboard"
keelson design adapt "order table"
```

| Work on | Actions |
| --- | --- |
| Direction and implementation | `plan`, `build`, `explore` |
| Review and finishing | `audit`, `critique`, `polish` |
| Visual hierarchy and expression | `simplify`, `bolder`, `quieter`, `typeset`, `color`, `layout` |
| Motion and detail | `animate`, `delight` |
| Copy and user journeys | `clarify`, `onboard`, `harden` |
| Adaptation and delivery | `adapt`, `optimize`, `extract`, `document`, `iterate` |

For a settings form, that means checking retained input, failed saves, retry, and duplicate submissions alongside typography and layout. For a landing page, it means a clear primary action, readable mobile content, and a coherent visual direction.

The CLI prints guidance; your agent implements it and uses the host's available browser tools to inspect and test the result. Browser scenarios that could not be exercised remain unverified. [Frontend design guide →](docs/frontend.md)

## What initialization adds

For `keelson init --codex`, the managed files are:

```text
your-project/
├── AGENTS.md                       # short entry for the agent
├── .agents/skills/keelson/SKILL.md   # on-demand skill entry
└── .keelson/
    ├── README.md                   # guide to project records
    ├── INTENT.md                   # purpose and constraints
    ├── NOW.md                      # current state and next work
    ├── config.yaml                 # host, language, and check commands
    └── manifest.json               # managed integration files
```

Your source stays where it is. Existing `AGENTS.md` content is preserved. `changes/`, `specs/`, `rules/`, and additional project notes are added **when the work needs them**; initialization does not create a full set of empty documents.

Guidance normally comes from the installed package. Add `--vendor` only to keep a versioned copy at `.keelson/workflow.md` and `.keelson/skill/`. All design actions are available without it.

Project knowledge and change evidence can be shared through Git. Machine-local keys, trust, and session state live in Git's private directory, or in a user cache for non-Git projects. [Project structure and concepts →](docs/concepts.md)

## Everyday commands

| Command | Purpose |
| --- | --- |
| `keelson status` | See active changes, readiness, and blockers |
| `keelson doctor` | Diagnose project setup and host integration |
| `keelson guide --list` | Discover available guidance |
| `keelson update` | Refresh the project's integration files |
| `keelson uninstall` | Remove the integration, retaining project knowledge and evidence |

<details>
<summary>Run a change manually</summary>

```bash
keelson new fix-pagination --tier quick
# Define acceptance in change.md, implement the fix, and verify each criterion.
# Set your project's check commands in .keelson/config.yaml and review them.
keelson check --trust --record
keelson status
keelson land fix-pagination
```

`--trust` authorizes the configured shell commands locally. Changed commands require renewed trust. `land` archives a change only when its acceptance, decisions, dependencies, and current complete check evidence satisfy the gates; it does not commit or push Git changes.

Signed records connect local check results to their inputs. They do not establish whether a test was sufficient or protect against a process with the same user privileges. [Evidence, trust, and recovery →](docs/verification.md)

</details>

## Agent support

Codex session identity has been exercised locally. Integrations are also available for Claude Code, OpenCode, Gemini CLI, Kiro CLI, CodeBuddy, Pi, and portable Agent Skills. These have adapter contract tests; live end-to-end behavior has not been verified on every host. Run `keelson doctor` in your environment and see [platform setup and support](docs/platforms.md).

## Documentation and contributing

- [Getting started](docs/getting-started.md) — install, configure checks, and complete a change.
- [Configuration](docs/configuration.md) · [CLI reference](docs/cli.md) · [FAQ](docs/faq.md).
- [How it works](docs/how-it-works.md) · [Evidence and trust](docs/verification.md).
- [Contributing](CONTRIBUTING.md) · [Changelog](CHANGELOG.md) · [MIT license](LICENSE).

To work on Keelson itself:

```bash
npm ci
npm run lint
npm test
npm run validate
npm pack --dry-run
```
