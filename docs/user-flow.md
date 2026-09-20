# Complete user flow

The central rule is:

> **Conversation lifecycle is not work lifecycle.**

Users may keep asking questions, go idle, close the terminal, open another window, or return tomorrow without ever saying “start task” or “finish task”. Keelson must remain correct anyway.

Keelson therefore keeps three different kinds of state:

```text
Durable project truth     INTENT / specs / rules
Durable work item         changes/<name>/
Ephemeral conversation    .runtime/sessions/<key>.json
```

A session file only answers **“which durable change is this conversation currently focused on?”** It never says whether the change is complete.

## 0. Initialize once

```bash
npm install -g keelson
cd my-project
keelson init
```

Then use Claude Code, Codex, OpenCode, Pi, Gemini CLI, Kiro CLI, or CodeBuddy normally.

Fresh init stays small:

```text
.keelson/
├── README.md
├── INTENT.md
├── NOW.md
├── config.yaml
├── manifest.json
├── workflow.md
└── skill/
```

Runtime state appears only when needed:

```text
.keelson/.runtime/
├── sessions/<opaque-key>.json
└── evidence/
```

It is gitignored.

## 1. A normal conversation can last indefinitely

> **You:** Add search to the orders page.

The agent confirms the load-bearing boundary and creates a durable change.

```text
.keelson/changes/order-search/
└── change.md
```

If the host exposes a trustworthy session identity, Keelson also binds this conversation locally:

```json
{
  "schema": 1,
  "change": "order-search"
}
```

The raw host session id is not stored.

Now the user can keep talking:

> **You:** Why did you choose server-side search?

That is **Explore/explanation inside the same focused work**, not a new task.

> **You:** Highlight the matching text too.

That changes the same requested outcome, so the existing `order-search` change is updated.

> **You:** What happens on mobile?

Still an informational follow-up. No lifecycle transition.

> **You:** By the way, fix the billing export crash too.

That is an independent modification outcome. The agent creates a second durable change and moves this session's focus to it. The original order-search change remains active; it is not completed or cancelled merely because the conversation changed topic.

## 2. Closing the window means almost nothing

Suppose the user simply closes the terminal.

Keelson does **not**:

- mark the focused change complete;
- create a fake handoff;
- archive the change;
- rewrite project truth;
- infer that the user is “done for today”.

The durable change directory remains exactly as it was.

The session pointer is only machine-local runtime state. It may later disappear without affecting the change.

This is the same principle used by a database transaction coordinator or scheduler: **liveness of a client connection is not business-state completion**.

## 3. A new session deliberately recovers focus

Tomorrow the user opens a new Agent window:

> **You:** Continue.

The agent runs:

```bash
keelson focus --auto
```

Resolution is conservative:

1. keep an already-valid session focus;
2. if exactly one active change matches the current branch, suggest/bind it;
3. otherwise, if there is exactly one active change, suggest/bind it;
4. if several candidates remain, do **not** guess.

In the ambiguous case the agent asks only the disambiguating question, for example:

> There are two active changes: `order-search` and `billing-export-crash`. Which one do you want to continue?

On hosts without a reliable session-identity bridge, the same safe degraded rule applies. Work remains correct even if convenience is reduced.

## 4. Quick change: no fake project-management ceremony

> **You:** Rename the internal “buyer” label to “customer”; behavior stays the same.

The agent creates:

```text
changes/rename-buyer/
└── change.md
```

It does not create empty tasks, ledger, handoff, spec, or design files.

The conversation may contain ten follow-up questions. Nothing about that changes the work lifecycle.

When implementation and acceptance are ready, the agent records evidence:

```bash
keelson check --record "buyer rename preserves behavior"
```

Now `ledger.md` appears because there is a real verification event.

If all gates hold, the CLI reports:

```text
rename-buyer: ready → run `keelson land rename-buyer`;
do not wait for the user to say "done"
```

The agent lands it immediately before making a completion claim.

## 5. Spec-sized change: durable work grows independently of chat

> **You:** Let customers revoke share links, and revoked links must immediately stop opening images.

The agent creates a spec-sized work item after the owner approves the behavior boundary:

```text
.keelson/
├── specs/
│   └── sharing/spec.md
└── changes/revoke-share-link/
    ├── change.md
    ├── tasks.md
    └── specs/sharing/spec.md
```

The user may then ask:

> Why no grace period?  
> Does this invalidate CDN cache?  
> What about already-open browser tabs?  
> Also change the button copy.

