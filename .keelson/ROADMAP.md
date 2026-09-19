# Roadmap

## Now
0.3.x usability and portability: project state must be readable by people without knowing Keelson internals, and one init must remain portable across agent hosts. Done when `.keelson/README.md` is generated/refreshed safely, Claude-only init still installs the `.agents/skills/` compatibility layer, the platform registry auto-detects Copilot CLI, docs describe the same behavior, and the cross-platform CI matrix is green.

## Next
- Continuous-evolution test: several changes in one project with session breaks, a requirement revision, a parallel branch, and a merge conflict; compare against a bare agent.
- Codex end-to-end run when the account limit lifts; exercise more `convention` platform adapters and promote only observed/documented paths to higher confidence.
- Retro thresholds tuned on real ledgers rather than guesses.

## Later
- Per-tool adapters beyond files the tool already reads, only where a tool offers a hook or context mechanism worth using.
