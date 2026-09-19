# Now

0.3.x uses a single project-local runtime authority. Full Keelson guidance lives only in `.keelson/workflow.md` and `.keelson/skill/`; `AGENTS.md`, `CLAUDE.md`, portable/native skill paths, and optional host rule files are discovery shims that point back to that runtime. The human project map, init/update/doctor/retro/uninstall behavior, English/Chinese docs, and dogfood repository all follow the same layout.

## Blocked / uncertain
- Codex end-to-end run is blocked by the account usage limit until 2026-09-20 16:51; only skill loading is confirmed there.
- Several named platform adapters remain `convention` confidence until exercised in real sessions; all of them now share the same canonical `.keelson/` runtime.
- Two agents writing the same branch at the same moment has not been exercised; parallel work was verified against a pre-seeded in-flight change.

## Next
Run the continuous-evolution test with session breaks, requirement revision, parallel work, and a merge conflict. Run Codex end-to-end when the account limit lifts; exercise convention-confidence hosts in real sessions and promote only observed/documented discovery paths. Tune retro thresholds from real ledgers rather than guesses.
