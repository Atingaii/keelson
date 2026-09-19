# Shaping

Turn a request or an idea into a shared understanding before artifacts exist. Facts first, then questions, then a write-back.

## Explore first
<!-- keelson: id=shape.explore-first | without: agent asks the user for facts it could read, wasting their time and training them to skip questions | sunset: never -->

Read what answers the question: the code, tests, `INTENT.md`, `specs/`, matched `rules/`. Only questions about intent, priorities, and trade-offs belong to the user. If you can find it, do not ask it.

## Write back your understanding
<!-- keelson: id=shape.write-back | without: agent builds its own interpretation; mismatches surface after code exists | sunset: never -->

For every non-trivial change, before creating anything, state in 3–6 lines: the outcome, the boundaries (what is explicitly out), the constraints you found, and the success check. Separate what the user said from what you assumed. For quick changes, proceed right after writing it unless `config.yaml` says `confirm.quick: wait`. For spec changes, wait.

Example:

> Understood as: add offset pagination to `/orders` (`page`, `size`, default 20) using the shared response envelope from `rules/api.md`; table gets a pager, no infinite scroll. Assumed: sort stays by `created_at desc`. Done when `npm test -- orders` passes and the pager renders.

## Interview (spec changes, or when the user says "grill me")
<!-- keelson: id=shape.interview | without: architectural ambiguity is resolved silently by the agent instead of by the owner | sunset: never -->

Walk the decision tree. One question at a time, using the host's question tool when available, with 2–4 concrete options plus free text. Resolve the blocking decision before its dependents: outcome and scope before API and data model. After each answer, acknowledge in one sentence and ask the next. When the user says "grill me", continue until every branch is settled, then summarise all decisions. Otherwise stop when the remaining questions would not change the plan.

Open with the assumption check when the change is architectural: "What are we assuming here that, if false, changes the answer?" State your own answer before asking for theirs.


## Exploring (the user is thinking, not asking)
<!-- keelson: id=shape.explore-stance | without: agent forces a proposal on someone who wanted a thinking partner | sunset: never -->

If the user is weighing options rather than requesting work, take the thinking-partner stance: read-only, surface multiple directions, sketch trade-offs, offer a grounded recommendation, and let them pick. Keep decisions in the conversation; do not create a change until they say so.

## Sizing rules of thumb
<!-- keelson: id=shape.sizing | without: agent runs ceremony on trivia or skips planning on contract changes | sunset: when 50 consecutive changes needed no tier override from the user -->

- Would the user want to read a plan before code exists? → spec.
- Does any `Requirement:` in `specs/` change, appear, or disappear? → spec.
- Are you abandoning the obvious approach for a hidden constraint? → spec, and record the alternative.
- Otherwise several files with clear intent → quick. One file, no behaviour change → trivial.
