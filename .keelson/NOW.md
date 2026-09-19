# Now

0.3.x harness hardening now includes a human and portability layer: `.keelson/README.md` gives people a stable map into the project facts; every init writes the portable `AGENTS.md` + `.agents/skills/keelson/` surface in addition to selected host-specific surfaces; Copilot CLI is auto-detected. The existing ORIENT → BOUND → BUILD → SENSE → RECONCILE loop, assumption frontier, and LF/CRLF invariants remain unchanged.

## Blocked / uncertain
- Codex end-to-end run is blocked by the account usage limit until 2026-09-20 16:51; only skill loading is confirmed there.
- Several platform entries remain `convention` confidence until exercised in real sessions; the portable `.agents/skills/` layer provides the fallback for compatible hosts.
- Two agents writing the same branch at the same moment has not been exercised; parallel work was verified against a pre-seeded in-flight change.

## Next
Run the full CI matrix for the human-map/portable-layer change, then run Codex end-to-end when the limit lifts and the continuous-evolution test with session breaks, requirement revision, parallel work, and a merge conflict. Tune retro thresholds from those real ledgers.
