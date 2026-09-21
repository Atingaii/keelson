# Adaptive decision interviews

Keelson users describe their goals in ordinary language. The agent automatically chooses the depth of discovery from unresolved decisions and their consequences; users need no skill name, special phrase, or interview-mode switch. Investigate first, make owner decisions easy to answer, then return to the requested work.

## Trigger discovery from the work
<!-- keelson: id=interview.activation | without: users must know to request a deep interview, so vague goals and consequential assumptions reach implementation unchecked | sunset: never -->

For a new goal, a material follow-up, or new evidence that changes a settled premise, inspect relevant repository facts and prior answers, then choose the depth:

- **Clear and bounded:** the outcome, acceptance and relevant constraints are established. Proceed without an interview; a routine edit or factual explanation needs no discovery ceremony.
- **One consequential gap:** ask the highest-value ready owner decision, with a recommendation and reason; reassess after the answer.
- **Connected uncertainty:** the goal or success criteria are unclear, product choices depend on one another, requirements conflict, or unresolved permission/data/compatibility/migration commitments would materially change the design. Automatically work through the relevant decision branches before committing to a dependent design. A request such as “add team sharing” is enough when these choices remain open; do not ask whether to enable a deeper interview.

Trigger on missing decisions and consequences, not keywords or task size alone. Existing contracts can settle even a high-risk question. Inspect domain risks using `design-lenses.md`, investigate facts yourself, and ask only what requires the owner's judgment. Apply the same rule when later answers reveal new branches. Preserve settled choices unless new evidence justifies reopening them.

Discovery does not expand authorization: an exploratory conversation stays read-only, while an authorized change resumes implementation as soon as its relevant decisions are resolved. An explicit request for broader review can widen the review boundary, but is never required to activate discovery.

## Find the purpose before choosing the mechanism
<!-- keelson: id=interview.purpose | without: the interview optimizes the requested feature while the underlying user problem and success criterion remain untested | sunset: never -->

Start from evidence: who is trying to do what, in which situation, what prevents it today, what observable improvement would count as success, and which constraints are fixed? Fill what the request and repository already establish. These are reasoning prompts, not five mandatory questions.

Separate an explicit requirement from a proposed means. “Add a dashboard” may serve faster decisions, exception detection or reporting; those imply different products. When the purpose is unclear, ask for one concrete recent situation or a comparison that distinguishes these outcomes. Check the causal claim: would the simpler existing flow achieve the same result, and what would still be missing if the proposed mechanism were removed? Treat your interpretation as a hypothesis with a source, not the owner's hidden intent. Respect a mechanism the owner explicitly requires; explain a conflict before proposing a change.

Use engineering principles only where they change a decision: an observable acceptance scenario for success, a domain term or invariant for boundaries, measurement for a performance claim, reversibility for commitment, and the smallest end-to-end slice to test the chosen direction. Do not turn this into a theory lecture, a technology questionnaire or an endless sequence of “why?” questions. Stop pursuing the cause when the next design decision and its evidence path are clear.

Even a small request needs an outcome check: mentally replay the proposed experience and ask whether the original frustration would still exist. Preserving data does not require preserving its presentation. If two plausible experiences would change whether the problem is solved and the owner has not chosen, ask one concrete contrast with a recommendation before coding. If the request already establishes the experience, state the observable acceptance and proceed. Small scope is not evidence that purpose is settled.

## Question protocol: earn the interruption
<!-- keelson: id=interview.protocol | without: the agent asks unnecessary questions, hands implementation choices to the owner, or interrupts without knowing what the answer changes | sunset: never -->

Before asking, answer internally:

