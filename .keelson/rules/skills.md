# Agent guidance and templates

- `SKILL.md` stays under 60 lines and acts as a router. Guidance ships in `skills/keelson/` and `skills/zh/keelson/`; read the operating loop with `keelson guide workflow`. Project facts live in `.keelson/`; copying guidance there requires explicit vendoring. Host skill directories contain discovery shims only; add task-specific depth to canonical references, never to a shim.
- Every guidance section in `references/` carries `<!-- keelson: id=… | without: … | sunset: … -->`. No annotation, no section.
- Optional depth goes inside `<!-- guided -->…<!-- /guided -->` so the lean profile can strip it.
- Headings that the CLI parses (`## Why`, `## Requirement:`, `### Verify:`, `(effort: …)`, and the rest listed in `src/lib/markdown.js`) stay in English in both language mirrors.
- `skills/zh/` mirrors `skills/keelson/` file for file; a change to one is a change to both.
