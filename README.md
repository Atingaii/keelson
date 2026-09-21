<p align="center"><img src="https://raw.githubusercontent.com/Atingaii/keelson/main/docs/assets/keelson-banner.png" alt="Keelson" width="620"></p>

<p align="center"><strong>Start with a conversation. Leave work the next session can build on.</strong></p>
<p align="center">Project memory, engineering guidance, and acceptance checks for your coding agent. Describe the outcome; keep decisions and verification alongside the code.</p>

<p align="center">
<a href="README_CN.md">简体中文</a> ·
<a href="#quick-start">Quick start</a> ·
<a href="docs/README.md">Documentation</a> ·
<a href="docs/platforms.md">Agent support</a>
</p>

<p align="center">
<a href="https://github.com/Atingaii/keelson/actions/workflows/ci.yml"><img src="https://github.com/Atingaii/keelson/actions/workflows/ci.yml/badge.svg?branch=main" alt="CI"></a>
<a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="MIT license"></a>
</p>

<p align="center"><img src="https://raw.githubusercontent.com/Atingaii/keelson/main/docs/assets/keelson-demo.gif" alt="Real agent conversation replay: a task-filter request followed by implementation, verification, and archiving" width="100%"></p>
<p align="center"><sub>Initialized example repository · Translated excerpts from a real session, with waits shortened · Just describe the task</sub></p>

## Why Keelson?

Coding agents can write code. Ongoing development also needs shared context, clear boundaries, and a reliable way to establish that work is done.

| A familiar problem | How Keelson helps |
| --- | --- |
| Every new session starts with another project explanation | Goals, decisions, and unfinished work stay in the repository for the next session. |
| Implementation starts before the request is understood | The agent reads existing code, defines acceptance, and asks about decisions that change the direction. |
| The code is written, but completion is unclear | Check records track the inputs they verified, keeping implementation, verification, and completion distinct. |
| The page works, but its design and interactions feel unfinished | Design guidance covers typography, color, feedback, responsive behavior, and accessibility, with browser acceptance. |

Keelson combines an **Agent Skill + local CLI**. The skill guides the agent's work; the CLI manages project state and verification records. Use it for features, bug fixes, refactoring, and frontend improvements.

## Requirements

- **Node.js 20+**, npm, and Git.
- A coding agent that can read project files, make changes, and run commands.
- A local project directory; Git is recommended for tracking code and project knowledge.

Keelson generates integrations for Codex, Claude Code, OpenCode, Gemini CLI, and other hosts. See [Agent support](docs/platforms.md) for capabilities and validation coverage.

## Quick start

**1. Install the CLI:**

```bash
npm install -g @zyaiting/keelson
```

**2. Initialize your project**, using Codex here:

```bash
cd /path/to/your/project
keelson init --codex
```

**3. Open your agent in that directory and describe the task.** Initialize once, then keep working through conversation.

> Add a priority filter to the task list: show everything by default, with an option for high-priority tasks only. Keep existing calls compatible, add tests, and verify the result.

To upgrade, run `npm install -g @zyaiting/keelson@latest`, then `keelson update` in your project. See the [setup guide](docs/getting-started.md) and [supported agents](docs/platforms.md).

## From request to completion

**Understand → Scope → Implement and verify → Archive and resume**

The agent loads relevant guidance, maintains acceptance criteria, and runs project checks. It wraps up when the gates pass, asking for your input when a choice changes the plan. Small edits stay lightweight.

You can also ask:

- **Explore:** “Find where this feature belongs. Don't change code yet.”
- **Improve an interface:** “Polish the settings page, keep our brand, preserve input when saving fails, and check the mobile flow.”
- **Resume:** “Continue the previous change. First check what's left.”

Frontend work has 22 composable [design actions](docs/frontend.md), discoverable with `keelson design`, including critique, simplification, polish, and adaptation. Checking the actual interface requires the agent to use a browser.

## What stays in your project?

Initialization creates a small foundation. Further documents appear as the work needs them:

| Location | Purpose |
| --- | --- |
| `.keelson/INTENT.md`, `.keelson/NOW.md` | Project goals, constraints, and current progress. |
| `.keelson/config.yaml` | Project check commands and workflow configuration. |
| `.keelson/changes/`, `.keelson/specs/`, `.keelson/rules/` | Changes, behavior contracts, and project rules created as needed. |
| Host entry points such as `AGENTS.md` | Direct the agent to Keelson. |

Guidance comes from the installed package by default. Use `--vendor` when you want to commit a copy alongside your project. See [configuration](docs/configuration.md) for paths and options.

## Engineering principles

- **Start with the problem.** Establish outcomes, constraints, and invariants before choosing mechanisms. Additional complexity must earn its place.
- **Load and retain what matters.** Small edits move directly; larger work adds contracts and plans. Preserve knowledge the next change will need.
- **Build through feedback.** Use small steps, independent review, and focused checks. Record test results separately from browser observations.
- **Ground completion in evidence.** Check records are tied to verified inputs; changed code needs fresh verification. Ending a conversation does not finish a task.

Review commands in `.keelson/config.yaml` before their first execution. The agent runs and records checks with `keelson check --trust --record`; passing exit codes still need an acceptance review. See [verification and trust](docs/verification.md).

## Documentation and contributing

[Documentation](docs/README.md) · [CLI reference](docs/cli.md) · [Frontend design](docs/frontend.md) · [Contributing](CONTRIBUTING.md) · [Report an issue](https://github.com/Atingaii/keelson/issues) · [MIT](LICENSE)
