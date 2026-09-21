# Day-to-day workflow

Initialize once using [the installation guide](getting-started.md), then describe the outcome to your coding agent. It reads installed guidance on demand with `keelson guide`.

**Conversation lifecycle is not work lifecycle.** A chat window ending, a question, or a follow-up does not complete or reopen a change. Durable artifacts hold the requested outcome and evidence; session state is only a focus pointer.

1. Read current intent, nearby code and affected contracts. Do not inventory the whole repository.
2. Automatically assess discovery depth from the request and repository evidence. Reuse settled decisions and investigate facts; unclear goals, connected choices or high-impact commitments trigger a deeper decision-tree interview, one question for a simple gap or the whole ready frontier in a complex round, with recommendations and reasons. No special phrase or mode is needed.
3. Create the smallest useful quick or spec change, define observable acceptance, then automatically run `keelson start` and load the implementation context.
4. Automatically load domain/architecture guidance for the relevant decisions and UI/UX guidance when an affected path includes an interface. Implement, independently review with the check context, and verify the affected user journey without asking the user to invoke individual skills. Keep task planning proportional to the change.
5. Review configured shell commands and use `keelson check --trust --record` for first execution. Complete acceptance before the final check.
6. If every gate passes, run `keelson land` within existing authorization. Commit code, contracts and the archived evidence together.

An independent follow-up gets a new change. A same-goal clarification stays with the existing one. Resume with `keelson focus --auto`; ambiguous choices require explicit focus. Use `handoff` for a real ownership or machine transfer.

A failed check stays failed. A missing environment is reported as a limitation. Neither a model's confidence nor prose in a ledger turns a failed or partial run into evidence. [Trust and recovery](verification.md).
