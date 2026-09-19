---
name: keelson
description: Engineering collaboration layer for coding work in repositories that have a .keelson/ directory. Use whenever the user asks to build, add, change, refactor, fix, debug, plan, continue, hand off, wrap up, review, or release work in such a project, and when they say "grill me", "status", "hand off", "land it", or "retro". Keeps specs as the source of truth, routes scoped rules, records decisions and open questions, tracks work, verification, and release state separately, and tiers subagent effort.
---

# Keelson

Keelson sits under your normal way of working on a project that will live for years. The repository keeps its standing facts in `.keelson/`: `INTENT.md` (why it exists, boundaries, what you may decide alone), `ROADMAP.md` (the current milestone), `NOW.md` (what is in flight), specs (how the system behaves today, path in `config.yaml`), `rules/` (conventions routed by path), `changes/` (work in progress, empty when idle). Existing project documents are referenced from `config.yaml → refs`, never duplicated. You do the work the way you judge best; Keelson makes sure the facts you need are in front of you, the facts you produce are written down, and nothing is declared done without evidence that matches the code.

Nothing here is a gate on you. The gates are on artifacts: `keelson land` refuses stale evidence, unchecked acceptance, open questions, and unconfirmed assumptions. Every guideline states why it exists so you can judge when it does not apply. User instructions and the project's own instruction files always take precedence.

## Before non-trivial work

`keelson context --paths <files you expect to touch>` prints INTENT, ROADMAP, NOW, active changes, existing references, and the matched rules. Before editing a shared module, `keelson impact <files>` lists importers and affected specs; treat it as navigation, then read for callers it cannot see.

## Size the change, then pick the reference

| Size | Signals | What to do | Read |
|---|---|---|---|
| trivial | style, typo, one-file explicit fix, no behaviour change | just do it; no change directory | nothing |
| quick | several files, intent clear, no behaviour contract changes | write back your understanding in 3–6 lines, `keelson new`, proceed | `references/shape.md` |
| spec | behaviour contract changes, new or removed capability, abandoning an obvious approach, migrations, anything the owner wants to review before code | clarify until the next slice is deliverable, draft `change.md` with acceptance and delta specs, wait for approval | `references/shape.md`, `references/plan.md` |

You decide the size; the user can override with "treat this as spec" or "just do it". When nobody can answer (a scripted run), build under assumptions marked `(assumed)` and stop before landing.

## What do you need right now?

- **Understand what is wanted** → `references/shape.md` (facts first, write-back, decision states, authorization, interviewing, unattended runs)
- **Know what the code touches** → `references/context.md` (three context layers, impact analysis, budget)
- **Plan the change** → `references/plan.md` (change.md, slices, acceptance, delta specs, effort tiers, existing trackers)
- **Build** → `references/build.md` (rulings, subagents by tier, parallel work, keeping artifacts true)
- **Prove it works** → `references/verify.md` (record validity, content validity, `keelson check --record`, reviews)
- **Stop or resume** → `references/handoff.md` (handoff fields, resuming safely, NOW.md)
- **Integrate and release** → `references/land.md` (landing gates, spec conflicts, rollout, promoting learnings, technical debt)
- **Something is broken** → `references/debug.md` (reproduce, root cause, category)
- **"retro"** → run `keelson retro` and act on its suggestions

## CLI you will use

`keelson context --paths <files>` · `keelson impact <files>` · `keelson new <name> --tier quick|spec [--capability cap] [--touches globs] [--depends change]` · `keelson status` · `keelson check --record "<claim>"` · `keelson validate` · `keelson handoff <name>` · `keelson land <name> [--now "<text>"] [--confirm-assumptions] [--accept-drift]` · `keelson cancel <name>` · `keelson models --resolve <tier>`. Every command accepts `--json`; `keelson <command> --help` prints its flags.

## Ground rules (why they exist)

- **Facts before questions.** Explore the code, `.keelson/`, and the referenced documents before asking. Decisions already recorded in specs or INTENT are not asked again.
- **Three things are different: what the code does, what is confirmed, what is planned.** When they disagree, report the gap; never edit a spec to match a defect.
- **Evidence before claims.** "Done", "passes", "fixed" follow `keelson check --record` in this session. Evidence from before the last code edit is stale, and `land` will say so.
- **Open questions block only what depends on them.** Keep building the slices they do not touch.
- **No dated model IDs in the repo.** Effort tiers are `light | standard | deep`; the host resolves them at runtime.
