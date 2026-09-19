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

You keep talking normally:

> **You:** Let customers revoke share links. Revoked links must immediately stop opening images.

The agent reads the current project, writes back the boundary, and asks only the load-bearing question:

> **Agent:** I will treat revocation as immediate denial on every image access path; already-downloaded browser bytes cannot be remotely erased. No grace period. I recommend this over a timed grace period because “immediate” is part of the requirement. Approve that boundary?

After approval it creates only the artifacts this change needs, implements one vertical slice at a time, and records verification against the exact worktree.

If you stop:

> **You:** Stop here.  
> **Agent:** Handoff written. Next step: deny direct image access for revoked links.

Tomorrow:

> **You:** Continue.  
> **Agent:** Resuming from the recorded handoff; the previous decision is already confirmed.

Before saying “done”, Keelson requires fresh evidence. If code changes after verification, that evidence becomes stale.

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

Keelson routes natural-language work into six intents:

| Intent | What it means |
|---|---|
| **Explore** | Think, compare, clarify; stay read-only until you ask for a change |
| **Change** | Bound a feature/refactor/migration, then deliver the smallest vertical slices |
| **Fix** | Reproduce → locate → regression check → repair → verify |
| **Resume** | Read NOW + handoff and continue the recorded next step |
| **Finish** | Verify → review → land → fold durable truth back |
| **Improve** | Turn recurring failures into a spec, scoped rule, or executable check |

These are routing modes for the agent, not commands the user has to memorize.

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

Optional knowledge appears only when it carries real information:

```text
ROADMAP.md                   # only when a milestone needs to live here
GLOSSARY.md                  # only when vocabulary is load-bearing
rules/                       # only for durable scoped invariants
specs/<capability>/spec.md   # only for behavior contracts
changes/<name>/              # only while non-trivial work is in flight
.local/                      # local evidence, gitignored
```

A quick change begins with only:

```text
changes/rename-buyer/
└── change.md
```

`tasks.md`, `ledger.md`, `handoff.md`, and delta specs appear only when the change actually needs a plan, evidence, a session boundary, or a behavior-contract delta.

**Empty scaffolding is not progress.**

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

| Host | Instructions | Skill discovery | Evidence |
|---|---|---|---|
| Claude Code | `CLAUDE.md` | `.claude/skills/` | verified |
| Codex CLI | `AGENTS.md` | `.agents/skills/` | verified |
| OpenCode | `AGENTS.md` | `.agents/skills/` | documented |
| Pi | `AGENTS.md` | `.agents/skills/` | documented |
| Gemini CLI | `GEMINI.md` | `.agents/skills/` | documented |
| Kiro CLI | `AGENTS.md` | `.kiro/skills/` | documented |
| CodeBuddy CLI | `CODEBUDDY.md` | `.codebuddy/skills/` | documented |
| Portable Agent Skills readers | `AGENTS.md` | `.agents/skills/` | fallback |

A host becomes first-class only when its discovery paths are verified or backed by primary documentation and it passes the same init/update/doctor/uninstall contract.

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
