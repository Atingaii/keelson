# Keelson workflow

Project truth and durable work live under `.keelson/`. Machine-local focus, trust and keys live in Git’s private runtime directory; durable signed records and logs stay with each change. A **session is not a task**: it only points at the work item this conversation is currently about.

Every modifying request follows **ORIENT → BOUND → BUILD → SENSE → RECONCILE**.

- **ORIENT** — inspect the worktree and current session focus. Same-goal follow-ups keep the focused change. For “continue”, run `keelson focus --auto`; never bind an ambiguous session silently.
- **BOUND** — read before asking. Use `interview.md` to automatically deepen discovery when the goal is unclear, product choices are connected or high-impact commitments remain unresolved; no special prompt is needed. Resolve repository facts and reversible engineering choices yourself; ask one ready owner decision for a simple gap or the whole ready frontier for connected uncertainty with recommendations and reasons. Clear tasks proceed directly. Trivial: minimal quick change; quick: smallest useful change; spec: acceptance + behavior delta + plan. Inspect only risk lenses actually triggered by the work.
- **BUILD** — automatically pass `keelson start`, load `keelson context --phase implement`, then implement one vertical slice at a time. A new independent requested outcome gets a new change; continuing questions about the same outcome do not.
- **SENSE** — cheap checks early; completion requires fresh `keelson check --record` evidence on the current tree. Task checkboxes describe the current plan; they never decide completion.
- **RECONCILE** — evaluate lifecycle after each modifying pass from acceptance, blockers, rollout/compatibility, and fresh verification. Before landing, silently perform any internal knowledge maintenance surfaced by context: rewrite singleton current-state docs, split/dedupe rules, and let `land` auto-shard large specs. If gates are satisfied, status becomes `ready` and the agent lands automatically; do not wait for the user to say “done” or expose maintenance ceremony.
- Ending a session, going idle, compaction, or closing the window changes only session runtime state. It never completes, cancels, or lands durable work.
- `handoff.md` is reserved for real transfer across people/machines or deliberate ownership change. Normal new sessions reconstruct from change/task/ledger state and optional session focus.
- Create artifacts lazily. Empty documents are not progress.
- When creating or maintaining project memory, automatically load `writing.md`; lead with its useful state/outcome and next action where relevant, with links to complete detail and evidence.
- Repeated failure classes become scoped rules or executable fitness checks; shrink prose after automation carries the invariant.
- First contact derives `INTENT.md` from repository evidence; ask the owner only if an unresolved project boundary is load-bearing for current work. Specs/rules grow only when real work exposes durable truth.

The package router is `keelson guide`. It classifies conversation intent; lifecycle transitions are derived from work state, not user phrasing. A project may vendor it only with `keelson init --vendor`.
