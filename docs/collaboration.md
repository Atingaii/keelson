# Collaboration: sessions, people, agents

The line between "did one task" and "kept a project moving" is whether the next session, the next person, or the next model can continue without redoing or undoing work, and whether two of them can work at once without overwriting each other. This page covers both.

## Across sessions

### NOW.md

The project-level snapshot: what is in flight, what is blocked or uncertain (including "not yet checked: …"), and the next concrete step. Present tense, rewritten in full, never appended. `keelson land --now "<text>"` writes it at landing; the agent rewrites it whenever it stops. The session-start hook prints it.

### handoff.md

The continuation state of one change, committed alongside it. `keelson handoff <name>` creates it from the template or re-stamps an existing one:

```markdown
---
at: 7a9f37c2b1
updated: 2026-09-19 14:02
by: ann
---
```

`at` is the commit the handoff describes. The agent fills six sections:

| Section | Holds |
|---|---|
| Goal and confirmed decisions | One paragraph, present tense, linking `change.md` |
| Done | Slices or tasks complete and verified, with the `Verify:` that proves it |
| Open and blocked | Each item with what it blocks |
| Ruled out | Assumptions or approaches rejected, with the evidence, so nobody retries them |
| Next step | The first concrete action, small enough to start cold |
| Verification | The last `Verify:` (command, exit code, tree) and what has not been checked |

A handoff is a current-state summary. It is overwritten, never appended as a diary.

### Resuming

1. `keelson status`: work, verification, and release state per change; whether HEAD moved since the handoff; uncommitted files.
2. If HEAD moved or the tree is dirty, read `git log` and `git diff` before trusting the handoff. Other work may have landed and shared contracts may have shifted.
3. Never delete or reset uncommitted changes to "start clean". Ask, or work around them.
4. Re-run `keelson check --record` before building on prior verification; it is stale after any edit.
5. Continue from **Next step**; update `handoff.md` and `NOW.md` when stopping again.

The session-start hook prints each active change's next step, so on Claude Code the agent sees it before reading anything. On other tools the resident block tells it to run `keelson context` first.

### What is committed and what is local

| Information | Location | In git |
|---|---|---|
| `NOW.md`, `handoff.md`, `ledger.md`, change artifacts | `.keelson/` | Yes |
| Check output, per-machine state | `.keelson/.local/` | No, added to `.gitignore` by `init` |

Anything a colleague on another machine would need is committed.

## In parallel

### Ownership and isolation

`keelson new` records the owner (git user name) and the current branch in `change.md`. For a second writer, create the change on its own branch and worktree:

```bash
keelson new share-links --tier spec --capability sharing --worktree
```

This runs `git worktree add -b share-links ../<repo>-share-links` and records `branch: share-links` and `worktree:` in the frontmatter. `keelson status` shows owner and branch next to each change.

### Declaring what a change touches

```bash
keelson new order-export --touches "src/api/**,src/export/**" --depends add-order-pagination
```

`touches` lists path globs the change will edit. `depends` names active changes it waits on; `status` prints "depends on active: …" while they exist and `validate` warns when a dependency is no longer active.

### Shared contracts

Two active changes that declare overlapping `touches`, or that both carry a delta spec (or a decision line) for the same capability, are a shared contract. `keelson status` warns:

```text
! shared contract: add-pagination and order-export both touch specs/orders — align the interface before implementing both
```

`keelson impact <files>` prints the same warning for any active change that declares the files. The response is to agree the contract first, in the delta spec, and land or reference it before both sides implement.

### After integrating someone else's work

Evidence recorded before a merge is stale by definition; `keelson status` shows it and `land` refuses it. If the other change modified a spec your delta was written against, `land` reports drift and asks you to re-read before `--accept-drift`.

### Limits

A file on disk is not a distributed lock. A branch does not remove semantic conflicts. Keelson exposes overlaps; it does not arbitrate them. Claiming work across machines and controlling merges belong to the tracker, pull requests, and CI, which is why `refs.tasks` and `refs.ci` exist and why `keelson validate && keelson check` is meant to run in CI.

## Release state

Implemented, integrated, and released are three states. `keelson land` marks integration: run it when the change is on the target branch (merged, or committed on the mainline in a solo repository). Release comes from git tags: `keelson status` prints the last tag and the changes folded since it as unreleased.

```text
last release v1.4.0; landed since: share-links, order-export
```

### Rollout sections

A `What` bullet that starts with `**BREAKING**` marks a breaking change, and `keelson land` refuses it without a `## Rollout` section describing the compatibility window, migration, and rollback. Migrations and production steps stay in `NOW.md → Next` until they have run. Keelson reminds; it never performs production operations.
