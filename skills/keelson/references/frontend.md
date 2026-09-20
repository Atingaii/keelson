# Frontend design

Use for creating, improving, diagnosing or verifying an interface people see and operate. Keep the existing change lifecycle; add design judgment and observable interface acceptance.

## Route by the problem
<!-- keelson: id=frontend.routing | without: Small UI fixes turn into broad redesigns and every request loads all guidance | sunset: never -->

Read the affected screen, neighboring screens, components and tokens first. Distinguish a new surface, an extension of an existing system, a diagnosis and a local fix. Load only the relevant reference:

| Need | Reference | Design actions |
|---|---|---|
| Diagnose, prioritize, verify | `frontend-review.md` | audit, critique, polish |
| Hierarchy, typography, color, layout, imagery, motion | `frontend-visual.md` | typeset, color, layout, animate, simplify, bolder, quieter, delight |
| Forms, feedback, recovery, copy, first use, languages | `frontend-interaction.md` | harden, clarify, onboard |
| Devices, performance, reusable systems, visual iteration | `frontend-delivery.md` | adapt, optimize, extract, document, explore, iterate |

`keelson design` lists focused action briefs; `keelson design <action> [target]` prepares instructions for the host agent. It does not execute an audit, open a browser or edit files. Natural-language requests use the same routing without requiring users to memorize commands. Execute only sections triggered by the selected action and original request. Planning, review and documentation do not implicitly authorize product-code changes. Browser checks apply to actual interface changes or visual/interaction conclusions; source-only documentation must state that basis. For build, start with the task below and load visual/interaction guidance as needed. A local bug goes directly to its narrow fix and regression.

## Establish a concrete direction
<!-- keelson: id=frontend.direction | without: Decoration replaces a coherent user task and visual hierarchy | sunset: never -->

Infer audience, primary job, key content, operating conditions and brand constraints from the request and project. State one concrete design intention, such as “help frequent reviewers spot exceptions and resolve them in the list.” Reuse settled answers; ask only for a material missing product decision.

Preserve an existing visual system unless an observed problem requires changing it. For a new surface, choose a coherent composition that fits its content; do not default to a particular font, gradient, card grid or oversized hero. Translate “bolder,” “quieter,” or “premium” into an observable change in emphasis, grouping, density or expression. Reversible design choices belong to agent judgment within the user's authorization.

Keep durable product facts in existing intent/docs; record stable visual conventions in existing design docs or a scoped rule only when future work needs them. A one-off page does not need another mandatory document hierarchy.

## Build one real path
<!-- keelson: id=frontend.slice | without: A polished first screen hides incomplete states and unusable controls | sunset: never -->

For implementation tasks, implement a representative user journey before expanding to more screens. Use real or explicitly representative content, including long text, missing values and realistic data volume. Prioritize task blockers and comprehension, then hierarchy and responsiveness, then decoration. Every visible control must work, explain its unavailable state, or be removed within scope.

Express acceptance in existing change artifacts: who, in what state and environment, performs what action, observes what outcome, and how it will be checked. Reuse project components, utilities and test facilities. Do not add a library merely to demonstrate sophistication. Complete with `frontend-review.md` and the browser loop in `frontend-delivery.md`; code checks alone cannot establish visual quality.
