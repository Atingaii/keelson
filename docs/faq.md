# FAQ

**Does it work without hooks?**
Yes. Hooks exist only for Claude Code and only inject state. Without them, the discovery block points the agent to `.keelson/workflow.md`, which tells it to run `keelson context --paths <files>` before non-trivial work; `NOW.md` plus each change's `handoff.md` carry continuation state. Pass `--no-hooks` to `init` if you prefer that on Claude Code too.

**Which tools are supported?**
Twenty-two tools, listed by `keelson platforms` and in the README. The complete workflow and skill live once under `.keelson/`. Each host gets only the discovery files it knows how to read; some also get a host-specific discovery/rules file. Every project installs the portable `AGENTS.md` + `.agents/skills/` discovery layer. Run `keelson init --cursor --codex` for several at once, or `keelson init` alone to use what is installed on your machine.

**Do I have to type commands in chat?**
No. You talk to the agent as before. The agent runs the CLI itself. Phrases such as "grill me", "status", "hand off", "land it", and "retro" have a defined meaning in the skill, but none is required.

**What happens with a tiny change?**
Nothing. Trivial changes (style, typos, a one-file fix with no behaviour change) get no change directory and no write-back. The agent just does them.

**Can I approve quick changes before the agent starts?**
Set `confirm.quick: wait` in `.keelson/config.yaml`. Spec changes always wait for approval unless you set `confirm.spec: proceed`.

**What happens in a scripted run where nobody can approve?**
The agent does not stall. It writes the understanding and the plan, marks its working assumptions `(assumed)` under `Decisions`, builds and verifies under them, records evidence, and stops before landing. `NOW.md` says the change awaits review. You read the plan and the diff together and run `keelson land <name> --confirm-assumptions`, or `keelson cancel <name>`.

**Why did `keelson land` refuse?**
It lists every reason: unchecked tasks or acceptance items, a spec change without an acceptance list, open questions, verification that is not-run, failed, partial, or stale, `(assumed)` decisions without `--confirm-assumptions`, a `**BREAKING**` bullet without a `Rollout` section, or a delta written against a spec that has since changed (pass `--accept-drift` after re-reading). Fix the reason rather than reaching for `--force`; `--force` exists for your explicit decision and prints what it overrode.

**How do I confirm the agent's assumptions?**
Read the `(assumed)` lines under `Decisions` in `change.md`. If they are right, land with `--confirm-assumptions`; they fold into the spec as confirmed. If one is wrong, edit the line (or tell the agent), and let the work that depended on it be redone before landing.

**Why is verification "stale"? The tests passed.**
They passed against a different tree. Every `Verify:` entry written by `keelson check --record` carries a fingerprint of the working tree at that moment; any code edit since then makes it stale. Run `keelson check --record` again. Ledger appends do not count, because `.keelson/` is excluded from the fingerprint.

**I already have specs, ADRs, or an architecture document. Do I copy them in?**
No. `keelson init` detects the common locations and records them under `refs` in `config.yaml`; the agent reads them and links to them from specs instead of restating. If your behaviour contracts already follow Keelson's shape, point `paths.specs` at their directory. See [Existing projects](existing-projects.md).

**We use an issue tracker. Does Keelson add a second backlog?**
No. `refs.tasks` points at the tracker, which stays authoritative for what is wanted and in what order. `ROADMAP.md` states the current milestone in a few lines and links it. `change.md` links the issue and holds only decisions, acceptance, open questions, and continuation state.

**How do teams use it?**
Commit `.keelson/`. Give each writer their own change, branch, and ideally worktree (`keelson new --worktree`). Ask for a change directory on non-trivial pull requests and review the delta spec with the code. Run `keelson validate && keelson check` in CI. `keelson status` warns when two active changes touch the same capability or paths; agree the contract first. See [Collaboration](collaboration.md).

**How does release state work?**
From git tags. `keelson land` marks integration; `keelson status` prints the last tag and the changes folded since it as unreleased. A change with a `Rollout` section keeps its migration or production steps in `NOW.md → Next` until they have run. Keelson never runs them.

**Does it work in a monorepo?**
Yes. Rules are routed by path glob, so `packages/api/**` and `packages/web/**` can each have their own rule file. Specs are organised by capability name, which can include a path segment such as `api/orders`. `touches` on a change uses the same globs.

**I'm new to engineering. Does it help me learn?**
Run `keelson init --guide` (or set `guide: true` in `config.yaml`). The agent then asks about scenarios before technology, presents each choice with a recommendation, the reason, the alternatives, and the trade-off, explains a rule in one sentence when it applies it, names the engineering idea after you have decided, and ends each spec change with a short teaching note. The files, gates, and states are the same as for anyone else, so what you build is not a beginner's version of the project.

**Documents keep growing. What stops them?**
Line budgets in `config.yaml → budgets` and `keelson doctor`. Doctor reports a document over its budget, requirement text that reads like history, duplicated requirement names, changes idle for two weeks, changes with more than 25 tasks, always-on rules over budget, and generated docs older than the code. Each finding suggests a compaction (rewrite in the present tense, split, delete what git keeps, move a checkable rule into `check:`). Nothing is rewritten for you; the skill's `reconcile.md` reference tells the agent where each fact belongs and how to compact.

**Is it opinionated about test-driven development?**
No. The `verify` reference asks for evidence that matches the code and covers the acceptance list. The `guided` profile adds a note suggesting test-first when a scenario exists in the delta spec and a prototype when the problem is visual or an unknown API. The `lean` profile leaves the method to the agent.

**What does it cost in tokens?**
The discovery block is under 10 lines. `.keelson/workflow.md` is a compact operating kernel read for non-trivial work. The session-start hook prints up to about 1,500 characters once; the per-prompt line is a few dozen tokens and empty when idle. The canonical skill loads one reference at a time, each 30 to 90 lines. Rules are read only when their glob matches. Nothing else is injected.

**What if the agent ignores it?**
Run `keelson doctor`. It checks the canonical `.keelson/workflow.md` and `.keelson/skill/`, then verifies each configured host's discovery shim points to that runtime and matches the CLI version, plus hook registration where applicable. `keelson update` regenerates all of it. If the agent sizes a change wrongly, say "treat this as spec" or "just do it".

**How do I get rid of it?**
`keelson uninstall` removes generated runtime/integration surfaces (`.keelson/workflow.md`, `.keelson/skill/`, host discovery shims, hooks, local state) while keeping project facts under `.keelson/`; add `--purge` to remove `.keelson/` entirely. For a temporary comparison, `keelson ablate` stashes every surface and `keelson restore` brings it back byte for byte.

**Does it run on Windows?**
The CLI and hooks are plain Node scripts. `keelson check` runs your configured commands through the default shell. Paths in rules, specs, and `touches` use forward slashes.

**Where did the ledger go after landing?**
With `land: fold` the change directory is deleted after its specs and decisions merge. The ledger and handoff are still in git history, and `keelson retro` reads them from there. Set `land: keep` to archive change directories instead.

**Why does `validate` reject a model name?**
Dated model IDs go stale. Use effort tiers in tasks and family aliases in `config.yaml → models`. See [models.md](models.md).
