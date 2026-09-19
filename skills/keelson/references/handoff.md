# Stopping and resuming

The line between "did one task" and "kept a project moving" is whether the next session, the next person, or the next model can continue without redoing or undoing work. Two files carry that: `NOW.md` for the project, `changes/<name>/handoff.md` for a change that crosses sessions.

## What goes where
<!-- keelson: id=handoff.split | without: session logs are either committed as noise or everything is gitignored and the team has no continuation record | sunset: never -->

| Information | Lives in |
|---|---|
| What is in flight across the project, what is blocked, the next step | `NOW.md`, committed, rewritten in full |
| Continuation state of one change: confirmed decisions, done slices, open and blocked items, ruled-out assumptions, next step, verification status | `changes/<name>/handoff.md`, committed |
| Check output, session scratch, machine-specific state | `.keelson/.local/`, never committed |

Anything a colleague on another machine would need is not local state.

## Writing a handoff
<!-- keelson: id=handoff.write | without: the next session starts from git archaeology; rejected assumptions are retried; unverified work is treated as verified | sunset: never -->

Run `keelson handoff <name>` (creates or re-stamps `handoff.md` with the commit, time, and author) and fill the six sections. It is a current-state summary: overwrite it, never append a diary.

- **Goal and confirmed decisions** — one paragraph, present tense, linking `change.md` rather than repeating it.
- **Done** — slices or tasks complete and verified, with the `Verify:` that proves it.
- **Open and blocked** — each item with what it blocks.
- **Ruled out** — assumptions or approaches rejected, with the evidence, so nobody retries them.
- **Next step** — the first concrete action, small enough to start cold.
- **Verification** — the last `Verify:` (command, exit code, tree) and what has not been checked.

Then rewrite `NOW.md` so the project view agrees. The session-start hook prints the handoff's next step when the next session opens.

## Resuming
<!-- keelson: id=handoff.resume | without: agent executes a stale handoff against a moved worktree, or "cleans up" uncommitted work the owner wanted kept | sunset: never -->

1. `keelson status`: work, verification, and release state, whether HEAD moved since the handoff, uncommitted files.
2. If HEAD moved or the tree is dirty, read what changed (`git log`, `git diff`) before trusting the handoff; other work may have landed, and shared contracts may have shifted.
3. Never delete or reset uncommitted changes to "start clean". Ask, or work around them.
4. Re-run `keelson check --record` before building on prior verification; it is stale by definition after any edit.
5. Continue from **Next step**; update `handoff.md` and `NOW.md` when you stop again.

## NOW.md
<!-- keelson: id=handoff.now | without: the next session starts blind and re-derives state from git | sunset: never -->

Rewrite the whole file, present tense, three short parts: what is active (or "nothing in flight"), what is blocked or uncertain (including "not yet checked: …"), the next concrete step. `keelson land --now "<text>"` writes it at landing. Pausing, being blocked, and cancelling are normal states; write them as they are rather than forcing a change to "done" to close a session.
