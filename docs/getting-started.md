# Getting started

This page walks one project from `keelson init` to its second session. It takes about ten minutes.

## Install

Keelson needs Node.js 20 or newer.

```bash
npm install -g keelson
keelson --version
```

## Initialise a project

```bash
cd your-project
keelson init
```

By default this sets up Claude Code. Pass `--tools` for other agents, comma separated:

```bash
keelson init --tools claude,codex,cursor
```

Sample output:

```text
Keelson init in /home/you/your-project
✓ .keelson/INTENT.md (fill in why the project exists)
✓ .keelson/NOW.md
✓ .keelson/rules/index.md
✓ .keelson/rules/general.md
✓ .keelson/config.yaml
✓ Claude Code: skill → .claude/skills/keelson
✓ Claude Code: resident block → CLAUDE.md
✓ Claude Code: hooks → .claude/settings.json (session snapshot + per-prompt state line)
· model detection cached in ~/.keelson/models.cache.json (keelson models)

Next
  1. Edit .keelson/INTENT.md — why this project exists and what it will not do.
  2. Existing codebase? Re-run with --onboard, or ask your agent: "draft specs and rules from the code".
  3. Then just talk to your agent. Nothing else to type.
```

`init` never overwrites files that already exist in `.keelson/`. It appends a marked block to `CLAUDE.md` (or `AGENTS.md`, `GEMINI.md`) and leaves the rest of the file alone. If `package.json` has `lint`, `typecheck`, or `test` scripts, they are registered as check commands in `config.yaml`. Go, Rust, and Python projects get their usual test commands.

## Write INTENT.md

Open `.keelson/INTENT.md`. The template asks for four things:

- why the project exists, in one paragraph;
- boundaries, including the tempting things you have decided not to do;
- hard constraints such as runtime, compatibility, and licensing;
- working defaults for change sizing and approvals.

This file is read at the start of every non-trivial piece of work. Keep it to one page.

## Onboarding an existing codebase

For a project that already has code, run:

```bash
keelson init --onboard
```

This writes an onboarding task into `NOW.md`. Open your agent and say "continue". The agent reads the codebase, lists its capabilities, writes one spec per capability under `.keelson/specs/`, and proposes rules for paths that have conventions. Specs and rules are drafts until you confirm them. Ask the agent to show you each spec before it lands anything.

## Your first quick change

Say what you want in plain language:

```text
Add pagination to the orders list.
```

The agent reads `INTENT.md`, `NOW.md`, and the rules that match the files it expects to touch. It writes back its understanding in a few lines, creates `.keelson/changes/add-order-pagination/`, fills `tasks.md`, and proceeds. When the tasks are done it runs the check commands and reports the exit codes. Then it runs `keelson land`, rewrites `NOW.md`, and tells you what changed.

If you would rather approve quick changes before work starts, set this in `.keelson/config.yaml`:

```yaml
confirm:
  quick: wait
```

## Your first spec change

A spec change alters a behaviour contract, adds or removes a capability, or abandons the obvious approach. Say something like:

```text
Replace the Redis pub/sub with a durable queue.
```

The agent recognises the size and asks questions one at a time, using the host's question tool where available. It then creates a `spec` change with:

- `change.md` with Why, What, How, Alternatives, Impact, and Decisions;
- `specs/<capability>/spec.md` holding only the delta: added, modified, and removed requirements;
- `tasks.md` with an effort tier per task;
- `ledger.md` for rulings, dispatches, root causes, and verification evidence.

It waits for your approval before touching code. Say "go", or edit the files first and then say "go".

## Landing

When every task is checked and the last `Verify:` entry in the ledger has exit 0, the agent runs:

```bash
keelson land <name> --now "Nothing in flight. Next: watch the queue lag dashboard for a week."
```

Delta specs merge into `.keelson/specs/`. Decision lines fold into the spec's `Decisions` section. The change directory is removed. `NOW.md` is rewritten. The agent commits the landing together with the last code change so the specs and the code share one revision.

You can watch any of this yourself:

```bash
keelson status
keelson validate
keelson check
```

## The next session

Open a new session and say "continue". On Claude Code the session-start hook has already printed `NOW.md` and the active changes. On other tools the agent runs `keelson context` first. Either way it picks up where the last session stopped, from files, not from memory.

## Optional: teams

Add one line to your pull request template asking for a change directory on non-trivial work, and run these in CI:

```bash
keelson validate && keelson check
```

`validate` exits non-zero on structural errors. `check` exits non-zero when any configured command fails.
