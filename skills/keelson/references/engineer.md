# Engineering method

Use this reference when a technical choice is non-obvious, expensive to reverse, or justified by a claim about performance, reliability, scalability, cost, or maintainability. This is a **method for choosing**, not another checklist. `model.md` owns domain language/boundaries; `design-lenses.md` tells you which risk dimension matters; this file tells you how to reason and gather evidence.

## Start from first principles, not inherited solutions
<!-- keelson: id=engineer.first-principles | without: a requested technology or existing convention is mistaken for the requirement itself, so the design optimizes a mechanism instead of the outcome | sunset: never -->

Before choosing a pattern or product, reduce the problem to six things:

1. **Observed facts** — what code, tests, telemetry, docs, or users actually establish.
2. **Outcome** — the observable result the change must create.
3. **Hard constraints** — compatibility, regulation, authorization, budget, platform, deadlines.
4. **Invariants** — what must remain true even if the implementation changes.
5. **Assumptions** — beliefs that are not yet evidence.
6. **Mechanisms** — cache, queue, service, database, framework, pattern, model stage, abstraction.

Mechanisms are hypotheses, not requirements. Strip the technology names out and ask: **if this mechanism did not exist, what property would fail?** Existing architecture is evidence and often a compatibility constraint, but “we already do it this way” is not by itself a reason to reproduce accidental complexity.

Prefer the smallest problem statement that preserves the outcome, constraints, and invariants. Do not solve a larger future problem unless the current contract or measured trend requires it.

## State a falsifiable claim before adding machinery
<!-- keelson: id=engineer.hypothesis | without: architecture is justified with adjectives such as "faster", "safer", or "more scalable", so success cannot be distinguished from coincidence | sunset: never -->

For a material uncertain choice, write the engineering claim in compact form before implementation:

```text
Hypothesis: mechanism X improves/protects response Y under condition Z.
Baseline: current or simpler design B.
Measure: M.
Decision threshold: T.
Budget: the smallest experiment that can discriminate.
```

Examples: “A cache keeps list p95 below 200 ms at 500 rps”; “an idempotency key prevents duplicate charges under at-least-once retry”; “a second Agent review finds requirement gaps the implementer misses.”

If the claim cannot be measured directly, identify the strongest observable proxy or structural evidence. If neither exists, treat the choice as an owner trade-off or a reversible default, not as a proven engineering fact.

## Use the cheapest experiment that can change the decision
<!-- keelson: id=engineer.experiment | without: teams argue from intuition for hours when a thin end-to-end slice, spike, measurement, or failure injection could answer the question | sunset: never -->

Choose the least expensive probe that discriminates between designs:

- **Tracer bullet** — one real user action end to end through every necessary layer.
- **Spike / prototype** — throwaway code to learn an API, integration, UI interaction, or migration constraint.
- **measurement / load test** — performance or cost claim against a representative workload.
- **Failure injection** — timeout, retry, duplicate, crash, dependency loss, or partial failure.
- **Ablation / counterfactual** — remove or simplify the mechanism and see whether the claimed benefit disappears.

Record experimental facts in the ledger; promote only the resulting durable decision. Prototype code does not become production code merely because it worked once.

## Ablation is for attribution, not ceremony
<!-- keelson: id=engineer.ablation | without: every extra component survives because the full system passes, even when nobody has shown that the component contributes anything | sunset: never -->

When a mechanism claims to earn its complexity, compare it with a simpler baseline:

1. Keep workload, environment, configuration, dataset, and random seed as stable as practical.
2. Measure the baseline.
3. Disable, remove, or simplify the mechanism.
4. Measure the same response.
5. Compare the difference against the threshold chosen **before** looking at the result.

If the effect is negligible, the mechanism has not earned its complexity; remove it or mark the evidence inconclusive. If results are noisy, repeat rather than cherry-pick.

A one-factor-at-a-time ablation can miss interactions. If X may only help when Y is present, use the smallest useful combination matrix (often a 2×2) rather than concluding from isolated removals. The goal is causal information good enough for the engineering decision, not statistical theater.

