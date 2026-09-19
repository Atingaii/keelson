# Now

The golden-path redesign is implemented and cross-platform verified. Keelson now presents one user-facing workflow: initialize once, then keep using the coding agent normally. The standing `.keelson/` control plane is intentionally minimal; optional project knowledge and change artifacts appear only when they carry real information. The canonical Skill routes six user intents (Explore, Change, Fix, Resume, Finish, Improve), while detailed references remain an internal capability library.

The reliability foundation remains unchanged: one canonical runtime, seven first-class CLI hosts plus the portable Agent Skills layer, `manifest.json` desired-state ownership, recoverable update, drift diagnostics, revision-bound verification, and explicit landing gates.

Verification for this redesign passed the full Ubuntu/macOS/Windows × Node 20/22 matrix, repository self-validation, and package smoke.

## Blocked / uncertain
- Claude Code has end-to-end usage evidence; Codex has Skill-loading evidence. OpenCode, Pi, Gemini CLI, Kiro CLI, and CodeBuddy CLI still rely on host documentation plus the shared lifecycle contract rather than a claimed end-to-end field run.
- Long-run continuous evolution across several real changes, interrupted updates, host switching, and later resumption still needs broader field evidence.
- Two agents writing the same branch at the same moment has not been exercised; Keelson exposes semantic overlap but is not a distributed lock.

## Next
Exercise one real end-to-end change on each remaining first-class host. Then run the continuous-evolution scenario with session breaks, requirement revision, parallel work, host switching, interrupted/retried update, and merge conflict. Use that field evidence to remove ineffective guidance before adding any new control.
