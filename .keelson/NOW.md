# Now

Keelson is being simplified around one golden path: initialize once, then keep using the coding agent normally. The standing `.keelson/` control plane is now intentionally minimal; project knowledge and change artifacts grow only when they carry real information. The canonical Skill routes six user intents (Explore, Change, Fix, Resume, Finish, Improve) instead of exposing its reference library as the user mental model.

The single runtime and seven-host first-class support contract remain intact. Generated discovery surfaces are ownership-tracked in `.keelson/manifest.json`, reconciled on update, drift-checked by doctor, and package-owned directories are replaced recoverably.

## Blocked / uncertain
- Claude Code has end-to-end usage evidence; Codex has Skill-loading evidence. OpenCode, Pi, Gemini CLI, Kiro CLI, and CodeBuddy CLI still rely on host documentation plus the shared lifecycle contract rather than a claimed end-to-end field run.
- The new minimal-init / progressive-artifact behavior still needs the full Windows/macOS/Linux CI matrix and package smoke before landing.
- Long-run continuous evolution across several real changes, interrupted updates, host switching, and later resumption still needs broader field evidence.

## Next
Run the complete CI matrix for the golden-path redesign, then exercise one real end-to-end change on each remaining first-class host. After that, run the continuous-evolution scenario with session breaks, requirement revision, parallel work, host switching, interrupted/retried update, and merge conflict. Expand the product only when field evidence exposes a real missing control.
