# Building

Execute `tasks.md` slice by slice. You choose how; these notes cover the parts that are easy to get wrong.

## Rulings, not stalls
<!-- keelson: id=build.rulings | without: agent parks the session on questions the plan already answers; or decides silently and the reasoning is lost | sunset: never -->

The plan is the argument; the specs and `INTENT.md` are the authority; your judgment settles what neither answers, within `INTENT.md → Authorizations`. When you hit ambiguity or a plan defect inside your authorization, decide, record it, and keep going:

```markdown
### Ruling: ack semantics
At-least-once with idempotent consumers. Exactly-once would need a broker feature we do not run. Cost if wrong: duplicate side effects in `notify`, bounded by the idempotency key.
```

Outside your authorization, it is an open question: add it to `change.md → Open questions` with what it blocks, and build the slices it does not block. Four things stop you outright: an irreversible or destructive operation; a security-sensitive action; a side effect outside the working tree that convention says to ask about (merge, push to a shared branch, publish, external calls); a plan so broken every path forward is a guess.

## Subagents by effort tier
<!-- keelson: id=build.dispatch | without: one context does everything, quality drops as it fills, and cost is flat regardless of task difficulty | sunset: when the host has no subagent tool, this section is inert -->

When tasks are mostly independent and the host offers subagents, dispatch a fresh subagent per task with the model resolved from its effort tier: `keelson models --resolve <tier>` prints the alias for this platform (or map tiers onto the aliases your subagent tool exposes, in ascending capability order). Give the subagent the task text, the matched rules, the relevant spec, and the verification command. Never hand it your whole conversation.

After each task, a reviewer subagent (tier ≥ `standard`, never below the implementer) checks the diff against the spec and the rules. Record both in the ledger:

```markdown
### Dispatch: task 2 → standard (sonnet)
Result: pass
Implemented paged query; reviewer accepted. Verify `npm test -- orders.repo` exit 0.
```

The first line of a `Dispatch:` body is `Result: pass` or `Result: fail`; `keelson retro` counts only that line, never words in the prose.

If the task's verification fails twice at a tier, escalate one tier and re-dispatch; log it:

```markdown
### Escalate: task 2 light → standard
Two failures on boundary handling; light-tier output ignored the empty-page case.
```

Escalation is for work that came back wrong. It is not for dispatches that never ran: a rate limit, a timeout, or a tool error is retried once at the same tier after a short pause, then the task is done inline by you and noted (`### Note: task 3 inline after two dispatch errors`). `deep` is the top tier; nothing escalates above it, and a `deep` verification failure stops and asks. Tightly coupled tasks, or no subagent tool: run inline yourself, still one task at a time, still ledgered.

## Parallel work
<!-- keelson: id=build.parallel | without: two writers on one branch overwrite each other, or two changes implement the same contract two ways | sunset: never -->

When more than one writer (person or agent) works at once, each change gets its own branch or worktree (`keelson new --worktree`). Shared interfaces are aligned before either side implements them: agree the contract in the delta spec, land or reference it, then build. `keelson status` warns when two active changes touch the same capability or the same declared paths; treat that as "talk first", not as a lock. A file on disk is not a distributed lock and a branch does not remove semantic conflicts; cross-machine claiming and merge control belong to the tracker, pull requests, and CI. After integrating someone else's change into yours, re-run verification; the old evidence is stale by definition.

When the other owner cannot be reached (an unattended run, a colleague offline), do not wait and do not pretend the overlap is absent: keep your delta to the shared requirement as small as the change allows, record the overlap as a `### Note:` in your ledger and a line in `NOW.md`, and say it in your write-back and completion report. `keelson land` names the overlapping changes when you land; their landing will stop at the drift gate until their owner re-reads the merged spec.

## Keep the artifacts true while you work
<!-- keelson: id=build.update-artifacts | without: tasks.md and change.md describe the plan, not what happened; the next session trusts stale text | sunset: never -->

Tick tasks as they are verified, not as they are written. Tick acceptance items when their check has run. When the design changes mid-build, edit `change.md` and, if behaviour changed, the delta spec. Nothing is locked; the only rule is that the files reflect reality at every commit. If you stop before the change is done, `keelson handoff <name>` and fill it in (see `handoff.md`).

<!-- guided -->
## Test-first when behaviour is specified
Where a scenario exists in the delta spec, write the failing test from the scenario first, watch it fail, implement, watch it pass. Where no scenario exists, judge whether a test is the cheapest evidence. Visual exploration and unknown APIs may start with a small prototype instead.

## Narration
Between tool calls, at most one short line. The ledger and tool output carry the record.
<!-- /guided -->
