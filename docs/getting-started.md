# Getting started

This page walks one project from `keelson init` through a quick change, a spec change with an open question, a handoff, a second session, and a landing. It takes about twenty minutes.

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
keelson init --claude --codex --cursor
```

Sample output on a repository that already has decision records and CI:

```text
Keelson init in /home/you/your-project
✓ referencing existing decisions: docs/adr
✓ referencing existing tasks: https://github.com/you/your-project/issues
✓ referencing existing ci: .github/workflows
✓ .keelson/INTENT.md (fill in why the project exists and what the agent may decide alone)
✓ .keelson/NOW.md
✓ .keelson/ROADMAP.md (current milestone; link your tracker instead of duplicating it)
✓ .keelson/GLOSSARY.md (shared vocabulary; fill it when two words start meaning the same thing)
✓ .keelson/rules/index.md
✓ .keelson/rules/general.md
✓ .gitignore: .keelson/.local/ (session state and evidence stay on this machine)
✓ .keelson/config.yaml
✓ Claude Code: skill → .claude/skills/keelson
✓ Claude Code: resident block → CLAUDE.md
✓ Claude Code: hooks → .claude/settings.json (session snapshot + per-prompt state line)
· model detection cached in ~/.keelson/models.cache.json (keelson models)

Next
  1. Edit .keelson/INTENT.md — why this project exists, what it will not do, what the agent may decide alone.
  2. Open your agent here and start talking; on first contact it drafts INTENT.md, the specs, and the rules from the code.
  3. Then just talk to your agent. Nothing else to type.
```

`init` never overwrites files that already exist in `.keelson/`. It appends a marked block to `CLAUDE.md` (or `AGENTS.md`, `GEMINI.md`) and leaves the rest of the file alone. Existing material it finds (architecture notes, decision records, CI, a GitHub issues page) is recorded under `refs` in `config.yaml` and referenced, never copied. If `package.json` has `lint`, `typecheck`, or `test` scripts, they become check commands. `keelson init --dry-run` lists what would be written without writing it.

## First contact

Open your agent in the project directory and say anything, or just "hello". `NOW.md` holds a first-contact task, so the agent reads the repository, drafts `.keelson/INTENT.md` (why the project exists, its boundaries, hard constraints, and what the agent may decide alone) and, for an existing codebase, one spec per capability plus rules for paths with conventions. It asks you to confirm or correct in one short exchange and keeps your answers. If you ask for a change right away, it does this while shaping that change and confirms both together. You never write these files by hand.


## Your first quick change

Say what you want in plain language:

```text
Add pagination to the orders list.
```

The agent runs `keelson context --paths` for the files it expects to touch, reads `INTENT.md`, `NOW.md`, and the matched rules, and writes back its understanding in a few lines. Then it runs `keelson new add-order-pagination`, fills `change.md` (Why, What, Acceptance) and `tasks.md`, and proceeds. When the tasks are done it runs:

```bash
keelson check --record "pagination on /orders"
```

That runs the check commands, saves their output under `.keelson/.local/evidence/`, and appends a `Verify:` entry to the ledger with each exit code and the worktree fingerprint. The agent ticks the acceptance items whose checks ran, then runs `keelson land add-order-pagination --now "…"` and tells you what changed.

If you would rather approve quick changes before work starts, set this in `.keelson/config.yaml`:

```yaml
confirm:
  quick: wait
```

## Your first spec change

A spec change alters a behaviour contract, adds or removes a capability, involves a migration, or abandons the obvious approach. Say something like:

```text
Let people share an album with a link.
```

The agent recognises the size and asks the questions that block the next slice, one round at a time, with a recommendation and its trade-off for each. It then runs `keelson new share-links --tier spec --capability sharing --touches src/api/**` and drafts:

- `change.md` with Why, What, How, Alternatives, Impact, Acceptance, Open questions, and Decisions;
- `specs/sharing/spec.md` holding only the delta: added, modified, and removed requirements, with a `base:` stamp of the main spec;
- `tasks.md` with slices, each stating what it delivers, and an effort tier per task;
- `ledger.md` for rulings, dispatches, root causes, and verification evidence.

Say you have not decided on link expiry. The agent records it:

```markdown
## Open questions
- default expiry for share links? — blocks: Revoke and expiry

## Decisions
- sharing: links are unguessable tokens; sequential ids rejected because they leak album count
- (assumed) sharing: links expire after 7 days by default
```

The open question blocks only the slice named after it. The agent waits for your approval of the plan, then builds the "Create and access" slice, records evidence, and stops before landing because an open question and an assumed decision remain. `keelson status` shows:

```text
share-links  [spec]  work: in-progress  verify: ✓ passed  release: unreleased  (ann)
   ✓ slice Create and access 2/2 — a link can be created and opens the album
   · slice Revoke and expiry 0/3 — revoked or expired links refuse every access path
   acceptance 2/4
   open: default expiry for share links? (blocks Revoke and expiry)
   1 assumed decision awaiting the owner
```

## Stopping and resuming

When the agent stops mid-change it runs `keelson handoff share-links` and fills the six sections: goal and confirmed decisions, done, open and blocked, ruled out, next step, verification. It rewrites `NOW.md` to match.

Open a new session and say "continue". On Claude Code the session-start hook has already printed `NOW.md`, the active change, and the handoff's next step. On other tools the agent runs `keelson context` first. It checks `keelson status` for uncommitted files and whether HEAD moved since the handoff, never resets uncommitted work, and continues from the next step.

Answer the open question:

```text
continue. Expiry is 30 days.
```

The agent updates `change.md` (open question removed, decision confirmed), the delta spec, and the slice, builds it, and records fresh evidence. Old evidence is stale by definition after any edit; `keelson land` would say so.

## Landing

When every task and acceptance item is checked, no open question remains, and the last `Verify:` entry matches the current worktree, the agent runs:

```bash
keelson land share-links --confirm-assumptions --now "Nothing in flight. Next: watch share-link error rate for a week."
```

`--confirm-assumptions` is your decision, not the agent's: it folds `(assumed)` decisions into the spec as confirmed. Delta specs merge into `specs/sharing/spec.md`. Decision lines fold into its `Decisions` section. The change directory is removed. `NOW.md` is rewritten. The agent commits the landing together with the last code change so specs and code share a revision.

If landing is refused, the message lists every reason:

```text
keelson: cannot land "share-links":
  - 1 open question(s): default expiry for share links?
  - verification stale (verified at tree 5bcb829dae, worktree is 9a92f4bead)
  - 1 assumed decision(s) would be folded as confirmed; pass --confirm-assumptions once the owner agrees
```

You can watch any of this yourself:

```bash
keelson status
keelson validate
keelson doctor
```

## Teams and CI

Add one line to your pull request template asking for a change directory on non-trivial work, and run these in CI:

```bash
keelson validate && keelson check
```

`validate` exits non-zero on structural errors: missing sections, unknown statuses, dated model IDs, broken rule references. `check` exits non-zero when any configured command fails. Release state comes from git tags: `keelson status` lists changes landed since the last tag. See [Collaboration](collaboration.md).
