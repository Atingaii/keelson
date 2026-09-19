# Roadmap

## Now
Make the common path almost invisible: `keelson init` once, then natural-language work. Keep the standing control plane small, create project knowledge and change artifacts only when they carry information, and route agent behavior through six user intents rather than a long list of mechanisms.

Preserve the reliability foundation: one canonical runtime under `.keelson/`, seven first-class CLI hosts plus the portable Agent Skills layer, `manifest.json` desired-state ownership, recoverable update, drift diagnostics, revision-bound verification, and explicit landing gates.

## Next
- Validate the minimal-init / progressive-artifact model on Ubuntu, macOS, and Windows with package smoke.
- Run end-to-end field changes on OpenCode, Pi, Gemini CLI, Kiro CLI, and CodeBuddy CLI; repeat Codex through a complete change.
- Run a continuous-evolution scenario with session breaks, changed requirements, host switching, interrupted/retried update, parallel branch, and merge conflict.
- Measure which documents/rules are actually read and useful; remove controls that add context without preventing an observed failure.

## Later
- Add a first-class host only when its discovery paths are primary-source backed or exercised and it passes the full lifecycle contract.
- Add host-specific capabilities only when they measurably improve state injection or feedback without duplicating canonical guidance.
- Prefer deleting process to adding it: a mechanically enforced invariant should replace redundant prose.
