# Now

The continuous-conversation lifecycle redesign is implemented on top of the golden path. Keelson now separates three lifetimes: project truth, durable change/work item, and ephemeral conversation focus. Users can keep asking questions indefinitely; session/window lifetime never marks work complete. A change becomes `ready` only when durable acceptance/gates and current-tree verification say so, and the Agent lands it without waiting for a “done” phrase.

Claude Code has a verified native session bridge: raw host session ids are never stored, an opaque local pointer lives under `.keelson/.runtime/sessions/`, and later Keelson CLI commands in that conversation resolve the same focus. Other first-class hosts currently expose degraded session focus until a host-specific bridge is implemented and verified; durable work remains correct and ambiguous selection is never guessed.

## Blocked / uncertain
- OpenCode, Pi, Gemini CLI, Kiro CLI, CodeBuddy CLI and Codex still need verified Keelson session adapters before they can move from `degraded` to `native`; Kiro and CodeBuddy document session ids in hooks, while Codex hook behavior differs by mode/version and must be exercised before being promoted.
- Long-run continuous evolution across parallel sessions, changed requirements, interrupted updates, host switching, and merge conflicts still needs field evidence.
- A session pointer improves routing only; it is intentionally not a distributed lock or project-management ownership system.

## Next
Pass the full Ubuntu/macOS/Windows matrix for the session-runtime redesign. Then implement/field-test session adapters one host at a time, promoting a host to `native` only after real lifecycle evidence. Run parallel-session and long-running conversational scenarios specifically looking for cross-wired verification/landing.
