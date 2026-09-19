# Keelson

**A project-local engineering control plane for coding agents.**  
Initialize once, then keep using your agent normally.

[![npm version](https://img.shields.io/npm/v/keelson?style=flat-square)](https://www.npmjs.com/package/keelson)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg?style=flat-square)](LICENSE)
[![CI](https://img.shields.io/github/actions/workflow/status/Atingaii/keelson/ci.yml?branch=main&style=flat-square)](https://github.com/Atingaii/keelson/actions/workflows/ci.yml)

Coding agents are good at producing code and bad at carrying project state across sessions: why a decision exists, what behavior is contractual, what is still open, whether verification belongs to the current tree, and where another agent should resume.

Keelson keeps those facts in the repository and exposes them to the agent only when needed.

```text
facts over process
evidence over claims
one source of truth over copies
progressive disclosure over permanent ceremony
strong defaults with explicit escape hatches
```

## 60-second example

You do **not** have to tell Keelson when a task starts or ends.

> **You:** Let customers revoke share links. Revoked links must immediately stop opening images.

The agent creates/binds one durable change and keeps this conversation focused on it.

> **You:** Why not use a 5-minute grace period?  
> **Agent:** That would reduce cache churn, but it conflicts with “immediately”. I recommend immediate denial.

> **You:** Also make sure direct image URLs stop working.  
> **Agent:** Same change. I added that access path to the existing acceptance boundary.

> **You:** What happens on mobile?  
> **Agent:** That is an informational follow-up, not a new work item. The same revocation contract applies.

You can keep asking questions like this indefinitely. No “finish task” phrase is required.

When acceptance is satisfied and fresh verification matches the current tree, Keelson derives the work state as **ready**. The agent lands it automatically before claiming completion. If you simply close the window first, the durable change remains in progress; only the local session focus disappears.

A later session can deliberately resume it with `keelson focus --auto` when the candidate is unambiguous. A committed `handoff.md` is reserved for a real ownership/machine transfer, not ordinary chat continuation.

## Quick start

Requires Node.js 20+.

```bash
npm install -g keelson
cd your-project
keelson init
```

That is the normal setup.

Then open Claude Code, Codex, OpenCode, Pi, Gemini CLI, Kiro CLI, or CodeBuddy CLI in the project and work as usual.

Most users only ever run:

```bash
keelson init       # once
keelson status     # optional: inspect current state
keelson doctor     # diagnose
keelson update     # after upgrading or changing hosts
keelson uninstall  # remove generated integration surfaces
```

The rest of the CLI exists primarily for the coding agent.

## One golden path

Conversation intent and work lifecycle are separate.

Keelson routes user messages into five conversational intents:

| Intent | What it means |
|---|---|
| **Explore** | Think, compare, explain, clarify; read-only until a modification is requested |
| **Change** | Build/refactor/migrate, or continue modifying the currently focused outcome |
| **Fix** | Reproduce → locate → regression check → repair → verify |
| **Resume** | Rebind a new session to existing durable work when the candidate is clear |
| **Improve** | Turn recurring failures into a spec, scoped rule, or executable check |

**Completion is not an intent.** It is derived from the work item: acceptance complete, no blocking questions/assumptions, required rollout present, and fresh verification on the current tree. Once those gates hold, the change becomes `ready` and the agent runs the landing/reconciliation path without waiting for the user to say “done”.

A session is only a local focus pointer. Ending a session never completes, cancels, or lands a change.

See the full walkthrough: **[Complete user flow](docs/user-flow.md)**.

## A small control plane that grows only when needed

Fresh init deliberately starts small:

```text
.keelson/
├── README.md
├── INTENT.md
├── NOW.md
├── config.yaml
├── manifest.json
├── workflow.md
└── skill/
    ├── SKILL.md
    └── references/
```

Optional durable knowledge appears only when it carries real information:

```text
ROADMAP.md                   # milestone/direction if the tracker does not already own it
GLOSSARY.md                  # load-bearing vocabulary
rules/                       # durable scoped invariants
specs/<capability>/spec.md   # behavior contracts
changes/<name>/              # durable work items in flight
```

Ephemeral machine-local state is separate:

```text
.runtime/
├── sessions/<key>.json      # this conversation's current change focus only
└── evidence/                # check output
```

`.runtime/` is gitignored. A session file is never a task record and never stores “completed”.

A quick change begins with only:

```text
changes/rename-buyer/
└── change.md
```

`tasks.md`, `ledger.md`, delta specs, and `handoff.md` appear only when they carry a plan, evidence, contract delta, or explicit ownership transfer.

**Empty scaffolding is not progress; a closed conversation is not completion.**

## One canonical runtime

Full Keelson guidance has one source of truth:

```text
.keelson/workflow.md
.keelson/skill/
```

Host-visible files such as `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `CODEBUDDY.md`, and host skill directories are thin discovery shims. They point back to the same runtime instead of copying it.

This keeps host compatibility from multiplying project rules.

## First-class hosts

Official support is intentionally bounded to seven CLI hosts plus the portable standards layer:

| Host | Instructions | Skill discovery | Session focus | Evidence |
|---|---|---|---|---|
| Claude Code | `CLAUDE.md` | `.claude/skills/` | **native** | verified |
| Codex CLI | `AGENTS.md` | `.agents/skills/` | degraded | verified |
| OpenCode | `AGENTS.md` | `.agents/skills/` | degraded | documented |
| Pi | `AGENTS.md` | `.agents/skills/` | degraded | documented |
| Gemini CLI | `GEMINI.md` | `.agents/skills/` | degraded | documented |
| Kiro CLI | `AGENTS.md` | `.kiro/skills/` | degraded | documented |
| CodeBuddy CLI | `CODEBUDDY.md` | `.codebuddy/skills/` | degraded | documented |
| Portable Agent Skills readers | `AGENTS.md` | `.agents/skills/` | degraded | fallback |

A host becomes first-class only when discovery/lifecycle paths are verified or backed by primary documentation and it passes the shared contract. Session focus is a separate capability: `native` means Keelson has a verified identity bridge; `degraded` means durable work remains correct but ambiguous conversations must select a change explicitly.

## Reliability is part of the product

Keelson treats its own installation like a control system, not a pile of copied files.

- **Desired state:** `.keelson/manifest.json` records generated host surfaces Keelson owns.
- **Reconciliation:** `keelson update` removes stale Keelson-owned adapters and preserves neighboring user files.
- **Recoverable replacement:** package-owned skill directories keep the last complete copy until the new one is ready.
- **Drift detection:** `keelson doctor` checks runtime content, shims, hooks, manifest state, verification freshness, conflicts, and knowledge health.
- **Revision-bound evidence:** `keelson check --record` ties verification to a worktree fingerprint; later edits make it stale.
- **Low toil:** repeated mistakes should become narrow rules or executable checks, then redundant prose should disappear.

## What Keelson is not

- not a project manager — your tracker still owns priority;
- not an agent runtime — it has no daemon or model calls of its own;
- not a replacement for tests or CI;
- not a correctness proof;
- not a reason to document everything;
- not another workflow the user must operate manually.

It is the layer that keeps **intent, current truth, in-flight state, and evidence** coherent while coding agents come and go.

## Documentation

**Start here:** [Documentation home](docs/README.md)

- [Getting started](docs/getting-started.md)
- [Complete user flow](docs/user-flow.md)
- [Concepts](docs/concepts.md)
- [How it works](docs/how-it-works.md)
- [Existing projects](docs/existing-projects.md)
- [Collaboration](docs/collaboration.md)
- [Verification](docs/verification.md)
- [Configuration](docs/configuration.md)
- [CLI reference](docs/cli.md)
- [Effort tiers and models](docs/models.md)
- [FAQ](docs/faq.md)
- [简体中文](README_CN.md)

## Contributing

Issues and pull requests are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md).

Keelson uses itself. The repository's `.keelson/` is a live example of a mature project where optional artifacts exist because they carry real information—not because init created placeholders.

## License

MIT — see [LICENSE](LICENSE).
