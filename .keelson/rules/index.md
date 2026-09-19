# Rules index

One line per scope: a path glob, an arrow, and the rule file in this directory. The agent reads only the rules whose glob matches the files it is about to touch.

- `**` → general.md — applies to every change
- `src/**` → src.md — CLI and library code
- `skills/**` → skills.md — agent guidance and templates
- `hooks/**` → hooks.md — hook scripts
