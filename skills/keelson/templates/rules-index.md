# Rules index

One line per scope: a path glob, an arrow, and the rule file in this directory. The agent reads only the rules whose glob matches the files it is about to touch. Use `**` for rules that always apply.

- `**` → general.md — applies to every change
