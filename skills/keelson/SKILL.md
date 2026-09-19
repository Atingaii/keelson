---
name: keelson
description: Engineering collaboration layer for coding work in repositories that have a .keelson/ directory. Use whenever the user asks to build, add, change, refactor, fix, debug, plan, continue, hand off, wrap up, review, or release work in such a project, and when they say "grill me", "status", "hand off", "land it", or "retro". Keeps specs as the source of truth, routes scoped rules, records decisions and open questions, separates work/verification/release state, and turns recurring mistakes into progressively stronger checks.
---

# Keelson

Keelson is the project's engineering control layer. The repository keeps standing facts in `.keelson/`: `INTENT.md` (why it exists, boundaries, what you may decide alone), `ROADMAP.md` (current milestone), `NOW.md` (what is in flight), `GLOSSARY.md` (one meaning per term), specs (how the system behaves today, path in `config.yaml`), `rules/` (path-scoped conventions), and `changes/` (work in progress, empty when idle). Existing project documents are referenced from `config.yaml → refs`, never duplicated.

Keelson constrains **state transitions, not implementation choices**. You choose how to solve the problem; you do not skip current context before non-trivial edits, silently change a behavioural contract, claim completion from stale evidence, or land unresolved acceptance. Prefer an executable invariant over another paragraph of instructions when a rule can be checked mechanically. User instructions and the project's own instruction files always take precedence.

## First contact

If `NOW.md` starts with "First contact", nobody has drafted the project's facts yet. Read the repository (README, manifest, layout, code, and any document `config.yaml → refs` points at), draft `INTENT.md` (why, boundaries, hard constraints, a first Authorizations section), and for an existing codebase one spec per capability plus rules for paths with conventions. Then ask the owner to confirm or correct in one short exchange, keep their answers, and rewrite `NOW.md`. If the owner asks for a change right away, do this as part of shaping that change and confirm both together. Never ask the owner to write these files by hand.

## The operating loop

Every non-trivial change follows **ORIENT → BOUND → BUILD → SENSE → RECONCILE**. Do not skip a state because the chat already seems to contain it.

- **ORIENT** — inspect the worktree, then run `keelson context --paths <files you expect to touch>`; before editing a shared module run `keelson impact <files>`. Read the matched spec/rules instead of relying on memory.
- **BOUND** — classify the change below, write back what you understand, audit material assumptions, and make the acceptance boundary explicit before implementation grows. If a user-owned gap can change the next slice, ask one highest-value question before coding.
- **BUILD** — work one vertical slice at a time; keep unrelated cleanup out of the slice; keep change artifacts true as decisions move.
- **SENSE** — run the cheapest relevant test/lint/type/fitness check while working; before any completion claim run fresh recorded verification with `keelson check --record`.
- **RECONCILE** — write durable facts back to specs/rules/glossary/NOW, hand off cleanly if unfinished, and promote recurring failure patterns into a scoped rule or executable check rather than adding chat lore.

## Size the change, then pick the reference

| Size | Signals | What to do | Read |
|---|---|---|---|
| trivial | style, typo, one-file explicit fix, no behaviour change | just do it; no change directory | nothing |
| quick | several files, intent clear, no behaviour contract changes | write back your understanding in 3–6 lines, `keelson new`, proceed | `references/shape.md` |
| spec | behaviour contract changes, new or removed capability, abandoning an obvious approach, migrations, anything the owner wants to review before code | clarify until the next slice is deliverable, draft `change.md` with acceptance and delta specs, wait for approval | `references/shape.md`, `references/plan.md` |

You decide the size; the user can override with "treat this as spec" or "just do it". When nobody can answer (a scripted run), build under assumptions marked `(assumed)` and stop before landing. When `config.yaml → guide` is true, the owner is learning: explain with scenarios and trade-offs, name the engineering idea after the decision, and close spec changes with a short teaching note.

## What do you need right now?

- **The owner is not sure what they want, or is learning** → `references/discover.md`
- **Understand what is wanted** → `references/shape.md`
- **Words or boundaries are drifting** → `references/model.md`
- **Know what the code touches** → `references/context.md`
- **Plan the change** → `references/plan.md`
- **A design or reliability question** → `references/engineer.md`
- **Build** → `references/build.md`
- **Prove it works** → `references/verify.md`
- **The harness keeps missing the same class of problem** → `references/harness.md` (feedforward/feedback controls, promotion ladder, mechanical invariants, sunset)
- **Stop or resume** → `references/handoff.md`
- **Integrate and release** → `references/land.md`
- **Write the new facts back, keep the project small** → `references/reconcile.md`
- **Something is broken** → `references/debug.md`
- **"retro"** → run `keelson retro` and act on its suggestions

## CLI you will use

`keelson context --paths <files>` · `keelson impact <files>` · `keelson new <name> --tier quick|spec [--capability cap] [--touches globs] [--depends change]` · `keelson status` · `keelson check --record "<claim>"` · `keelson validate` · `keelson handoff <name>` · `keelson land <name> [--now "<text>"] [--confirm-assumptions] [--accept-drift]` · `keelson cancel <name>` · `keelson models --resolve <tier>`. Every command accepts `--json`; `keelson <command> --help` prints its flags.

## Ground rules (why they exist)

- **Facts before questions.** Explore the code, `.keelson/`, and the referenced documents before asking. Decisions already recorded in specs or INTENT are not asked again.
- **Three things are different: what the code does, what is confirmed, what is planned.** When they disagree, report the gap; never edit a spec to match a defect.
- **Evidence before claims.** "Done", "passes", "fixed" follow `keelson check --record` in this session. Evidence from before the last code edit is stale, and `land` will say so.
- **Open questions block only what depends on them.** Keep building the slices they do not touch.
- **No dated model IDs in the repo.** Effort tiers are `light | standard | deep`; the host resolves them at runtime.
