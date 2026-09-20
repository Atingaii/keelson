# Platform support

The registry describes generated integration and session capabilities. Adapter tests exercise file paths, ownership and JSON updates. They do not replace a live session in the actual host.

| Host | Discovery | Session identity | Live evaluation in this remediation |
|---|---|---|---|
| Codex CLI | `AGENTS.md`, `.agents/skills/keelson` | `CODEX_THREAD_ID` | Local Codex benchmark |
| Claude Code | `CLAUDE.md`, `.claude/skills/keelson` | Installed hook bridge | Adapter tests only |
| OpenCode | `AGENTS.md`, `.agents/skills/keelson` | Explicit fallback | Adapter tests only |
| Gemini CLI | `GEMINI.md`, `.agents/skills/keelson` | Explicit fallback | Adapter tests only |
| Kiro CLI | `AGENTS.md`, `.kiro/skills/keelson` | Explicit fallback | Adapter tests only |
| CodeBuddy CLI | `CODEBUDDY.md`, `.codebuddy/skills/keelson` | Bridge/environment when available | Adapter tests only |
| Pi | `AGENTS.md`, `.agents/skills/keelson` | Host environment | Adapter tests only |
| Portable Agent Skills | `AGENTS.md`, `.agents/skills/keelson` | Explicit fallback | File contract only |

Run `keelson platforms --json` and `keelson doctor --session --json` for the actual installation. `--tools agents` explicitly requests portable integration; choosing Claude does not silently add the portable host.
