# Now

0.3.x harness hardening is integrated: the resident map stays thin; BOUND audits material assumptions at the decision frontier and asks at most one load-bearing user question; ORIENT → BOUND → BUILD → SENSE → RECONCILE remains the operating loop. Markdown and generated agent surfaces now have one cross-platform invariant: LF and CRLF parse with identical semantics, while package-owned rendered Markdown emits LF. The full GitHub Actions matrix is green on Ubuntu, macOS, and Windows with Node 20 and 22.

## Blocked / uncertain
- Codex end-to-end run is blocked by the account usage limit until 2026-09-20 16:51; only skill loading is confirmed there.
- Registry entries for Codex, Cursor, and OpenCode are empty until their alias conventions are confirmed.
- Two agents writing the same branch at the same moment has not been exercised; parallel work was verified against a pre-seeded in-flight change.

## Next
Run the Codex end-to-end test when the limit lifts, then the continuous-evolution test with several changes, session breaks, a requirement revision, parallel work, and a merge conflict. Tune retro thresholds from those real ledgers, then publish 0.3.0 once NPM_TOKEN is set in repository secrets.
