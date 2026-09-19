# Context and impact

Project material grows with the project; what you read per task must not grow with the whole history. Know where to look first, then open only what this change needs.

## Three layers
<!-- keelson: id=context.layers | without: every session reads everything or nothing; conventions are either flooded or missed | sunset: never -->

1. **Stable entry** — the resident block, `INTENT.md`, `ROADMAP.md → Now`, and the rules routed by `**`. Always read; kept short on purpose.
2. **Task material** — the active `change.md`, the specs of the capabilities it names, the rules matched by the paths you will touch, the tests that cover them, and any `refs` document the spec links to. `keelson context --paths <files>` prints most of this.
3. **On demand** — callers, other entry points, neighbouring modules, past changes in git history. Open when a question arises, not up front.

Never demote an always-on constraint because it is rarely relevant. Security and compatibility rules under `**` are read every time; that is the point of `**`.

## Impact is analysed, not looked up
<!-- keelson: id=context.impact | without: the agent treats the rules index and the diff as the whole blast radius and misses the caller outside the directory | sunset: never -->

`keelson impact <files>` lists importers by name, specs whose text or path matches, rules that apply, and active changes that declare the same paths or capabilities. That is navigation. Before you edit a shared module, answer by reading:

- Who calls this, including dynamic entry points the grep cannot see: CLI commands, jobs, routes, event handlers, templates?
- Is there another way in to the same behaviour (a download API next to the page, a batch job next to the request handler)?
- Which data constraints, permission rules, or compatibility promises depend on it? Check the spec's `Decisions`.
- Does an active change of someone else touch the same contract? `keelson status` shows shared contracts.

Write the answer into `change.md → Impact`. An Impact section that only lists the files in the diff is not an analysis.

## Budget
<!-- keelson: id=context.budget | without: when context runs short the agent silently drops constraints it already read, or guesses instead of reading | sunset: never -->

When the material for a change does not fit, do not summarise constraints into something looser. Narrow the slice, or keep reading on demand and say what you have not checked. `NOW.md → Blocked / uncertain` is the place for "not yet checked: …".

