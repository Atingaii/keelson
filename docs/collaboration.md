# Collaboration

Commit durable project knowledge and the change evidence that your team wants to share. Inspect logs for sensitive output first. Do not commit local keys, command trust or session bindings; these already live outside tracked project content and need no ignore rule.

Use a separate Git worktree for independent code changes. Sessions bind to a change through native identity (`CODEX_THREAD_ID` in Codex), a host bridge, or explicit `KEELSON_SESSION_ID`. Without identity, commands can select a sole active change; they refuse ambiguity. `keelson doctor --session --json` shows the actual mode.

```bash
keelson focus feature-name
keelson context --paths src/api/
keelson handoff feature-name
```

A handoff records what changed, what is uncertain and the next step. Another machine must rerun configured checks locally before landing; copying a signed record is not sufficient. Historical signatures remain inspectable through exported public keys.

Parallel changes that affect the same contract require reconciliation. `land` reports shared contracts and refuses unaccepted drift. Read the merged spec, adapt the delta and rerun checks. `--accept-drift` records the caller's explicit acceptance of the baseline movement; it does not replace fresh verification.
