# Risk-triggered design lenses

These are **internal engineering lenses, not an architecture questionnaire**. Apply only the lenses triggered by the current change. Read the repository and existing contracts first; route what you find into defaults, experiments, acceptance, checks, or a single owner decision.

## Trigger, inspect, route
<!-- keelson: id=lenses.triggered | without: every feature gets a giant checklist, while important cross-domain risks still slip through because the list is treated mechanically | sunset: never -->

| Lens | Trigger examples | Inspect before asking | Prefer to produce |
|---|---|---|---|
| User + domain | new workflow, ambiguous nouns, multiple actors | actor/job, current workflow, vocabulary, ownership boundary | scenario/non-goal; glossary only if load-bearing |
| Data + integrity | persisted state, schema, import/export, delete, money | source of truth, invariants, lifecycle, retention, migration, audit/reconciliation | requirement + migration/rollback/reconciliation evidence |
| Security + privacy | auth, permissions, secrets, PII, uploads, untrusted input/tools | assets, trust boundaries, least privilege, abuse paths, validation | negative acceptance + security check |
| Concurrency + async | queues, webhooks, workers, realtime, multi-writer | duplicates, ordering, idempotency, retry, timeout, cancellation, partial failure | duplicate/out-of-order/retry/failure tests |
| API + compatibility | public API, event/schema/config/storage format | consumers, versioning, breaking definition, deprecation, rollout/rollback | compatibility contract + rollout evidence |
| Reliability + operations | error handling, cleanup/resource lifetime, critical path, background process, external dependency | full failure path, recovery, observer-visible state, observability, safe degradation | adversarial regression + recovery check; operational pointer when relevant |
| Performance + cost | explicit latency/throughput/volume/cost target, measured hot path | workload, SLO, baseline, growth assumption, resource ceiling | benchmark/load/cost check; no speculative cache |
| Interface + accessibility | UI, form, navigation, interactive workflow | primary task, error/recovery, keyboard/focus, comprehension, destructive action | usability/accessibility acceptance |
| AI + nondeterminism | LLM, agent, RAG, model/tool call | eval cases, fallback, data boundary, prompt/tool injection, authorization, reproducibility | eval set + safety/fallback acceptance |

A trigger means “inspect this dimension”, **not** “ask every question in this row”.

## Make failure contracts executable before the fix
<!-- keelson: id=lenses.failure-contract | without: an error-handling fix covers the first failure but a later finalizer or observer still discards errors or exposes corrupted state | sunset: never -->

For error-handling or resource-lifetime changes, trace the entire call path before editing, including nested cleanup, finalizers, notifications, and the final caller. In the existing plan or test notes, briefly map each phase to: what can fail, what must still run, what state observers must see, and which errors must reach the caller. Derive these obligations from the request and existing contracts; distinguish an explicit requirement from an additional robustness probe.

Turn the highest-risk combination into a failing regression **before** the implementation: inject distinct errors into multiple phases of one execution, including the last applicable observer, and exercise a nested or already-active resource when supported. Assert the required final state and the propagated errors' identities, multiplicity, and order when contractual; assert observer-visible state at the time the observer runs. A passing single-error test does not establish the combined-failure contract. Keep this focused on the affected lifetime rather than inventing a generic framework or an exhaustive fault matrix.

## Prefer simple, reversible architecture
<!-- keelson: id=lenses.simplicity | without: the agent designs for hypothetical scale, introduces abstractions before pressure exists, or treats every future possibility as a current requirement | sunset: never -->

Use the simplest design that satisfies the current contract and leaves a credible path to change. Before adding a new service, queue, cache, abstraction layer, database, framework, or protocol, name the concrete pressure that requires it now.

Treat speculative future scale/features as a hypothesis, not a requirement. If the pressure is cheap to test, run a spike/benchmark. If the design can be changed locally later, prefer the reversible choice and keep moving. Deep modules and narrow interfaces are preferred over many shallow wrappers that merely mirror implementation.

## Turn risk into evidence, not prose
<!-- keelson: id=lenses.evidence | without: design review produces impressive documentation but important properties are not protected when the code changes | sunset: never -->

Each triggered lens must end as one or more of:

- **already guaranteed** by an existing spec/rule/test → reuse it;
- **owner-owned decision** → ask at the decision frontier;
- **engineering default** → decide and record only if future work needs the rationale;
- **cheap uncertainty** → spike, prototype, benchmark, or inspect telemetry;
- **stable invariant** → scoped rule, preferably an executable fitness/check;
- **acceptance/evidence obligation** → add the failure/compatibility/security/performance/migration/accessibility case;
- **explicitly out of scope** → name it once when omission would otherwise look accidental.

Do not create a generic NFR document or architecture checklist artifact.

## Protect architecture with fitness functions
<!-- keelson: id=lenses.fitness | without: architecture quality depends on reviewers remembering prose rules and gradually decays as the project evolves | sunset: never -->

When a durable architecture characteristic can be measured mechanically, convert it into `config.yaml → check` instead of repeatedly explaining it:

- forbidden dependency direction;
- public schema/API compatibility;
- latency or bundle-size ceiling;
- migration reversibility check;
- security/static-analysis policy;
- accessibility test;
- deterministic contract/eval suite.

Keep only enough prose to explain **why** the guard exists and where it applies. Repeated review comments are evidence that a fitness check or narrower rule should replace prose.

## Prioritize irreversible risk
<!-- keelson: id=lenses.priority | without: reversible taste gets debated while data loss, permissions, compatibility, migrations, or failure semantics are silently guessed | sunset: never -->

Resolve roughly in this order:

**irreversible data/security/production effects → public compatibility/migration/expensive commitments → failure/concurrency correctness → user-visible behavior/accessibility → measured reliability/performance/cost → reversible implementation taste**

For security use a compact loop internally: **what are we protecting → what can go wrong → what control prevents/detects it → what evidence proves the control works?**

For performance and scale, measure before adding machinery. For distributed work, assume retries and partial failure exist unless the transport contract proves otherwise. For destructive behavior, make recovery/rollback explicit.
