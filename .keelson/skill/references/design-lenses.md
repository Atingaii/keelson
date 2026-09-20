# Risk-triggered design lenses

These are **internal lenses, not a questionnaire**. Apply only the lenses triggered by the current change. Read the repository first; ask the owner only when the remaining uncertainty is user-owned and load-bearing.

## Trigger, do not survey
<!-- keelson: id=lenses.triggered | without: every feature gets a giant architecture checklist or important cross-domain risks are missed | sunset: never -->

| Lens | Trigger examples | Inspect before asking | Typical result |
|---|---|---|---|
| User + domain | new workflow, ambiguous nouns, multiple actors | actor, job, current behavior, shared vocabulary, bounded context | scenario/non-goal; glossary only if load-bearing |
| Data + integrity | persisted state, schema, import/export, delete, money | ownership, invariants, lifecycle, retention, migration, audit/reconciliation | requirement + migration/rollback check |
| Security + privacy | auth, permissions, secrets, PII, uploads, untrusted input, tools | assets/data flows, least privilege, trust boundary, abuse, validation | negative acceptance + security check |
| Concurrency + async | queues, webhooks, workers, realtime, multi-writer | duplicates, ordering, idempotency, retry, timeout, cancellation, partial failure | duplicate/out-of-order/failure test |
| Compatibility + migration | public API, event/schema/config/storage format | existing consumers, breaking definition, deprecation, rollout, rollback | compatibility contract + rollout |
| Reliability + operations | critical path, background process, external dependency | failure behavior, recovery, observability, safe degradation | recovery test + metric/log/runbook pointer |
| Performance + cost | explicit latency/throughput/volume/cost goal, measured hot path | workload, target/SLO, baseline, resource limits | benchmark/load check; no speculative cache |
| Interface + accessibility | UI, forms, interactive flow | primary task, error/recovery, keyboard/focus, readable language | UI/accessibility acceptance |
| AI + nondeterminism | LLM, agent, RAG, model/tool calls | eval cases, fallback, data boundary, injection, tool authorization, reproducibility | eval set + safety/fallback acceptance |

A trigger means inspect the lens, not ask every question in the row.

## Turn risk into evidence
<!-- keelson: id=lenses.evidence | without: design review produces prose but important properties are not protected during future changes | sunset: never -->

Each triggered lens ends as one or more of:
- already guaranteed by an existing spec/rule/test → reuse it;
- owner-owned decision → ask at the decision frontier;
- engineering invariant → scoped rule or preferably executable fitness/check;
- acceptance/evidence obligation → add the relevant failure/compatibility/security/performance/migration/accessibility case;
- explicitly out of scope → name it once if omission would look accidental.

Do not create a generic non-functional-requirements document.

## Prioritize irreversible risk
<!-- keelson: id=lenses.priority | without: reversible details get attention while data loss, permissions, compatibility, or migration are silently guessed | sunset: never -->

Resolve roughly in this order: irreversible data/security/production side effects → public compatibility/migration/expensive architecture → failure/concurrency correctness → user-visible behavior/accessibility → measured reliability/performance/cost → reversible implementation taste.

Measure before adding performance machinery. For security, use the compact loop internally: **what are we working on → what can go wrong → what will we do → did evidence show it works?** Prefer executable fitness checks over review-time reminders.
