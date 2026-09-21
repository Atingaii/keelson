<p align="center"><img src="https://raw.githubusercontent.com/Atingaii/keelson/main/docs/assets/keelson-banner.png" alt="Keelson" width="620"></p>

<p align="center"><strong>Clarify the goal. Build to the contract. Keep what you learn.</strong></p>
<p align="center">Project memory, engineering guidance, and acceptance checks for your coding agent. Describe the outcome; keep decisions and verification alongside the code.</p>

<p align="center">
<a href="https://github.com/Atingaii/keelson/blob/main/README_CN.md">简体中文</a> ·
<a href="#quick-start">Quick start</a> ·
<a href="https://github.com/Atingaii/keelson/blob/main/docs/README.md">Documentation</a> ·
<a href="https://github.com/Atingaii/keelson/blob/main/docs/platforms.md">Agent support</a>
</p>

<p align="center">
<a href="https://www.npmjs.com/package/@zyaiting/keelson"><img src="https://img.shields.io/npm/v/%40zyaiting%2Fkeelson" alt="npm version"></a>
<a href="https://github.com/Atingaii/keelson/actions/workflows/ci.yml"><img src="https://github.com/Atingaii/keelson/actions/workflows/ci.yml/badge.svg?branch=main" alt="CI"></a>
<a href="https://github.com/Atingaii/keelson/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="MIT license"></a>
</p>

## Why Keelson?

Keelson brings software engineering practices into everyday agent conversations: agree on the outcome, preserve the reasoning, and check the result. It addresses four recurring problems.

**1. The agent builds the wrong thing.**

“Add a filter” leaves room for different defaults, edge cases, and compatibility choices. Keelson guides the agent to inspect the code, automatically investigate unclear goals and connected decisions, then turn the request into concrete acceptance examples before implementation. This applies **behaviour-driven development**: use examples to expose disagreement early, asking only about choices that affect the direction.

**2. Every session needs the same explanation.**

The next agent sees the code but may miss what “member” means or why an alternative was rejected. Keelson keeps domain terms, decisions, and unfinished work alongside the code. **Ubiquitous language** and **decision records** give later sessions shared vocabulary and reasons to work from, reducing repeated explanations.

**3. “Done” does not say what was checked.**

A passing test can miss the requested behaviour; an old result can describe old code. Keelson guides small implementation steps and acceptance review, and ties check records to the inputs they verified. **Short feedback loops** become a concrete completion gate: missing or stale verification blocks normal archiving.

**4. The page works, but using it feels rough.**

Unclear feedback, lost form input, and awkward mobile controls are usability problems. Keelson turns **usability heuristics** into guidance for hierarchy, interaction, responsive behaviour, and accessibility. The agent reviews the actual interface in a browser and checks real interactions, alongside code checks.

Keelson combines an **Agent Skill + local CLI**. The skill guides the agent's work; the CLI manages project state and verification records. Use it for features, bug fixes, refactoring, and frontend improvements.

## Requirements

- **Node.js 20+**, npm, and Git.
- A coding agent that can read project files, make changes, and run commands.
- A local project directory; Git is recommended for tracking code and project knowledge.