1. **Consequence** — what user-visible behavior, acceptance boundary, risk, cost, compatibility promise, or durable commitment changes with the answer?
2. **Ownership** — is the answer owned by repository/reality, Agent engineering judgment, or owner intent/risk tolerance?
3. **Discoverability** — can code, tests, docs, telemetry, official docs, or a small experiment answer it?
4. **Reversibility** — if the default is wrong, is recovery cheap and local or expensive/irreversible?
5. **Information value** — is this the unresolved choice most likely to change the next safe slice?
6. **Default** — what grounded answer would you choose if the owner said “use your judgment”?

If you cannot name a material consequence, or the owner does not own the answer, **do not ask**. Investigate, choose the reversible default, or defer it to a later slice.

## Blindspot pass before the first question
<!-- keelson: id=interview.blindspots | without: the interview handles only unknowns the user already knows about and misses domain-specific failure modes | sunset: never -->

Do one compact risk-triggered pass before interviewing. Load only the rows triggered in `design-lenses.md`; inspect the repository and existing contracts first. Look for unknown unknowns that commonly change the design: destructive data semantics, permission boundaries, external compatibility, duplicate/retry behavior, migration/rollback, failure recovery, accessibility, measured performance/cost, or AI nondeterminism.

A blindspot does **not** automatically become a question. Route it to an existing guarantee, an engineering default, an experiment, an acceptance/evidence case, or an owner decision. Ask only the last category.

## Match the round to the uncertainty
<!-- keelson: id=interview.one-at-a-time | without: a wall of questions overloads the owner, while open-ended jargon questions force beginners to invent architecture preferences | sunset: never -->

Read existing decisions before asking. When the current request authorizes project writes, use `ask add`, `settle`, `assume`, and `frontier` to persist ownership, dependencies, answers and basis on its active change. Never repeat a settled answer without new evidence and `ask reopen <id> --reason`. During read-only exploration, even if an active change exists, keep new answers in the conversation; transfer durable results only when implementation or persistence is authorized.

Build the ready frontier from consequential unresolved choices, not from every possible question. Combine duplicate formulations of the same decision, resolve facts first, and defer genuinely independent future work with its unresolved state preserved. If a round feels large, inspect for an unresolved upstream purpose that would make several downstream questions premature. Keep distinct material choices separate. There is no minimum or maximum interview length: ask zero when ready, one for a single gap, and the relevant ready layer when choices interact. Do not trade away an unresolved permission, acceptance or commitment just to keep the round short.

For a simple gap, ask one highest-value ready owner decision (`ask frontier --limit 1`). For connected uncertainty, ask the **whole ready owner frontier in one round** (`ask frontier --all`), grouped by topic with a recommendation and reason for each question. If the host caps questions, bundle them in one supported text question or deliver same-round batches; do not move to dependent questions until the round's prerequisites are settled. A recommendation is not an answer: wait for the owner's response unless existing authorization explicitly delegates the choice. Repository/reality-owned facts are investigated, never put to the owner. Irreversible decisions require settlement, not assumptions. Prefer a concrete scenario and recognition over recall:

- describe the situation in the owner’s language;
- give 2–4 **materially different outcomes**; when useful, attach one concise **Engineering:** consequence to each option instead of making the owner infer the implementation;
- recommend one default and give the single most important reason;
- state one meaningful trade-off when it matters;
- include **“not sure / use your recommendation”** when legitimate;
- allow free text if none of the options fit.

Bad: “Postgres or MongoDB?”

Better: “Can one record contain fields that change shape freely between users, or should every record obey one shared schema? I recommend a shared schema unless flexible per-user shapes are a core feature; it keeps validation and migrations simpler. **Engineering:** with the project's existing relational database this is a normal typed table; no new datastore is needed.”

Do not make the owner remember earlier context to answer. Briefly restate the fact or constraint that makes this question relevant.

## Make the question scannable
<!-- keelson: id=interview.presentation | without: the right question is buried in prose, recommendations are mistaken for requirements, or the owner cannot see the choices at a glance | sunset: never -->

Keep the owner-visible interaction compact. Start a round with the current understanding and what the answers unlock. Number questions so the owner can answer briefly; in a single-question round, a number is optional.