## Escalate to architecture only when the cost of change says it matters
<!-- keelson: id=engineer.architecture | without: every code organization choice becomes "architecture", while genuinely hard-to-reverse boundaries are made without explicit trade-off analysis | sunset: never -->

Treat a decision as architecture when it is broad or expensive to reverse: data ownership/schema, public contracts, trust boundaries, deployment/service boundaries, concurrency model, durable storage, external platform dependency, or an operational topology that many changes will inherit.

For a material architecture fork:

- Write the relevant **quality-attribute scenario** as: stimulus → environment → expected response → measurable response.
- Sketch **two credible designs** before choosing. Do this only for a real fork, not to satisfy a template.
- Compare them against current needs: complexity, modifiability, reliability, security, performance/cost, testability, migration/rollback, operations, blast radius, and reversibility.
- Prefer the simplest design that satisfies the measured/current requirements while leaving a credible path to change.
- If the decision is cross-cutting and expensive to revisit, record a short ADR (when the project has `refs.decisions`) with context, decision, consequences, and a **revisit trigger**.
- Turn measurable architectural characteristics into `fitness` checks.

Architecture is not a diagram count or a collection of named patterns. It is the set of consequential boundaries and trade-offs that shape future change. Preserve **conceptual integrity**: prefer a small, coherent set of concepts and boundaries to locally clever exceptions that make every feature require a new mental model.

## Structure code so change stays local
<!-- keelson: id=engineer.structure | without: interfaces mirror frameworks and databases, callers know implementation details, and a small product change fans out across unrelated modules | sunset: never -->

- **Hide complexity.** Prefer a small interface over a deep implementation to many shallow wrappers. A module is good when callers need to know less.
- **Protect policy from volatile details.** Keep domain/use-case decisions from depending directly on framework, transport, database, or vendor-specific shapes when a real boundary makes substitution/testing cheaper.
- **Put things that change together close together.** A recurring one-feature/five-directory diff is evidence that the boundary is wrong.
- **Use domain boundaries.** When the same word has different meanings or invariants in two areas, use `model.md` to make the bounded contexts and translation explicit.
- **Patterns are vocabulary, not goals.** Name a pattern only after the problem already has the shape the pattern solves.
- **New infrastructure must name its pressure.** A new queue, cache, service, datastore, framework, protocol, or abstraction needs a current constraint, measurement, or failure mode that requires it.

## Evolve existing systems safely
<!-- keelson: id=engineer.evolution | without: unclear legacy behavior is rewritten in one jump, regressions are discovered after cutover, and modernization risk is concentrated into a single release | sunset: never -->

For existing/legacy code: **characterize → find a seam → make a small behavior-preserving refactor → verify → change behavior**. Refactoring is not the behavior change; it creates a safer shape for the behavior change.

For replacements that cannot safely land at once, prefer parallel change / branch by abstraction or an incremental strangler-style path: old and new coexist behind a controlled boundary while traffic/data/callers move gradually. Make rollback or reverse migration explicit when the risk warrants it.

For greenfield integration, a thin tracer bullet should prove one complete path before broad horizontal construction. Avoid a big-bang rewrite unless the owner accepts the cutover risk and there is evidence that incremental migration is materially worse.

**Second-system check:** replacing a painful system is not permission to add every deferred feature, abstraction, or platform idea at once. Keep the replacement bounded to its outcome; unrelated wishlist items become separate changes unless acceptance truly depends on them.

## Make durable quality executable
<!-- keelson: id=engineer.fitness | without: architecture quality survives only while reviewers remember prose, so the same constraint is rediscovered and violated repeatedly | sunset: never -->

“Fast”, “reliable”, “secure”, and “scalable” are not executable requirements. Give the quality a scope and response measure, then put it in the spec. When a command can test it, add it to `config.yaml → check` with `kind: fitness`.

Fitness checks protect the **important characteristic**, not a favorite implementation shape. A dependency-direction check may be correct when that boundary protects policy; “must have five layers” is not a useful fitness function unless those layers themselves are the requirement.

Repeated review comments are evidence that either the design should be simplified or the invariant should become an automated check.
