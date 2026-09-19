# FAQ

**Does it work without hooks?**
Yes. Hooks exist only for Claude Code and only inject state. Without them, the resident block tells the agent to run `keelson context --paths <files>` before non-trivial work, and `NOW.md` is the first thing it reads when you say "continue". Pass `--no-hooks` to `init` if you prefer that on Claude Code too.

**Which tools are supported?**
`claude`, `codex`, `cursor`, `opencode`, and `gemini`. Each gets the skill directory and a resident block in its instructions file. Cursor also gets `.cursor/rules/keelson.mdc`. Run `keelson init --tools a,b,c` for several at once. Other tools that read `AGENTS.md` and `.agents/skills/` can use the `codex` output as is.

**Do I have to type commands in chat?**
No. You talk to the agent as before. The agent runs the CLI itself. Phrases such as "grill me", "status", "land it", and "retro" have a defined meaning in the skill, but none of them is required.

**What happens with a tiny change?**
Nothing. Trivial changes (style, typos, a one-file fix with no behaviour change) get no change directory and no write-back. The agent just does them.

**Can I approve quick changes before the agent starts?**
Set `confirm.quick: wait` in `.keelson/config.yaml`. Spec changes always wait for approval unless you set `confirm.spec: proceed`.

**How do teams use it?**
Commit `.keelson/`. Ask for a change directory on non-trivial pull requests. Run `keelson validate && keelson check` in CI. `NOW.md` is per repository; if several people work in parallel, keep it short and let each active change directory carry its own state.

**Does it work in a monorepo?**
Yes. Rules are routed by path glob, so `packages/api/**` and `packages/web/**` can each have their own rule file. Specs are organised by capability name, which can include a path segment such as `api/orders`.

**Is it opinionated about test-driven development?**
No. The `verify` reference asks for fresh evidence before any claim of completion. The `guided` profile adds a note suggesting test-first when a scenario exists in the delta spec. The `lean` profile leaves the method to the agent.

**What does it cost in tokens?**
The resident block is under 20 lines. The session-start hook prints a few hundred tokens once. The per-prompt line is a few dozen tokens and empty when idle. The skill is read one reference at a time, each about 30 to 60 lines. Rules are read only when their glob matches. Nothing else is injected.

**What happens in a scripted run where nobody can approve?**
The agent does not stall. It writes the understanding and the plan with its assumptions, builds and verifies under them, and stops before landing. `NOW.md` says the change awaits review. You then read the plan and the diff together and run `keelson land <name>` or discard the change.

**What if the agent ignores it?**
Check that the skill directory exists for your tool and that the resident block is in the instructions file; `keelson update` regenerates both. On Claude Code, confirm the hooks are in `.claude/settings.json` and that `node` is on the path. If the agent sizes a change wrongly, say "treat this as spec" or "just do it".

**How do I get rid of it?**
For a temporary comparison, `keelson ablate` stashes every surface and `keelson restore` brings it back byte for byte. To remove it permanently, delete `.keelson/`, the skill directory, the block between the `keelson:start` and `keelson:end` markers in your instructions file, and the two hook entries in `.claude/settings.json`.

**Does it run on Windows?**
The CLI and hooks are plain Node scripts and use no shell features except in `keelson check`, which runs your configured commands through the default shell. Paths in rules and specs use forward slashes.

**Where did the ledger go after landing?**
With `land: fold` the change directory is deleted after its specs and decisions merge. The ledger is still in git history, and `keelson retro` reads it from there. Set `land: keep` to archive change directories instead.

**Why does `validate` reject a model name?**
Dated model IDs go stale. Use effort tiers in tasks and family aliases in `config.yaml → models`. See [models.md](models.md).
