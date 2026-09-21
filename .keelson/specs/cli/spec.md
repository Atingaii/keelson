---
layout: sharded
requirements_dir: requirements
decisions_dir: decisions
---
# cli

## Purpose

Maintains `.keelson/` and the generated surfaces; every command is safe to run repeatedly.

- `requirements/` — 23 current requirement file(s); read only relevant files
- `decisions/` — 12 capability-local durable decision file(s)
