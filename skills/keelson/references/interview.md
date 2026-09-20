# Adaptive decision interviews

Keelson users do not need software-architecture vocabulary. Interviewing is hidden control logic: discover only decisions the owner truly owns, make each one easy to answer, then return to building. Ordinary work is **not** a questionnaire; explicit “grill me” requests are deeper stress tests of the same decision tree.

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

## One decision, recognition over recall
<!-- keelson: id=interview.one-at-a-time | without: a wall of questions overloads the owner, while open-ended jargon questions force beginners to invent architecture preferences | sunset: never -->

Ask one blocking decision at a time. Prefer a concrete scenario and recognition over recall:

- describe the situation in the owner’s language;
- give 2–4 **materially different outcomes**, not technology brands;
- recommend one default and give the single most important reason;
- state one meaningful trade-off when it matters;
- include **“not sure / use your recommendation”** when legitimate;
- allow free text if none of the options fit.

Bad: “Postgres or MongoDB?”

Better: “Can one record contain fields that change shape freely between users, or should every record obey one shared schema? I recommend a shared schema unless flexible per-user shapes are a core feature; it keeps validation and migrations simpler.”

Do not make the owner remember earlier context to answer. Briefly restate the fact or constraint that makes this question relevant.

## Make the question scannable
<!-- keelson: id=interview.presentation | without: the right question is buried in prose, recommendations are mistaken for requirements, or the owner cannot see the choices at a glance | sunset: never -->

Keep the owner-visible interaction compact. Use this shape when options are useful:

**Decision:** <one plain-language question>

- A. <observable outcome>
- B. <observable outcome>
- C. <observable outcome, only if genuinely distinct>
- Not sure — use your recommendation

**Recommended:** <choice>, because <one decisive reason>.

Add a one-sentence “Why now” only when the relevance is not obvious. Do not expose the internal lens checklist, scoring, or chain of reasoning. If the owner asks for an explanation, answer it in normal chat before asking again.

## Dependency order and scope pressure
<!-- keelson: id=interview.order | without: downstream technology is decided before product boundaries, or the interview expands into speculative future architecture | sunset: never -->

Resolve decisions in dependency order:

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

After an answer, confirm **decision + consequence** in one sentence, persist only the durable result in the owning artifact, and recompute the decision frontier. Do not create a transcript.

For ordinary work, stop asking as soon as the next vertical slice has:
- a clear observable outcome;
- explicit boundaries/non-goals where needed;
- no unresolved owner-owned decision that blocks it;
- an acceptance/evidence path.

Questions about later slices remain open without blocking current work. If the owner explicitly asks to be grilled or stress-tested, continue through every **material** branch inside the requested boundary, but still reject speculative future branches and low-value implementation trivia.
