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

Keep the owner-visible interaction compact. Use this shape when options are useful:

**Decision:** <one plain-language question>

- A. <observable outcome>  
  **Engineering:** <data model / permission / API / operational consequence if material>
- B. <observable outcome>  
  **Engineering:** <material implementation consequence>
- C. <observable outcome, only if genuinely distinct>  
  **Engineering:** <material implementation consequence>
- Not sure — use your recommendation

**Recommended:** <choice>, because <one decisive reason>.  
**Implementation direction:** <reuse the current stack; name the likely concrete components only when they are supported by the repository or genuinely differ by option>.

Add a one-sentence “Why now” only when the relevance is not obvious. Do not expose the internal lens checklist, scoring, or chain of reasoning. If the owner asks for an explanation, answer it in normal chat before asking again.

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
