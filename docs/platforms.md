# Platform support

Claude Code, Codex CLI and CodeBuddy CLI are the primary supported hosts. Initialize one with `keelson init --claude`, `--codex` or `--codebuddy`; use `--tools claude,codex,codebuddy` when a repository serves all three. The agent then runs the same discovery, implementation, review and verification workflow from ordinary requests.

| Host | Project entry | Native workflow hooks | Session identity |
| --- | --- | --- | --- |
| Claude Code | `CLAUDE.md`, `.claude/skills/keelson` | `.claude/settings.json`: file gate, Agent/Task phase context, prompt and session recovery | Hook bridge |
| Codex CLI | `AGENTS.md`, `.agents/skills/keelson` | `.codex/hooks.json`: `apply_patch` gate, child task binding guidance, prompt and session recovery | `CODEX_THREAD_ID` |
| CodeBuddy CLI | `CODEBUDDY.md`, `.codebuddy/skills/keelson` | `.codebuddy/settings.json`: file gate, Task phase context, prompt and session recovery | Bash/PowerShell hook bridge |
| OpenCode | `AGENTS.md`, `.agents/skills/keelson` | Shared CLI guidance | Explicit fallback |
| Gemini CLI | `GEMINI.md`, `.agents/skills/keelson` | Shared CLI guidance | Explicit fallback |
| Kiro CLI | `AGENTS.md`, `.kiro/skills/keelson` | Shared CLI guidance | Explicit fallback |
| Pi | `AGENTS.md`, `.agents/skills/keelson` | Shared CLI guidance | `PI_SESSION_ID` |
| Portable Agent Skills | `AGENTS.md`, `.agents/skills/keelson` | Shared CLI guidance | Explicit fallback |

Use current host versions with the documented hook events. In Codex, trust the project and review the generated hooks in `/hooks` when prompted. Keelson registers hooks but never bypasses trust, alters global settings or grants tool approval. If hooks are disabled, untrusted or unsupported by an older host, project instructions and Skills still provide the CLI workflow, without native event enforcement. Restart an already-open host after initialization if it has not loaded the new project configuration.

`keelson update` refreshes package-owned registrations and preserves neighboring user settings and hooks. `--no-hooks` removes Keelson registrations. Run `keelson platforms --json` and `keelson doctor --session --json` to inspect the installation. Doctor validates registration and available session identity; it does not certify that the host has trusted or executed a hook.

Codex child events use `agent_id`, matching their own `CODEX_THREAD_ID`; `session_id` identifies the shared root and cannot identify the direct parent. For tracked work, the spawning agent includes `KEELSON_CHANGE=<name>` in the child task. At startup the child automatically binds that change with `keelson focus` and reads its phase pack using `keelson context`; these are agent operations, not user steps. Subsequent hooks use that child's focus. Child tool events repeat context without cache suppression because child compaction/resume does not emit SessionStart. Untracked read-only investigation needs no marker. Events without `agent_id` use `session_id` and cannot isolate a child from the root.

All three adapters have installation, upgrade and protocol-event tests. Codex's native session identity has also been exercised locally. These checks do not establish live model effectiveness or full host parity. See [automation boundaries](automation.md) for covered tools and independent-review limits.

Protocol sources: [Claude Code hooks](https://code.claude.com/docs/en/hooks), [Codex hooks](https://learn.chatgpt.com/docs/hooks), [Codex project Skills](https://learn.chatgpt.com/docs/build-skills), [CodeBuddy CLI hooks](https://www.codebuddy.ai/docs/cli/hooks).
