# Now

0.3.x usability and portability hardening is complete. `.keelson/README.md` gives people a stable 30-second map into NOW, INTENT, specs, rules, and active changes. Every init now writes the portable `AGENTS.md` + `.agents/skills/keelson/` surface alongside selected host-specific surfaces, so compatible future agents can pick Keelson up without restructuring the repository. Copilot CLI is auto-detected, and the full GitHub Actions matrix is green on Ubuntu, macOS, and Windows with Node 20 and 22.

## Blocked / uncertain
- Codex end-to-end run is blocked by the account usage limit until 2026-09-20 16:51; only skill loading is confirmed there.
- Several named platform adapters remain `convention` confidence until exercised in real sessions; the portable `.agents/skills/` layer is the interoperability fallback where the host supports the Agent Skills convention.
- Two agents writing the same branch at the same moment has not been exercised; parallel work was verified against a pre-seeded in-flight change.

## Next
Run Codex end-to-end when the limit lifts, then the continuous-evolution test with session breaks, requirement revision, parallel work, and a merge conflict. Exercise more convention-confidence hosts in real sessions and promote only observed/documented paths.
