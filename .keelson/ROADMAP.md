# Roadmap

## Now
Harden the single-root runtime and seven-host first-class support contract. The canonical runtime is `.keelson/workflow.md + .keelson/skill/`; host files are discovery shims only. Generated surfaces are reconciled as desired state, updates preserve the last complete runtime until replacement is ready, doctor detects drift with a repair path, and hook preference is persistent.

First-class hosts: Claude Code, Codex CLI, OpenCode, Pi, Gemini CLI, Kiro CLI, CodeBuddy CLI. Everything else uses the portable `AGENTS.md + .agents/skills/` layer until it can meet the same documentation/evidence, lifecycle, and cross-platform test bar.

## Next
- End-to-end field run on OpenCode, Pi, Gemini CLI, Kiro CLI, and CodeBuddy CLI; repeat Codex through a complete change.
- Continuous-evolution test: several changes with session breaks, requirement revision, host switching, interrupted/retried update, parallel branch, and merge conflict; compare recovery quality against a bare agent.
- Tune retro and knowledge-health thresholds on real ledgers, keeping only signals that produce actionable repairs.

## Later
- Add a first-class host only when its discovery paths are primary-source backed or exercised and it passes the same init/update/doctor/uninstall/cross-platform contract.
- Add host-specific capabilities only where the host exposes a lifecycle/context mechanism with measurable value; never duplicate canonical guidance to gain a badge in the support table.
