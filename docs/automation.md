# Automatic work, explicit state

Initialize once, then describe the outcome to your coding agent. The agent manages the following steps; users do not need to invoke a skill or run phase commands.

1. **Investigate.** Read the repository and existing decisions. Keep discussion-only requests read-only. Investigate facts instead of asking the owner to guess them.
2. **Decide.** A simple gap gets one question. Connected uncertainty gets the whole ready decision frontier in one round, with recommendations and reasons. Answers unlock dependent questions. Explicitly delegated choices can be resolved within that delegation; recommendations alone are not consent.
3. **Start.** Keep a minimal quick change for clear edits; use a spec change for broader contracts. `start` requires concrete acceptance, settled registered decisions and completed prerequisites, sets `in-progress`, binds the session, and records a fingerprint of the plan. Move unrelated future questions into a separate change or roadmap before starting.
4. **Implement and review.** Load `context --phase implement`. The versioned `context.json` adds files separately for implementation and checking; current/delta specs, request, acceptance and applicable rules remain mandatory. Send material changes to an independent reviewer with the `check` pack and the diff, using a fresh context. The implementer repairs findings, followed by another affected-scope review. If the host cannot provide an independent context, report the review gap.
5. **Verify and retain.** Run the configured checks and record current signed evidence. Review acceptance against observed behavior. Promote reusable decisions into delta specs or the change's capability decisions; `land` merges them into project specs and archives evidence. Later context packs read those updated specs.

`request.md` preserves the original requirement and material follow-ups for the reviewer. `decisions.json` stores the dependency tree and answer provenance. `execution.json` records which plan was started. These files and the shared specs live in the repository; credentials, trust and session pointers remain local.

## What enforces what?

| Mechanism | Enforced behavior and limits |
| --- | --- |
| CLI decision tree | Orders registered dependencies and rejects invalid settlements. `complete: true` describes the registered tree; the agent must still look for missing material branches. |
| CLI start | Rejects an unresolved plan. Changing scope, decisions or delta specs invalidates the start record. It does not establish user authorization by itself. |
| Claude Code hooks | `PreToolUse` rejects supported file-edit tools before a current start; Agent/Task prompts receive phase context. SessionStart restores state after compaction, and UserPromptSubmit repeats current phase guidance. Generic subagent startup preserves the phase already supplied by its parent. |
| Codex hooks | `apply_patch` checks every edited or moved path. SessionStart and UserPromptSubmit restore contracts; SubagentStart guides an unbound child to bind its explicit task and load phase context automatically. Requires project and hook trust in the host. |
| CodeBuddy hooks | File-tool gates and Task prompt injection use CodeBuddy’s `modifiedInput` protocol. SessionStart/UserPromptSubmit restore contracts; Bash/PowerShell receive an opaque session identity without granting permissions. |
| Other hosts / inactive hooks | Installed entry points instruct the agent to use the same start and context commands. Native event enforcement requires an enabled, trusted hook on a supported host. |
| Verification and landing | Normal landing requires current complete signed checks and the other acceptance gates. Handwritten “passed” text is not evidence. An explicit force override is recorded as an override. |
| Independent review / knowledge quality | Context packs support separation; the host must create the reviewer and the agent must capture useful learning. Injection alone does not prove review independence, exhaustive discovery or defect-free results. |

Claude's guard covers `Edit`, `Write`, `MultiEdit` and `NotebookEdit`; CodeBuddy also covers `NotebookWrite`. Codex checks file headers and move destinations in `apply_patch`. It allows planning artifacts under `.keelson/` to be maintained before start. Arbitrary shell commands and MCP writers are outside this guard; it is a workflow mechanism, not a filesystem sandbox. Host permission prompts are preserved. See the [host protocols and installation details](platforms.md). Codex cannot rewrite a subagent call without an allow decision, so Keelson uses startup guidance and child-operated context loading instead. For a tracked task the spawn prompt must carry one matching `KEELSON_CHANGE=<name>` line. The child automatically runs `keelson focus` and `keelson context --phase` for its assigned phase; it must retain any read-only scope. Later supported events inject the child’s own focused context. Codex child compaction/resume does not emit SessionStart, so child tool events repeat the pack without digest suppression; when resuming any task, the agent also reloads its phase context.

Codex children use their own thread identity for CLI commands and hooks. A nested child's task comes from its explicit assignment, never a guessed root-session focus. Changing or clearing a child's focus leaves the parent and sibling sessions unchanged.

The repository tests CLI transitions, protocol-shaped hook events, context recovery and package upgrades. This is not an end-to-end live-agent effectiveness claim. UI work still needs actual browser interaction and visual review.

## Upgrade

Install the latest package and run `keelson update` in the project. Unmodified generated files from 0.4.0/0.4.1 are recognized; later installations record content digests for safe updates. Edited discovery shims and vendored guidance are preserved and reported for reconciliation. Managed blocks in instruction files are refreshed; keep user customizations outside those blocks. Existing project facts and decisions stay in place.