Claude Code, Codex CLI and CodeBuddy CLI are the primary supported hosts. Keelson also generates integrations for other coding agents. See [Agent support](https://github.com/Atingaii/keelson/blob/main/docs/platforms.md) for capabilities and validation coverage.

## Quick start

**1. Install the CLI:**

```bash
npm install -g @zyaiting/keelson
```

**2. Initialize your project**, selecting your CLI:

```bash
cd /path/to/your/project
keelson init --claude     # Claude Code
# or: keelson init --codex
# or: keelson init --codebuddy
```

**3. Open your agent in that directory and describe the task.** Initialize once, then keep working through conversation.

> Add a priority filter to the task list.

To upgrade, run `npm install -g @zyaiting/keelson@latest`, then `keelson update` in your project. See the [setup guide](https://github.com/Atingaii/keelson/blob/main/docs/getting-started.md) and [supported agents](https://github.com/Atingaii/keelson/blob/main/docs/platforms.md).

## From request to completion

**Investigate → Decide → Implement → Independently review → Verify → Preserve knowledge**

After initialization, ordinary requests trigger the relevant workflow automatically: investigate requirements, clarify material choices with recommendations, apply engineering and UI/UX guidance, implement, verify, and preserve the result for later sessions. You do not need to name a skill or manage workflow commands. Clear edits use a minimal change record. A simple gap gets one question; connected uncertainties get the whole ready decision frontier, with recommendations and reasons for each choice. The agent resumes authorized work once those choices are settled. It distinguishes the problem from a proposed solution, then carries confirmed decisions into acceptance, implementation and independent review in the same change.

Before implementation, the agent starts the settled change and loads its declared specs and rules. Review gets a separate context pack built from the request and contracts. Verified changes promote durable decisions into project specs, so later work starts with what the project has learned.

Claude Code, Codex and CodeBuddy integrations restore workflow context and gate supported file edits. Codex requires the generated hooks to be trusted in `/hooks` when prompted; other host permissions remain in effect. Disabled hooks fall back to installed guidance and the shared CLI. See [automation and its boundaries](https://github.com/Atingaii/keelson/blob/main/docs/automation.md).

You can also ask:

- **Explore:** “Find where this feature belongs. Don't change code yet.”
- **Improve an interface:** “Polish the settings page, keep our brand, preserve input when saving fails, and check the mobile flow.”
- **Resume:** “Continue the previous change. First check what's left.”

The agent automatically selects from 22 composable [design actions](https://github.com/Atingaii/keelson/blob/main/docs/frontend.md), discoverable with `keelson design`, including critique, simplification, polish, and adaptation when the work affects an interface. Checking the actual interface requires the agent to use a browser.

## What stays in your project?

Initialization creates a small foundation. Further documents appear as the work needs them:

| Location | Purpose |
| --- | --- |
| `.keelson/INTENT.md`, `.keelson/NOW.md` | Project goals, constraints, and current progress. |
| `.keelson/config.yaml` | Project check commands and workflow configuration. |
| `.keelson/changes/`, `.keelson/specs/`, `.keelson/rules/` | Changes, behavior contracts, and project rules created as needed. |
| Host entry points such as `AGENTS.md` | Direct the agent to Keelson. |

Project notes put the current result and next action first, with small task groups and links to supporting detail. Full requirements, decisions and verification evidence stay available.

Guidance comes from the installed package by default. Use `--vendor` when you want to commit a copy alongside your project. See [configuration](https://github.com/Atingaii/keelson/blob/main/docs/configuration.md) for paths and options.

## Engineering principles

The ideas above come from established engineering and interaction design practices. Keelson adapts them to repository work:

| Principle | How it appears in Keelson |
| --- | --- |
| [Behaviour-driven development](https://cucumber.io/docs/bdd/) | Describe observable behaviour with acceptance examples; use them to guide implementation and review. |
| [Ubiquitous language](https://martinfowler.com/bliki/UbiquitousLanguage.html), from domain-driven design | Keep project terms and code-name mappings in a glossary as needed, so conversation and code use the same meanings. |
| [Architecture decision records](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions) | Keep concise decisions and trade-offs in the repository, with their context available to the next session. |
| [Small iterations and feedback](https://agilemanifesto.org/principles.html) | Build a working slice, check it, and adjust; keep small changes lightweight and add planning when complexity warrants it. |
| [Usability heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/) | Review visible status, consistent language, error recovery, and user control through actual interface interactions. |

Review commands in `.keelson/config.yaml` before their first execution. The agent runs and records checks with `keelson check --trust --record`; passing exit codes still need an acceptance review. See [verification and trust](https://github.com/Atingaii/keelson/blob/main/docs/verification.md).

## Documentation and contributing

[Documentation](https://github.com/Atingaii/keelson/blob/main/docs/README.md) · [CLI reference](https://github.com/Atingaii/keelson/blob/main/docs/cli.md) · [Frontend design](https://github.com/Atingaii/keelson/blob/main/docs/frontend.md) · [Contributing](https://github.com/Atingaii/keelson/blob/main/CONTRIBUTING.md) · [Report an issue](https://github.com/Atingaii/keelson/issues) · [MIT](https://github.com/Atingaii/keelson/blob/main/LICENSE)
