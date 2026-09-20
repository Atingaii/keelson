# Day-to-day workflow

Initialize once using [the installation guide](getting-started.md), then describe the outcome to your coding agent. It reads installed guidance on demand with `keelson guide`.

**Conversation lifecycle is not work lifecycle.** A chat window ending, a question, or a follow-up does not complete or reopen a change. Durable artifacts hold the requested outcome and evidence; session state is only a focus pointer.

1. Read current intent, nearby code and affected contracts. Do not inventory the whole repository.
2. Reuse settled decisions. Investigate facts and choose reversible engineering details; ask only material unresolved user choices, at most three independent ready questions.
3. Create a quick or spec change when the work needs durable tracking. Define observable acceptance before implementation.
4. Implement and review. Keep task planning proportional to the change.
5. Review configured shell commands and use `keelson check --trust --record` for first execution. Complete acceptance before the final check.
6. If every gate passes, run `keelson land` within existing authorization. Commit code, contracts and the archived evidence together.

An independent follow-up gets a new change. A same-goal clarification stays with the existing one. Resume with `keelson focus --auto`; ambiguous choices require explicit focus. Use `handoff` for a real ownership or machine transfer.

A failed check stays failed. A missing environment is reported as a limitation. Neither a model's confidence nor prose in a ledger turns a failed or partial run into evidence. [Trust and recovery](verification.md).
