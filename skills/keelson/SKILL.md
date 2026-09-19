---
name: keelson
description: Project workflow layer for coding work in repositories that have a .keelson/ directory. Use whenever the user asks to build, add, change, refactor, fix, debug, plan, continue, wrap up, or review work in such a project, and when they say "grill me", "status", "land it", or "retro". Keeps specs as the source of truth, routes scoped rules, keeps session memory in NOW.md, and tiers subagent effort.
---

# Keelson

Keelson is a thin layer under your normal way of working. The project keeps five things in `.keelson/`: `INTENT.md` (why the project exists and what it will not do), `NOW.md` (what is in flight), `specs/` (how the system behaves today), `rules/` (coding conventions routed by path), and `changes/` (work in progress, empty when idle). You do the work the way you judge best; Keelson only makes sure the facts you need are in front of you and the facts you produce are written down.

Nothing here is a gate. Every guideline states why it exists so you can decide when it does not apply. User instructions and the project's own instruction files always take precedence.

## Before non-trivial work

Run `keelson context --paths <files you expect to touch>` (or read `.keelson/INTENT.md`, `NOW.md`, and the matched `rules/` files directly). This is cheaper than rediscovering conventions and safer than guessing them.

## Size the change, then pick the reference

| Size | Signals | What to do | Read |
|---|---|---|---|
| trivial | style, typo, one-file explicit fix, no behaviour change | just do it; no change directory | nothing |
| quick | several files, intent clear, no behaviour contract changes | write back your understanding in 3–6 lines, create a change, proceed | `references/shape.md` |
| spec | behaviour contract changes, new or removed capability, abandoning an obvious approach, anything the user will want to review before code | interview to remove ambiguity, draft `change.md` and delta specs, wait for approval | `references/shape.md`, `references/plan.md` |

You decide the size. The user can override with "treat this as spec" or "just do it". `config.yaml` may set `confirm.quick: wait` if they prefer to approve quick changes too. When nobody can answer (a scripted run), build under stated assumptions and stop before landing; `references/shape.md` has the rule.

## CLI you will use

`keelson context --paths <files>` · `keelson new <name> --tier quick|spec [--capability <cap>]` · `keelson status` · `keelson check` · `keelson validate` · `keelson models --resolve <tier>` · `keelson land <name> [--now "<text>"]`. Every command accepts `--json`; `keelson <command> --help` prints its flags.

## By phase

Read only the reference for the phase you are in.

- **Shaping** an idea or request → `references/shape.md` (write-back, interviewing, exploring)
- **Planning** artifacts for a change → `references/plan.md` (change.md, delta specs, tasks with effort tiers)
- **Building** from tasks → `references/build.md` (subagents by effort tier, rulings, when to stop)
- **Verifying** before claiming done → `references/verify.md` (fresh evidence, spec and rule review)
- **Landing** finished work → `references/land.md` (`keelson land`, NOW.md, promote learnings to rules)
- **Debugging** any failure → `references/debug.md` (reproduce, root cause, category)
- **Retro** on request → run `keelson retro` and act on its suggestions

## Phrases with meaning

- "grill me" → run the interview in `references/shape.md` to exhaustion, one question at a time.
- "status" / "where are we" → `keelson status`, then summarise in two lines.
- "continue" in a fresh session → `NOW.md` and `keelson status` tell you where to pick up.
- "land it" / "wrap up" → `references/land.md`.
- "retro" → `keelson retro`.

## Ground rules (why they exist)

- **Facts before questions.** Explore the code and `.keelson/` before asking the user anything they did not need to know. Their time is the scarce resource.
- **Specs describe today.** After landing, `specs/` must be true of HEAD. Present tense, no change narrative.
- **Evidence before claims.** "Done", "passes", "fixed" are only said after running the command in this session and reading its exit code.
- **No dated model IDs in the repo.** Effort tiers are `light | standard | deep`; the host resolves them at runtime.
