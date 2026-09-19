# Now

0.3.x is converging on reliability rather than adapter count. Full Keelson guidance lives only in `.keelson/workflow.md` and `.keelson/skill/`; generated discovery surfaces are ownership-tracked in `.keelson/.managed.json`, reconciled on update, drift-checked by doctor, and package-owned directories are replaced recoverably.

Official host support is intentionally bounded to seven first-class CLIs: Claude Code, Codex CLI, OpenCode, Pi, Gemini CLI, Kiro CLI, and CodeBuddy CLI, plus the portable `AGENTS.md + .agents/skills/` fallback. Guessed convention-only adapters are retired and their identifiable legacy Keelson surfaces migrate away safely.

## Blocked / uncertain
- Claude Code has end-to-end usage evidence; Codex has skill-loading evidence. OpenCode, Pi, Gemini CLI, Kiro CLI, and CodeBuddy CLI currently rely on their host documentation plus Keelson's shared adapter/lifecycle contract rather than a claimed full end-to-end session.
- Two agents writing the same branch at the same moment has not been exercised; parallel work was verified against a pre-seeded in-flight change.
- Long-run continuous evolution across several real changes, interrupted updates, host switching, and later resumption still needs broader field evidence.

## Next
Exercise one real end-to-end change on each remaining first-class host. Run the continuous-evolution scenario with session breaks, requirement revision, parallel work, host switching, an interrupted/retried update, and a merge conflict. Tune retro/health thresholds from those real ledgers; do not expand the first-class platform matrix until a new host meets the same evidence and lifecycle bar.
