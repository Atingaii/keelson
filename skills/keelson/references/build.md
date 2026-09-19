# Building

Execute `tasks.md`. You choose how; these notes cover the parts that are easy to get wrong.

## Rulings, not stalls
<!-- keelson: id=build.rulings | without: agent parks the session on questions the plan already answers; or decides silently and the reasoning is lost | sunset: never -->

The plan is the argument; `specs/` and `INTENT.md` are the authority; your judgment settles what neither answers. When you hit ambiguity or a plan defect, decide, record it, and keep going:

```markdown
### Ruling: ack semantics
At-least-once with idempotent consumers. Exactly-once would need a broker feature we do not run. Cost if wrong: duplicate side effects in `notify`, bounded by the idempotency key.
```

Four things stop you, and only these: an irreversible or destructive operation; a security-sensitive action; a side effect outside the working tree that convention says to ask about (merge, push to shared branch, publish, external calls); a plan so broken every path forward is a guess.

## Subagents by effort tier
<!-- keelson: id=build.dispatch | without: one context does everything, quality drops as it fills, and cost is flat regardless of task difficulty | sunset: when the host has no subagent tool, this section is inert -->

When tasks are mostly independent and the host offers subagents, dispatch a fresh subagent per task with the model resolved from its effort tier: `keelson models --resolve <tier>` prints the alias for this platform (or map tiers onto the aliases your subagent tool exposes, in ascending capability order). Give the subagent the task text, the matched rules, the relevant spec, and the verification command. Never hand it your whole conversation.

After each task, a reviewer subagent (tier ≥ `standard`, never below the implementer) checks spec compliance and code quality against the diff. Record both in the ledger:

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

## Keep the artifacts true while you work
<!-- keelson: id=build.update-artifacts | without: tasks.md and change.md describe the plan, not what happened; the next session trusts stale text | sunset: never -->

Tick tasks as they are verified, not as they are written. When the design changes mid-build, edit `change.md` and, if behaviour changed, the delta spec. Nothing is locked; the only rule is that the files reflect reality at every commit.

<!-- guided -->
## Test-first when behaviour is specified
Where a scenario exists in the delta spec, write the failing test from the scenario first, watch it fail, implement, watch it pass. Where no scenario exists, judge whether a test is the cheapest evidence.

## Narration
Between tool calls, at most one short line. The ledger and tool output carry the record.
<!-- /guided -->
