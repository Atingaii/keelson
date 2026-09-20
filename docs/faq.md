# FAQ

**Does it work without hooks/plugins?**
Yes. Discovery and durable change state never depend on a session adapter. Native session focus currently uses Claude hooks, one OpenCode project plugin, Pi's built-in `PI_SESSION_ID`, and CodeBuddy hooks. `--no-hooks` disables Keelson-managed hook/plugin bridges, so Claude/OpenCode/CodeBuddy fall back to safe candidate/explicit selection; Pi remains native because its session environment is built into the host. Ordinary resume uses durable change state plus local focus/candidate resolution—`handoff.md` is only for an explicit ownership/machine transfer.

**Which tools are supported?**
Seven first-class CLI hosts: Claude Code, Codex CLI, OpenCode, Pi, Gemini CLI, Kiro CLI, and CodeBuddy CLI. Each adapter uses a verified or host-documented discovery path and points to the same canonical `.keelson/` runtime. Every project also gets the portable `AGENTS.md` + `.agents/skills/` layer for other standards-compatible agents. `keelson init` auto-detects only the first-class hosts; use `keelson init --claude --codex` (or other first-class flags) to choose explicitly.

**Do I have to type commands or say that a task is finished?**
No. You talk normally. The Agent runs the CLI, binds/recovers session focus when possible, and derives `ready` from acceptance/gates plus fresh verification. You never have to say “start task”, “finish task”, or “today we're done”.

**What happens with a tiny change?**
Nothing. Trivial changes (style, typos, a one-file fix with no behaviour change) get no change directory and no write-back. The agent just does them.

**Can I require approval before the agent starts?**
Yes. Set `confirm.quick: wait` and/or `confirm.spec: wait` in `.keelson/config.yaml`. By default both proceed after the short write-back when no unresolved owner-owned decision remains; irreversible/production/permission/breaking actions still require their normal explicit confirmation.

**What happens in a scripted run where nobody can approve?**
The agent does not stall. It writes the understanding and the plan, marks its working assumptions `(assumed)` under `Decisions`, builds and verifies under them, records evidence, and stops before landing. `NOW.md` says the change awaits review. You read the plan and the diff together and run `keelson land <name> --confirm-assumptions`, or `keelson cancel <name>`.

**Why did `keelson land` refuse?**
It lists every real lifecycle blocker: incomplete acceptance, active dependencies, a spec change without an acceptance list, open questions, stale contract drift, verification that is not-run/failed/partial/stale, `(assumed)` decisions without `--confirm-assumptions`, or a `**BREAKING**` change without `Rollout`. Unchecked tasks are advisory planning state, not blockers. Fix the reason rather than reaching for `--force`; `--force` exists for your explicit decision and prints what it overrode.

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

**I'm new to engineering. Will the questions make sense?**
Yes by default. Keelson always asks owner decisions in plain-language scenarios, recommends a grounded default, and treats “not sure” as a valid route; you do not need `--guide` for that. Enable `keelson init --guide` (or `guide: true`) only if you also want short teaching notes that name the engineering idea behind settled decisions and explain why constraints exist. The files, gates, and states stay identical.

**Documents keep growing. What stops them?**
Keelson bounds **hot files, not total project knowledge**. The Agent handles knowledge-health findings during normal RECONCILE without asking you to do housekeeping. Large capability specs automatically become a small `spec.md` index plus `requirements/*.md` and `decisions/*.md` when needed; rules split by scope; NOW/INTENT are rewritten as concise current-state views; old runtime evidence/session files are garbage-collected. ADR/spec/rule directories may keep growing as the project evolves, but only relevant files are loaded for a task. `keelson doctor` remains available for diagnostics, not routine maintenance.

**Is it opinionated about test-driven development?**
No. The `verify` reference asks for evidence that matches the code and covers the acceptance list. The `guided` profile adds a note suggesting test-first when a scenario exists in the delta spec and a prototype when the problem is visual or an unknown API. The `lean` profile leaves the method to the agent.

**What does it cost in tokens?**
The discovery block is under 10 lines and the canonical Skill loads references on demand. Native session adapters inject only a compact focus/candidate hint: Claude and CodeBuddy at lifecycle prompts, OpenCode/Pi mostly through shell identity with no extra prose. Rules are read only when their glob matches. Keelson deliberately avoids replaying the whole work history into every turn.

**What if the integration is unhealthy?**
`keelson doctor` is available as a diagnostic check for canonical runtime, discovery shims, manifest, session adapters, lifecycle state, and project validation. `keelson update` repairs package-owned drift. Normal development should not require either command beyond upgrades or troubleshooting.

**How do I get rid of it?**
`keelson uninstall` removes generated runtime/integration surfaces (`.keelson/workflow.md`, `.keelson/skill/`, host discovery shims, hooks, local state) while keeping project facts under `.keelson/`; add `--purge` to remove `.keelson/` entirely. For a temporary comparison, `keelson ablate` stashes every surface and `keelson restore` brings it back byte for byte.

**Does it run on Windows?**
The CLI and hooks are plain Node scripts. `keelson check` runs your configured commands through the default shell. Paths in rules, specs, and `touches` use forward slashes.

**Where did the ledger go after landing?**
With `land: fold` the change directory is deleted after its specs and decisions merge. The ledger and handoff are still in git history, and `keelson retro` reads them from there. Set `land: keep` to archive change directories instead.

**Why does `validate` reject a model name?**
Dated model IDs go stale. Use effort tiers in tasks and family aliases in `config.yaml → models`. See [models.md](models.md).
