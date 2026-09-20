# Now

The continuous-conversation lifecycle redesign is implemented on top of the golden path. Keelson separates project truth, durable changes/work items, and ephemeral conversation focus. Users can keep asking questions indefinitely; session/window lifetime never marks work complete. A change becomes `ready` only when durable acceptance/gates and current-tree verification say so, and the Agent lands it without waiting for a “done” phrase.

Native session focus is now implemented for four first-class hosts:
- Claude Code — SessionStart/UserPromptSubmit bridge + `CLAUDE_ENV_FILE`; raw session ids are never stored.
- OpenCode — one project plugin injects opaque `KEELSON_SESSION_ID` into Bash commands.
- Pi — zero adapter files; Keelson uses Pi's built-in `PI_SESSION_ID` and hashes it before local storage.
- CodeBuddy — SessionStart/UserPromptSubmit + Bash/PowerShell PreToolUse bridge; unrelated settings/hooks are preserved.

Codex CLI, Gemini CLI, and Kiro CLI remain deliberately degraded until Keelson has a deterministic, field-verified bridge. Degraded mode keeps durable work correct and refuses ambiguous automatic focus.

## Blocked / uncertain
- The new four-host session runtime and adapter lifecycle still need the full Ubuntu/macOS/Windows × Node 20/22 CI matrix and package smoke on this branch.
- Codex, Gemini CLI, and Kiro CLI still need native session adapter evidence before promotion; API existence alone is not enough.
- Long-running parallel sessions, changed requirements, interrupted updates, host switching, and merge conflicts still need field evidence.
- Session focus improves routing only; it is intentionally not a distributed lock or backlog/ownership system.

## Next
Run the full CI matrix. If green, exercise real parallel conversations on Claude/OpenCode/Pi/CodeBuddy, then implement native adapters for the remaining hosts one at a time only where the host contract is deterministic. Use those field runs to remove unnecessary context injection before adding new process.
