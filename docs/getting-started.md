# Getting started

Keelson has one user-facing workflow:

> **Run `keelson init` once, then keep talking to your coding agent normally.**

For the full start-to-finish example—including continuous follow-up questions, session recovery, quick/spec changes, explicit transfer handoffs, verification, automatic readiness/landing, bugs, upgrades, and uninstall—read [Complete user flow](user-flow.md).

## Install

Requires Node.js 20+.

```bash
npm install -g keelson
keelson --version
```

## Initialize

```bash
cd your-project
keelson init
```

With no host flags, Keelson detects installed first-class CLIs whose discovery paths are verified or documented. If none are found, it uses the portable `AGENTS.md + .agents/skills/` layer.

You can be explicit:

```bash
keelson init --claude
keelson init --codex --opencode
keelson init --gemini --kiro
```

First-class hosts are listed by:

```bash
keelson platforms
```

## What init creates

Fresh init is intentionally small:

```text
.keelson/
├── README.md
├── INTENT.md
├── NOW.md
├── config.yaml
├── manifest.json
├── workflow.md
└── skill/
    ├── SKILL.md
    └── references/
```

It does **not** pre-create empty ROADMAP, glossary, rules, specs, changes, task lists, ledgers, or handoffs.

Outside `.keelson/`, Keelson writes only the thin discovery surfaces the selected hosts need. Full guidance still lives once under `.keelson/`.

`manifest.json` records which generated host surfaces Keelson owns, so later `update`, `uninstall`, and host switches can reconcile them without guessing.

## First contact

Open your normal coding agent and ask for real work.

On the first non-trivial conversation the agent:

1. reads the repository and existing referenced material;
2. drafts `.keelson/INTENT.md` from evidence already present;
3. asks you to confirm or correct the project boundary in one short exchange;
4. shapes the actual request.

It does **not** inventory the whole repository into specs and rules. Those appear later only when current work exposes a behavior contract or durable invariant worth preserving.

Example:

> **You:** Add search to the orders page.  
> **Agent:** I understand this as filtering the existing orders list by order number and customer name; no global search and no public API change. I found the existing pagination contract and will preserve it. Is that boundary right?

Once confirmed, work continues normally.

## What grows later

Project knowledge appears only when useful:

- `ROADMAP.md` — when a milestone/direction belongs in the repo rather than the tracker;
- `GLOSSARY.md` — when vocabulary becomes load-bearing;
- `rules/` — when a stable path-scoped engineering invariant must survive future sessions;
- `specs/` — when observable behavior needs a durable contract;
- `changes/` — while non-trivial work is in flight;
- `.runtime/sessions/` — when a host/session identity can carry a local focus pointer;
- `.runtime/evidence/` — when machine-local verification output is produced.

A quick change starts with only `change.md`. A spec-sized change also starts with a task plan and behavior delta. Ledger appears after a real event. Handoff appears only for explicit ownership/machine transfer; ordinary new chat sessions use local session focus/candidate recovery.

## The commands you may care about

```bash
keelson status
```
Shows active work (including mechanically derived `ready`), current session focus, verification freshness, open questions, transfer handoffs, and release state.

```bash
keelson doctor
```
Diagnoses runtime/shim/manifest drift, project validation, stale evidence, conflicts, and knowledge health.

```bash
npm install -g keelson@latest
keelson update
```
Refreshes package-owned guidance and reconciles generated host surfaces after an upgrade or host change.

```bash
keelson uninstall
```
Removes generated integration/runtime surfaces while keeping project facts. Add `--purge` only when you explicitly want the whole `.keelson/` directory removed.

You do not need to memorize the agent-facing commands.

## Next

- [Complete user flow](user-flow.md) — the full worked lifecycle.
- [Concepts](concepts.md) — the mental model.
- [How it works](how-it-works.md) — on-disk and runtime mechanics.
- [Existing projects](existing-projects.md) — brownfield adoption.
