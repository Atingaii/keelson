# Keelson documentation

Keelson is designed around one golden path: **initialize once, then keep using your coding agent normally**. The CLI maintains project state and evidence underneath that conversation.

## Start

1. [Getting started](getting-started.md) — install and initialize.
2. [User flow](user-flow.md) — the complete day-to-day lifecycle with examples.
3. [Concepts](concepts.md) — the mental model: intent, changes, evidence, reconciliation.
4. [How it works](how-it-works.md) — runtime, discovery shims, manifest, hooks, and on-disk behavior.

## Guides

- [Existing projects](existing-projects.md) — adopt Keelson without duplicating your existing docs.
- [Collaboration](collaboration.md) — sessions, people, parallel changes, handoffs, worktrees.
- [Verification](verification.md) — evidence, worktree fingerprints, stale checks.
- [Effort tiers and models](models.md) — `light | standard | deep` without dated model IDs.
- [Frontend design](frontend.md) — design actions, interaction states and browser verification.

## Reference

- [Configuration](configuration.md)
- [CLI](cli.md)
- [FAQ](faq.md)
- [Platform support](platforms.md)

## What users normally run

Most users only need:

```bash
keelson init       # once
keelson status     # optional visibility
keelson doctor     # diagnose
keelson update     # after upgrading / changing hosts
keelson uninstall  # remove generated integration surfaces
```

Commands such as `context`, `impact`, `new`, `check`, `handoff`, and `land` exist primarily for the coding agent. You do not need to memorize them.
