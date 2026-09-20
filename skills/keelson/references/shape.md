# Shaping

Turn a request or an idea into a shared understanding before artifacts exist. Facts first, then questions, then a write-back. Three layers need to be clear, and not all at once: the project (who it serves, what it will never do, in `INTENT.md`), the current goal (this milestone, in `ROADMAP.md` or the tracker), and this change (what behaviour changes and how anyone will know it is done).

## Explore first
<!-- keelson: id=shape.explore-first | without: agent asks the user for facts it could read, wasting their time and training them to skip questions | sunset: never -->

Read what answers the question: the code, tests, `INTENT.md`, `ROADMAP.md`, the specs, the matched `rules/`, and the documents listed under `refs` in `config.yaml`. A decision already recorded in a spec's `Decisions` section or in `INTENT.md` is settled; do not ask it again. Only questions about intent, priorities, and trade-offs belong to the user.

## Assumption audit before questions
<!-- keelson: id=shape.assumption-audit | without: the agent solves a plausible but wrong problem, attributes invented beliefs to the owner, or asks a questionnaire before reading the repository | sunset: never -->

When quick work is materially ambiguous, and for every spec change, do a compact audit after reading the repository and before implementation. Do not narrate private chain-of-thought; report only decision-relevant results:

1. **Established** — facts the owner or repository actually states.
2. **Required assumptions** — what the proposed path would need to be true but nobody has confirmed. Phrase it as "this plan would require X", never "you assume X".
3. **Missing** — information that cannot be learned from the repository; rank it by how much the answer could change the outcome, boundary, acceptance, or an expensive-to-reverse choice.
4. **Failure if wrong** — name one likely failure pattern for this class of work: wrong problem, scope creep, compatibility break, unmeasured optimisation, unsafe migration, or another concrete risk.

Keep the audit internal except for the facts/assumptions needed in the short write-back. If no missing item is load-bearing, proceed under project authorizations/defaults. If one is load-bearing and user-owned, route it through `interview.md`, ask the single highest-value question, update the write-back, then reassess. Do not expose an audit checklist to the owner.

## Write back your understanding
<!-- keelson: id=shape.write-back | without: agent builds its own interpretation; mismatches surface after code exists | sunset: never -->

For every non-trivial change, before creating anything, state in 3–6 lines: the outcome, the boundaries (what is explicitly out), the constraints you found, and the success check. Separate what the user said from what you assumed. Proceed after the write-back unless the matching `confirm.quick|spec` setting is `wait` or a real owner-owned decision remains unresolved. High-risk actions still follow `INTENT.md → Authorizations`.

> Understood as: add offset pagination to `/orders` (`page`, `size`, default 20) using the shared response envelope from `rules/api.md`; table gets a pager, no infinite scroll. Assumed: sort stays by `created_at desc`. Done when `npm test -- orders` passes and the pager renders.

## Four states for what you know
<!-- keelson: id=shape.decision-states | without: a recommendation the agent made is later treated as something the owner chose, and nobody can tell which | sunset: never -->

Keep these apart, in the conversation and in `change.md`:

- **Suggestion** — what you recommend, with its consequences. Not in effect until the owner picks it.
- **Confirmed** — what the owner chose. A plain line under `## Decisions`.
- **Authorized** — what `INTENT.md → Authorizations` lets you decide alone. Decide, record it as confirmed, move on.
- **Open** — what still needs an answer. A line under `## Open questions` with `— blocks: <slice>`.

When you must proceed without an answer, write the working assumption as `- (assumed) capability: …` under `## Decisions`. `keelson land` refuses to fold assumed lines until the owner passes `--confirm-assumptions`.

## Stop asking when the next slice is deliverable
<!-- keelson: id=shape.stop-rule | without: agent either exhausts the owner with questions about later slices, or starts building on a slice whose acceptance is undefined | sunset: never -->

The bar is not "no unknowns in the project". It is: the next slice has a clear outcome, a boundary, and an acceptance check. Unresolved questions about later slices go under `## Open questions` with what they block, and the work they do not block continues. Example: download permissions undecided, link management list can be built, public download must not be defaulted on.

## Interview (only when the decision frontier requires it)
<!-- keelson: id=shape.interview | without: architectural ambiguity is silently guessed, or every spec change turns into a mandatory questionnaire | sunset: never -->

Use `interview.md` for the interaction protocol. A spec-sized change does **not** automatically require user questions: first resolve repository-owned facts and reversible engineering choices yourself. If the work touches data, security, concurrency, compatibility, operations, performance, UI/accessibility, or AI behavior, inspect only the triggered rows in `design-lenses.md` and turn them into decisions or evidence obligations.

Run the assumption check internally. Do not open with an abstract "what are we assuming?" question unless the owner truly owns that uncertainty; translate it into the concrete user-visible or risk consequence instead. Explicit "grill me" requests continue through the relevant decision tree; ordinary work stops as soon as the next safe slice is ready.

## Authorization
<!-- keelson: id=shape.authorization | without: either every step waits for approval or the agent decides product questions and production actions by itself | sunset: never -->

| Situation | Default |
|---|---|
| Local implementation choice inside a confirmed scope, following project conventions | Decide, verify, move on |
| Intent still vague; the choice changes experience, scope, or a long-term commitment | Recommend with consequences; the owner chooses |
| Irreversible data operation, production change, permission widening, breaking compatibility | Confirm explicitly, per `INTENT.md → Authorizations` |
| Unrelated optimisation, extra feature, broad refactor | Suggest; do not widen the change |
| Environment missing, key acceptance cannot run | Mark blocked or partially verified; never fake a pass |

Stronger models widen the first row, never the third.

## When nobody can answer
<!-- keelson: id=shape.unattended | without: an unattended session either blocks forever on a question or silently lands a change nobody approved | sunset: never -->

In a scripted or unattended session there is no one to confirm a write-back or approve a plan. Do not stall, and do not skip the artifacts: write the understanding and the plan, mark assumptions `(assumed)`, build and verify under them, and stop before landing. Say in `NOW.md` that the change awaits review. The reviewer then sees the plan and the diff together and lands with `--confirm-assumptions` or rejects.

## Exploring (the user is thinking, not asking)
<!-- keelson: id=shape.explore-stance | without: agent forces a proposal on someone who wanted a thinking partner | sunset: never -->

If the user is weighing options rather than requesting work, take the thinking-partner stance: read-only, surface multiple directions, sketch trade-offs, offer a grounded recommendation, and let them pick. Keep decisions in the conversation; do not create a change until they say so.

## Sizing rules of thumb
<!-- keelson: id=shape.sizing | without: agent runs ceremony on trivia or skips planning on contract changes | sunset: when 50 consecutive changes needed no tier override from the user -->

- Would the owner want to read a plan before code exists? → spec.
- Does any `Requirement:` in the specs change, appear, or disappear? → spec.
- Migration, external dependency, or work that will cross sessions? → spec.
- Are you abandoning the obvious approach for a hidden constraint? → spec, and record the alternative.
- Otherwise several files with clear intent → quick. One file, no behaviour change → trivial.