**Decision:** <one plain-language question tied to the current situation>
- A. <observable outcome>; B. <meaningfully different outcome>.
- **Recommended:** A, because <decisive reason>; <main trade-off when material>.

Add another option only when it changes the result; accept free text or an explicit “use your recommendation” when legitimate. A neutral example or short open question is better when you lack grounds to recommend. “I don't know” alone is not delegation. **Implementation direction:** add one sentence only when a concrete engineering consequence helps the owner choose; do not repeat the same explanation under every option.

The owner may reply “agree with the recommendations except 2…”. Apply that to the explicitly presented choices only; an unanswered item stays open. Do not expose internal lens checklists or reasoning. If the owner asks for an explanation, answer it before asking again. Use `writing.md` for the durable result, without imposing a five-question cap on the ready frontier.

## Show enough implementation consequence
<!-- keelson: id=interview.implementation | without: the owner understands the product choice but cannot tell what it means for the actual system, or technology names are presented without architectural context | sunset: never -->

Before naming a technology, inspect the repository's actual stack. The question card should make the engineering consequence concrete without turning into technology shopping:

- If the existing stack supports an option, say what changes inside that stack: schema/table, permission model, endpoint/contract, background job, cache, migration, or test surface.
- If **no new technology is required**, say so explicitly. Do not introduce Redis, Kafka, a new database, a new service, or a framework merely to make the answer look technical.
- If options genuinely require different architecture, name the likely concrete technology or category and why—for example “existing Postgres + ACL table is enough” versus “team-wide fan-out at this scale would require a queue”.
- In a greenfield project, state a **likely direction**, not a fake certainty: “relational database such as Postgres”, “object storage”, “queue only if asynchronous fan-out is required”.
- Prefer implementation consequences the owner can reason about: consistency, migration difficulty, operational cost, failure modes, permissions, and future reversibility.

Technology is explanatory context after the product consequence is clear. It is not a substitute for the decision itself.

## Dependency order and scope pressure
<!-- keelson: id=interview.order | without: downstream technology is decided before product boundaries, or the interview expands into speculative future architecture | sunset: never -->

Resolve decisions in dependency order:

Maintain a compact decision tree: each unresolved choice names its prerequisites and the outcome it changes. Each answer settles a branch or exposes new ones. Recompute the ready frontier after every round; ask the whole ready owner frontier in a complex round with recommended answers and reasons, wait for those answers, then work the newly unblocked branches. An investigation still in progress is an unresolved prerequisite, not permission to guess. Keep the full tree internal; show only the current questions and a concise result.

**problem / actor → scope and non-goals → observable behavior → data/permission invariants → external contracts → failure semantics → expensive architecture → implementation details**

Ask earlier questions only when they change later branches. Detect grab-bag requests and rabbit holes: separate independent domains, identify which one unlocks the next useful slice, and park speculative future needs instead of designing for them now.

A reversible implementation detail never deserves an owner question merely because multiple valid options exist.

## Adapt to expertise without profiling
<!-- keelson: id=interview.adaptive | without: beginners guess jargon, experienced owners get verbose tutorials, or the project stores a fragile beginner/expert label | sunset: never -->

Plain-language scenarios are the default for everyone. After the behavior is understood, name the engineering concept in one short phrase when useful. If the owner already uses a term precisely, mirror it and compress the explanation.

Never ask users to classify themselves as beginner/intermediate/expert and never persist such a label. Adapt from the current conversation only. `guide: true` adds pedagogy—why the choice matters, the name of the concept, and when to revisit it—but does not add more gates or more mandatory questions.

## “I don’t know” is a valid routing answer
<!-- keelson: id=interview.uncertain | without: users invent technical preferences, repeated questions create frustration, or work blocks on a choice a prototype/default could settle | sunset: never -->

Treat uncertainty as information:

