# Complete user flow

The important UX rule is simple: **Keelson is not another process the user operates.** The user talks to Claude Code, Codex, OpenCode, Pi, Gemini CLI, Kiro CLI, or CodeBuddy CLI as usual. Keelson turns the useful parts of that work into reviewable project state underneath the conversation.

## 0. Install and initialize

```bash
npm install -g keelson
cd my-project
keelson init
```

If a first-class host is detected, Keelson installs its discovery shim. Otherwise it uses the portable `AGENTS.md + .agents/skills/` layer.

A fresh project starts deliberately small:

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

There is no empty ROADMAP, glossary, rules tree, specs tree, changes tree, task list, ledger, or handoff.

## 1. First conversation: confirm intent, not a whole repository model

You open your normal coding agent.

> **You:** Add search to the orders page.

On first contact, the agent reads the repository and drafts `.keelson/INTENT.md` from what already exists. It does **not** try to document every capability in the repository.

> **Agent:** I read the project first. I understand it as an internal order-management app; the public API is intentionally out of scope, and destructive production operations still require explicit confirmation. I recorded that in INTENT.  
> For this request, I understand “search” as filtering orders by order number and customer name on the existing list page. No global site search. Is that boundary right?

You correct only what matters. The agent rewrites INTENT/NOW from the answer and continues.

## 2. Explore mode: thinking is read-only

> **You:** Before we build it, is client-side search or server-side search better here?

Keelson routes this to **Explore**. The agent reads the current code/specs/rules and discusses alternatives. No change directory is created merely because you are thinking.

If a quick experiment beats discussion, the agent may run a read-only benchmark/spike and report the result. Nothing durable is written unless the result changes future work.

## 3. Quick change: one file until more state exists

Suppose the request is clear and does not change the behavior contract:

> **You:** Rename the internal “buyer” field to “customer” everywhere in the admin UI. Behavior should not change.

The agent writes back the boundary, then internally runs something equivalent to:

```bash
keelson new rename-buyer --tier quick
```

The workspace starts as:

```text
.keelson/changes/rename-buyer/
└── change.md
```

No empty task list or ledger is created.

The agent edits the code and runs the project checks:

```bash
keelson check --record "buyer renamed without behavior change" --change rename-buyer
```

Only now does `ledger.md` appear, because evidence now exists.

If the change finishes in one session, there is never a `handoff.md`.

## 4. Spec-sized change: boundary → approval → slices

Now a behavior contract really changes:

> **You:** Let customers revoke a share link, and revoked links must immediately stop opening images.

The agent routes this to **Change** and performs four things before implementation:

1. reads current project state and impact;
2. separates facts, assumptions, and unanswered owner decisions;
3. writes a reviewable change boundary and acceptance criteria;
4. writes the behavior delta and implementation slices.

The workspace grows because the information is now real:

```text
.keelson/
├── specs/
│   └── sharing/spec.md              # current truth, if it did not already exist
└── changes/revoke-share-link/
    ├── change.md                    # why / scope / acceptance / decisions
    ├── tasks.md                     # vertical slices because this work needs a plan
    └── specs/sharing/spec.md        # behavior delta
```

The agent shows you the load-bearing choices before code:

> **Agent:** Proposed contract: revocation is immediate for every image access path; existing browser bytes are not remotely erasable; no grace period.  
> Alternative: 5-minute grace period lowers cache churn but violates “immediately”. I recommend immediate denial.  
> Acceptance is three scenarios: revoked page access, revoked direct image access, and existing unrevoked links unchanged. Approve this boundary?

For a spec-sized change, implementation waits for approval unless your config explicitly says otherwise.

## 5. Build: one vertical slice at a time

After approval, the agent implements the narrowest end-to-end slice first rather than “database, then backend, then frontend”.

Example:

```text
Slice 1: Revoke and deny page access
Slice 2: Deny direct image access
Slice 3: Management UI and regression coverage
```

Cheap targeted checks run during work. Full configured checks are reserved for completion claims.

