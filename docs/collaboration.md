# Collaboration: sessions, people, agents

Keelson deliberately separates **conversation continuity** from **ownership transfer**.

## Ordinary session continuity

A normal AI window may close at any time. That is not a handoff and not a lifecycle transition.

When the host exposes a stable session identity, Keelson keeps a gitignored pointer:

```text
.keelson/.runtime/sessions/<opaque-key>.json
→ change: <active-change>
```

The pointer means only “this conversation is focused on this change”.

A new session can run:

```bash
keelson focus --auto
```

Resolution is conservative: valid existing focus → unique current-branch match → sole active change. Multiple candidates are never guessed.

On a host without a verified identity bridge, the same candidate rules are shown but no shared/global focus is persisted; the agent uses the chosen change explicitly for commands. This prevents two simultaneous windows from accidentally sharing one mutable pointer.

## Parallel sessions

Two windows can therefore be:

```text
session A → order-search
session B → billing-export
```

and remain isolated. `check --record`, `land`, `cancel`, and `handoff` prefer the current session focus when one is available.

A new independent requested outcome creates a new durable change and moves only that session's focus. Switching focus never completes or cancels the old change.

## Handoff is an explicit transfer

`handoff.md` is committed and therefore reserved for information another machine/person genuinely needs.

Use it when:

- a different developer/agent takes ownership;
- a worktree is intentionally transferred;
- the owner wants a cold-start transfer package.

```bash
keelson handoff <change>
```

The file records the commit, confirmed decisions, done/blocked state, ruled-out approaches, next concrete step, and verification.

Do **not** create a handoff merely because a chat window closed. Normal session recovery reads durable change artifacts and the local focus/candidate state.

## Durable vs local

| Information | Location | Git |
|---|---|---|
| Work boundary, acceptance, plan, decisions, ledger | `.keelson/changes/<name>/` | Yes |
| Explicit transfer package | `changes/<name>/handoff.md` | Yes |
| Session focus | `.keelson/.runtime/sessions/` | No |
| Check output | `.keelson/.runtime/evidence/` | No |
| Project truth | specs/rules/INTENT/etc. | Yes |

## Parallel implementation and isolation

`keelson new` records owner and branch. For a second writer, use a separate branch/worktree when useful:

```bash
keelson new share-links --tier spec --capability sharing --worktree
```

`touches` and capability deltas expose semantic overlap:

```bash
keelson new order-export --touches "src/api/**,src/export/**" --depends add-order-pagination
```

Two active changes touching the same declared paths or capability produce shared-contract warnings. Keelson exposes the conflict; Git branches/worktrees isolate files; the tracker/PR/CI coordinates ownership and integration.

## After integrating someone else's work

Verification recorded before a code merge may become stale because the worktree fingerprint changes. If another change modified a spec your delta was based on, `land` reports spec drift and requires re-reading before `--accept-drift`.

## Release state

Implementation readiness, integration, and release remain separate.

- `ready`: durable work gates + current verification are satisfied.
- `keelson land`: integrates/folds the change.
- Git tags: release boundary.

A breaking change still requires a Rollout section; Keelson never performs production operations itself.
