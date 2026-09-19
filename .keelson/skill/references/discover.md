# Discovering what is wanted

The user often cannot describe the whole requirement in the first sentence, and a newer developer may not know which choice is theirs to make. Discovery finds the problem behind the request before anyone picks a database.

## Scenario before technology
<!-- keelson: id=discover.scenario-first | without: the first question is a technology choice the owner cannot answer, and the product is shaped by whatever they guessed | sunset: never -->

When a request is a product idea ("a team knowledge base", "add collaboration"), do not ask about storage, frameworks, or schemas. Ask which use is at the centre, with concrete alternatives that differ in what the user would do:

> Which of these is closest to the first thing people will do with it?
> A. Several people edit the same documents.
> B. Company material is collected and searched.
> C. Material is handed to an assistant that answers questions.
> D. All of them eventually; a first version should pick one.
> For a first version I suggest picking one: permissions, search, assistant, and co-editing each add their own complexity, and together they stall the project.

Every discovery question carries the same six parts: the question, a concrete scenario, a recommendation, the reason, the alternatives, and the trade-off. When the owner says "I don't know", replace vocabulary with a situation ("Imagine two people open the same page at once. Should both be able to type?"), a small sketch, or a throwaway experiment. Never repeat the term louder.

## Which unknowns to raise
<!-- keelson: id=discover.frontier | without: either every unknown becomes a question and nothing starts, or the agent settles product questions by itself | sunset: never -->

Sort each unknown before asking:

| Unknown | Handling |
|---|---|
| Answerable from the code, tests, or docs | Read it; never ask |
| The project already has a convention | Follow it; mention it in the write-back |
| Low risk and easy to reverse | Decide, record it as confirmed under your authorization |
| Technical, and the owner has no reason to care | Pick a sensible default; say so in one line |
| Changes what the product does for its users | Ask, with a recommendation |
| Changes long-term architecture, cost, or a public commitment | Explain, then confirm |
| Destroys data, widens permissions, touches production | Confirm explicitly, always |

Only questions whose answer would change the result reach the owner. Everything else is a default or a `(assumed)` decision that surfaces before landing.

## Ask at the decision frontier
<!-- keelson: id=discover.decision-frontier | without: the agent either interrupts for facts it could investigate, invents user-owned intent, or asks low-value questions whose answers do not change the work | sunset: never -->

Before asking, classify the gap by who can resolve it:

| Gap | Action |
|---|---|
| Already established in repository/context | Use it; cite the source in the write-back |
| Reality-owned (code behaviour, API contract, benchmark, dependency capability) | Investigate or run a small experiment |
| User-owned and load-bearing (goal, scope, acceptance, risk tolerance, public commitment) | Ask one question |
| Non-load-bearing or cheap to reverse | Decide under authorization, or leave unresolved for a later slice |
| Evidence exhausted | Mark it UNKNOWN; do not convert uncertainty into a user belief |

Choose the question with the highest practical value of information: the one whose answer is most likely to change the next slice, multiplied by the cost of being wrong. You do not need a numeric score. Ask it neutrally; when useful, give concrete options and your recommendation. After the answer, update the write-back and reassess the frontier. "Exactly one question" is a bottleneck for **blocking uncertainty**, not a ritual: when no user-owned load-bearing gap exists, ask nothing and proceed.

## Scope guard
<!-- keelson: id=discover.scope-guard | without: a first request asks for five independent domains at once, and integration risk, debugging cost, and requirement churn compound | sunset: never -->

When a request bundles several domains (identity, payments, real-time collaboration, an assistant, plugins, mobile), name them as separate domains and propose an order: the domain that the others depend on first, the rest as later milestones in `ROADMAP.md → Next`. The reason is not that the code cannot be written; it is that each added domain multiplies the ways the first ones can be wrong, and nothing has been verified yet. Say that in plain words.

## Explore before committing
<!-- keelson: id=discover.explore | without: an abstract decision is forced when a cheap experiment would settle it with evidence | sunset: never -->

When a choice is reversible and the owner is unsure, do not press for a decision. Offer a spike, a prototype, a mock, or a benchmark, sized to answer one question: two small UI variants to pick between; a benchmark before adding a cache; a spike before adopting a library. Record the result as evidence in the ledger (`### Note:`) and the decision it produced under `## Decisions`.

## Guided mode
<!-- keelson: id=discover.guided | without: an owner who is learning receives choices without the context to make them, and learns nothing from the ones they make | sunset: never -->

When `config.yaml → guide` is true (or the resident block says guided mode is on), the owner is learning engineering by building. Same artifacts, different conversation:

- Present choices as scenarios with a recommendation, the reason, the alternatives, and the trade-off, in the owner's words. Engineering terms come after the explanation, in parentheses, as a name for what was just decided.
- Explain the reason a rule or a constraint exists when you apply it, in one sentence.
- After a spec change lands, close with a short teaching note: the key decision, why it was made, the engineering idea it is an instance of, and when it should be revisited. It goes in the conversation, not in the project files.

Guided mode never changes what is recorded or what gates apply; it changes how the conversation reads.