Those are all conversation turns. They do not need “task start/finish” markers. The agent classifies each turn as explanation, modification of the same outcome, or a genuinely independent outcome.

## 6. Readiness is derived, not announced

A change becomes `ready` only when the mechanical/durable state says so:

```text
required tasks complete
AND acceptance complete
AND no blocking open questions
AND no unconfirmed assumptions
AND breaking change has rollout
AND verification passes on current tree
```

`tasks.md` is a mutable execution plan in every tier. It may be absent, incomplete, or rewritten without preventing readiness when the accepted outcome is satisfied.

For a spec change, the Acceptance contract and behaviour delta are authoritative; the plan is not.

If verification was green and code is edited afterward, readiness disappears because evidence becomes stale.

This is why the user never has to say:

> “This task is finished.”

The repository already knows whether the work is ready.

## 7. Completion is an automatic Agent transition

When `keelson check --record` causes the current change to become `ready`, the agent follows with:

```bash
keelson land
```

The focused change is selected automatically when session identity exists.

Landing:

- folds behavior deltas into current specs;
- folds durable decisions beside the behavior they explain;
- removes/archive temporary change scaffolding according to config;
- clears every local session pointer that referenced that change.

Only after successful landing may the agent say the change is complete.

If an owner decision is still required, it does not land. It asks that one decision instead.

## 8. What if the user asks another question after landing?

Nothing special.

> **You:** Why did you use a unique index here?

That is an informational question. The agent answers it. It does not resurrect the landed change.

> **You:** Make duplicate submissions return the existing record instead of 409.

That is a new behavior modification. The agent creates a new change if non-trivial.

So there is no “conversation ends when task ends” assumption in either direction.

## 9. Handoff is now a real transfer artifact

Ordinary session continuity does **not** require `handoff.md`.

Use:

```bash
keelson handoff <change>
```

when work ownership really moves:

- another developer/agent on another machine takes over;
- a long-running worktree is explicitly handed to someone else;
- the owner wants a committed cold-start transfer package.

A handoff remains committed because another machine needs it.

A normal new chat window does not need one; it reconstructs from durable change state plus local session focus/candidate resolution.

## 10. Parallel conversations

Suppose two Agent windows work in parallel:

```text
session A → order-search
session B → billing-export
```

Each session gets its own gitignored pointer.

```text
.runtime/sessions/
├── a1….json → order-search
└── b9….json → billing-export
```

`keelson check --record`, `land`, and `handoff` prefer the current session focus, so verification from one window does not accidentally land the other change.

If session identity is unavailable or ambiguous, Keelson refuses to guess and requires an explicit change name.

This is deliberate fail-safe behavior.

## 11. Fix mode works the same way

> **You:** Emoji in customer names makes this endpoint return 500.

The agent reproduces, adds a regression check, fixes the cause, and verifies.

The user might then ask several technical questions; the same work item remains focused.

When the regression acceptance and verification are satisfied, it becomes `ready` and lands. No “finish” phrase.

## 12. Project truth is slower-lived than work

After a change lands, only durable truth survives:

- observable behavior → specs;
- stable scoped invariant → rules/checks;
- stable terminology → glossary;
- project-level direction/state → ROADMAP/NOW when genuinely useful;
- history → Git.

Session pointers disappear locally. Temporary work artifacts fold away.

The lifetimes therefore form:

```text
conversation/session   minutes–hours, local
change/work item       minutes–days/weeks, committed
project truth          months–years, committed
git history            permanent record
```

## 13. What the user actually does

Usually:

```bash
keelson init
```

Then natural language.

Optional visibility:

```bash
keelson status
```

Diagnostics/update:

```bash
keelson update
```

Knowledge maintenance itself is automatic: the Agent consumes internal health signals during RECONCILE, specs auto-shard when needed, and runtime caches self-prune. `doctor` is a diagnostic tool, not a required housekeeping step.

The Agent handles `focus`, `new`, `context`, `impact`, `check`, `land`, and exceptional `handoff`.

## Mental model

```text
conversation turns
      │
      ▼
session focus ───────────────┐
(local, ephemeral)           │
      │                      │
      ▼                      │
durable change/work item ◄───┘
(committed, lifecycle state)
      │
      │ ready when gates/evidence say so
      ▼
land automatically
      │
      ▼
durable project truth
```

**The user never has to perform lifecycle bookkeeping through conversation phrases.**
