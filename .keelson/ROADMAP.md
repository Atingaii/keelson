# Roadmap

## Now
Make Keelson correct and low-friction even when users never announce task boundaries. Conversation focus is machine-local; durable change lifecycle is committed; `ready` is derived from acceptance/gates and current-tree evidence; explicit handoff is reserved for true ownership/machine transfer.

Native session focus currently covers Claude Code, OpenCode, Pi, and CodeBuddy. Codex, Gemini CLI, and Kiro CLI use safe degraded focus until a deterministic bridge is implemented and exercised.

## Next
- Pass Ubuntu/macOS/Windows × Node 20/22 CI, repository dogfood validation, and package smoke for the session-runtime redesign.
- Field-test two simultaneous windows and topic switching on Claude/OpenCode/Pi/CodeBuddy, including no finish phrase, close/reopen, verification, and automatic ready→land.
- Add native Codex/Gemini/Kiro focus only after deterministic lifecycle evidence; never promote from API docs alone.
- Measure token/context overhead from session hints and trim any injection that does not prevent an observed failure.

## Later
- Keep host capabilities explicit (`discovery`, `sessionFocus`, hooks/plugins) instead of pretending every first-class host has identical powers.
- Prefer safe degradation and explicit ambiguity over a global mutable current-task pointer.
- Delete prose/process when a mechanical invariant fully replaces it.
