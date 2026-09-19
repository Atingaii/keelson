# Hook scripts

- Zero dependencies, Node built-ins only; they run in projects where `keelson` may not be installed.
- Print to stdout only what the agent needs this turn. Session start: ≤ 1,500 characters. Per prompt: one line or nothing.
- Never exit non-zero for a missing `.keelson/`; exit 0 silently.
- Treat LF and CRLF identically when reading project Markdown; normalize in-memory before matching sections.
