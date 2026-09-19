# Agent guidance and templates

- `SKILL.md` stays under 80 lines. Add detail to a reference, not to the entry.
- Every guidance section in `references/` carries `<!-- keelson: id=… | without: … | sunset: … -->`. No annotation, no section.
- Optional depth goes inside `<!-- guided -->…<!-- /guided -->` so the lean profile can strip it.
- Headings that the CLI parses (`## Why`, `## Requirement:`, `### Verify:`, `(effort: …)`, and the rest listed in `src/lib/markdown.js`) stay in English in both language mirrors.
- `skills/zh/` mirrors `skills/keelson/` file for file; a change to one is a change to both.