- **Reality-owned** → investigate.
- **Reversible engineering choice** → follow project precedent or use the recommended default.
- **User-owned but hard to imagine** → show the smallest example, payload, sketch, comparison, or throwaway prototype.
- **Performance/cost uncertainty** → measure before adding machinery.
- **High-impact owner decision still unknown** → block only the slice that truly depends on it.
- **User asks for explanation instead of answering** → explain first in normal chat; do not immediately re-ask the same card/question.

Never turn “I don’t know which technology” into a technology poll. Translate it into the product property or operational constraint that would make the technology choice matter.

## Carry answers into the same delivery flow
<!-- keelson: id=interview.continuity | without: discovery ends as a chat summary while implementation and review proceed from a different goal or lose the owner's decisions | sunset: never -->

Within write authorization, keep follow-ups on the same change. Preserve the original request and material additions in `request.md`; record structured choices with stable IDs, dependencies, answers and basis in `decisions.json`. No separate interview report or user-operated handoff is required. For a short clear change, its existing What/Acceptance/Decisions fields suffice; do not manufacture questions to populate a tree.

Map each consequential answer to the artifact it changes:

| Answer establishes | Write or update |
|---|---|
| Actual problem, actor, desired improvement | `change.md → Why` and `What`; refine `INTENT.md` only if it changes a project-wide fact |
| Scope, non-goal or rejected alternative | `What` and `Decisions`; explicitly deferred work goes to the tracker/roadmap |
| Observable behavior or invariant | `Acceptance` and the relevant delta scenario; cite the decision ID where useful |
| Engineering consequence | `How`, the affected task/slice and its verification path |
| Unresolved premise or changed answer | The existing decision and affected dependent decisions, open questions and acceptance; explain each reopening |

Use short references such as “D-visibility → owner-only access scenario → create/list slice → access check”, not a duplicate traceability document. Store long supporting evidence once and declare its path in `context.json` for implement/check when needed. Before starting, compare the recorded outcome with the original request, check material branches and the full registered frontier, then run `start` and load `context --phase implement` automatically. A planning change invalidates the old receipt.

If an upstream answer changes, inspect every dependent settled choice; reopen the affected ones with a reason and update acceptance, deltas and tasks before dependent edits. The CLI does not automatically reopen descendant decisions or rewrite prose. Preserve unrelated answers. Independent review loads `context --phase check` and verifies purpose → decision → behavior → evidence, including excluded scope. After landing, promote stable behavior and rationale through `reconcile.md`; future conversations reuse them.

## Read back, persist the result, and stop
<!-- keelson: id=interview.stop | without: answers stay trapped in chat, the same decision is asked again, or ordinary work becomes an endless interview | sunset: never -->

After an answer, confirm **decision + consequence** in one sentence, when the current request authorizes writes, persist only the durable result in the owning artifact, and recompute the decision frontier. Do not create a transcript.

Stop asking when the current review boundary or next implementation slice has:
- a clear observable outcome;
- explicit boundaries/non-goals where needed;
- no unresolved owner-owned decision or silent assumption that could change its outcome or design commitment;
- an acceptance/evidence path.

In deeper discovery, resolve every material branch that could change the current outcome or design commitment, including downstream choices revealed by earlier answers. Do not call a slice safe while its shared architecture relies on an unresolved high-impact decision. Independent work can continue: move genuinely later open choices into ROADMAP or a separate change, preserving their dependencies and unresolved state. `start` gates the whole current change; do not leave a blocking decision there while declaring the change ready. Reject speculative future branches and low-value implementation trivia. Return to the requested work without requiring an “end interview” phrase or repeating an approval already given.

For a tracked interview, `keelson ask frontier --all --json` must report `complete: true` before claiming its registered tree is settled. An empty question list alone can mean pending investigations, blocked dependencies or assumptions. Also check the current outcome, boundaries and domain risks for material branches not yet registered: graph completion cannot prove discovery completeness. Keep new findings in the conversation for read-only requests.