If the agent discovers a stable project-specific invariant such as “all share authorization passes through canViewShare()”, that rule is persisted only if future sessions need it. If a command can enforce it, the command is preferred over prose.

## 6. Stop and resume: state crosses the session boundary

Suppose you stop after slice 1.

The agent runs:

```bash
keelson handoff revoke-share-link
```

Now—and only now—`handoff.md` appears.

```text
changes/revoke-share-link/
├── change.md
├── tasks.md
├── handoff.md
└── specs/sharing/spec.md
```

It records the current commit, what is confirmed, what is done, what remains, and the next concrete step.

Tomorrow:

> **You:** Continue.

The new session reads NOW + handoff and resumes the recorded next step. It does not restart discovery or ask you to repeat settled decisions.

## 7. Verify: evidence is tied to the exact tree

Before saying “done”, the agent runs:

```bash
keelson check --record "revocation end-to-end" --change revoke-share-link
```

`ledger.md` now contains the command/exit results plus a worktree fingerprint.

If code changes afterward, `keelson status` marks that verification **stale**. A green result from an older tree cannot be reused as a completion claim.

The agent also maps each acceptance item to a real check. “Tests pass” is not enough when an acceptance criterion has no coverage.

## 8. Finish: review → fold truth → remove scaffolding

When tasks and acceptance are complete and evidence is fresh:

```bash
keelson land revoke-share-link
```

Keelson refuses to land if there are open questions, unchecked acceptance, stale evidence, unconfirmed assumptions, breaking changes without rollout, or spec drift.

On success:

- delta behavior folds into the main capability spec;
- durable decisions remain beside that behavior;
- temporary change scaffolding disappears by default;
- full chronology stays in Git history;
- NOW is rewritten to the current state.

The project ends with **less temporary material than during implementation**.

## 9. Fix mode: bugs do not need a fake feature process

> **You:** This endpoint returns 500 when the customer name contains emoji. Fix it.

The agent routes to **Fix**:

1. reproduce;
2. locate the failure;
3. add a negative regression check;
4. fix the cause, not the symptom;
5. run fresh verification.

If it is a small local defect, no spec or design document is invented. If the fix reveals a missing behavior contract or recurring invariant, only then does Keelson persist one.

## 10. Improve mode: repeated failure becomes a stronger control

If the same failure class keeps recurring, the agent can run:

```bash
keelson retro
```

The escalation path is deliberately narrow:

```text
one-off defect
→ recurring failure class
→ scoped rule/spec clarification
→ executable fitness check
→ remove redundant prose
```

The harness should become more precise, not simply larger.

## 11. What you use directly

### See current state

```bash
keelson status
```

Useful when you want an at-a-glance view of active changes, verification freshness, open questions, handoffs, and release state.

### Diagnose

```bash
keelson doctor
```

Doctor checks the canonical runtime, host shims, install manifest, registered hooks, project validation, evidence freshness, conflicts, and knowledge health. Findings name the repair.

### Upgrade or change coding hosts

```bash
npm install -g keelson@latest
keelson update
```

The install manifest records which generated surfaces Keelson owns. Update reconciles actual disk state toward the configured target and removes stale Keelson-owned adapters without deleting neighboring user files.

### Remove Keelson

```bash
keelson uninstall
```

This removes generated runtime/integration surfaces but keeps project facts. Use `--purge` only when you explicitly want the whole `.keelson/` directory removed.

## The mental model in one screen

```text
YOU
 │
 │ normal conversation
 ▼
CODING AGENT
 │
 ├─ Explore ───────────── read-only thinking
 ├─ Change ────────────── bound → build slices
 ├─ Fix ───────────────── reproduce → repair
 ├─ Resume ────────────── NOW + handoff
 ├─ Finish ────────────── verify → land
 └─ Improve ───────────── failure → stronger control
 │
 ▼
.keelson/
 ├─ always: intent + now + runtime + config + manifest
 ├─ on demand: roadmap / glossary / rules / specs
 └─ in flight only: change artifacts + evidence + handoff
```

The golden path is intentionally boring: **init once, talk normally, inspect status only when you want visibility.**
