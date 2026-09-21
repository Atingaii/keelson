# Hook scripts

- Hooks execute from the installed npm package through `keelson hook`; project adapters contain commands only. Use Node built-ins and existing package libraries; no new runtime dependency.
- Session/prompt hooks deliver current workflow guidance and the focused change's declared context. File/subagent hooks inject the relevant phase. Do not duplicate unrelated project data or claim host parity from protocol tests.
- Preserve host permission checks: emit a deny for a workflow blocker, otherwise leave the permission decision unset. Respect each host's input/output protocol; never add an allow just to rewrite arguments.
- Never exit non-zero for a missing `.keelson/`; exit 0 silently.
- Treat LF and CRLF identically when reading project Markdown; normalize in-memory before matching sections.
