# Engineering lenses

A short catalogue of engineering questions, grouped by when they apply. Pick the one to four that change this design; never run the whole list. Each lens is a question, a signal that it applies, and the artifact where its answer goes.

## Delivery
<!-- keelson: id=engineer.delivery | without: features are built layer by layer, choices that are hard to undo are made casually, and analysis replaces a cheap experiment | sunset: never -->

- **Tracer bullet.** Can one real user action run end to end, through every layer, before anything else is broad? Signal: a plan whose slices are named after layers. Goes to: `tasks.md` slice order.
- **Reversibility.** How costly is it to undo this choice? Signal: a new dependency, a schema, a public interface. Goes to: `## Alternatives` and `## Rollout`.
- **Prototype or spike.** Would a throwaway answer the question faster than analysis? Signal: an unfamiliar library, a UI choice, a performance guess. Goes to: a ledger `Note:` with the result.
- **Not yet.** Is this needed for the current slice, or for a slice nobody has asked for? Signal: "while we are here", configuration for one caller, abstractions with one implementation. Goes to: `ROADMAP.md → Next`, not the code.

## Structure
<!-- keelson: id=engineer.structure | without: interfaces mirror implementations, tests need the whole system, and one behaviour is spread over five directories | sunset: never -->

- **Deep module.** Does the interface hide more than it exposes? Signal: callers must know the order of calls or internal state. Goes to: `## How`.
- **Seam.** Where can behaviour be substituted for a test or a migration without editing the code around it? Signal: a hard-to-test dependency. Goes to: `## How`, and a test.
- **Cohesion and coupling.** Do the things that change together live together, and only those? Signal: a change that touches five directories for one behaviour. Goes to: `## Impact`.
- **Composition over inheritance.** Can the variation be a value passed in, rather than a subclass? Signal: a class hierarchy two levels deep for one behaviour difference.

## Evolution
<!-- keelson: id=engineer.evolution | without: legacy code is changed without pinning its behaviour, replacements ship as one risky cut-over, and constraints stay prose that keeps being broken | sunset: never -->

- **Characterization first.** Before changing code nobody fully understands, does a test pin its current behaviour? Signal: legacy code without tests. Goes to: the first task of the slice.
- **Branch by abstraction.** Can the old and new implementations coexist behind one interface while callers migrate? Signal: a replacement that cannot ship in one change. Goes to: `## How`, `## Rollout`.
- **Strangler.** Can the new path take traffic incrementally while the old one shrinks? Signal: replacing a subsystem. Goes to: slices and `## Rollout`.
- **Compatibility.** Who consumes this interface, and what breaks for them? Signal: **BREAKING**. Goes to: `## Rollout`.
- **Fitness check.** Can the constraint be a command that fails when violated? Signal: a rule that keeps being broken. Goes to: `config.yaml → check` with `kind: fitness`.

## Operation
<!-- keelson: id=engineer.operation | without: either reliability questions are skipped until the incident, or all of them are asked of an owner with ten users | sunset: never -->

Ask only the ones the current numbers make relevant: workload and data volume, latency (p95, not average), availability, consistency, durability, the failure model of each dependency, idempotency of retried operations, timeouts, retry and backoff, backpressure and load shedding, graceful degradation, the security boundary, observability, cost. Signal: a dependency that can fail independently, a queue, a cache, a third party, a public endpoint. Goes to: the capability spec as requirements (behaviour) or to `.keelson/rules/` as constraints, and to `config.yaml → check` when measurable.

Without over-engineering: state the number that would change the answer. "Tens of users and 20 ms queries: no cache; benchmark first, add one when p95 crosses 200 ms" is a design decision with a trigger, and it goes under `## Decisions`.

## Named patterns

Design patterns are shared vocabulary for a shape that already fits, never a requirement. Name one when the problem in front of you is the problem the pattern solves (a family of interchangeable algorithms, many listeners for one event, an incompatible interface to wrap, explicit state transitions, undoable operations), say it in `## How`, and stop. Introducing a pattern to look designed is the opposite of design.

## Quality targets
<!-- keelson: id=engineer.quality | without: "fast" and "reliable" are written down as requirements and nothing can ever fail them | sunset: never -->

Vague quality words ("fast", "reliable", "secure") are not requirements. A quality target is a number with a scope: "list endpoints answer within 300 ms at p95 for 10k items", "a worker crash loses no accepted job", "a share link grants access to its one resource and nothing else". Write them as requirements in the capability spec with a scenario, and, when a command can measure one, add it to `config.yaml → check` so it is evidence rather than intent.
