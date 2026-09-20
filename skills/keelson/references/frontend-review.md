# Frontend review and finishing

Audit finds observable failures; critique evaluates task clarity and design choices; polish fixes scoped inconsistencies and verifies the result.

## Observe the running interface
<!-- keelson: id=frontend-review.observe | without: Source inspection is mistaken for seeing the rendered experience | sunset: never -->

Run the app using the project's normal command. Record route, viewport, content and state; open the page and inspect the screenshot yourself before forming visual conclusions. Follow the primary journey and relevant keyboard and narrow-screen paths. Notice what attracts attention first, how the next action is understood, and whether feedback and recovery match reality.

For audit, inspect semantics, names/labels, keyboard/focus, contrast, state recovery, responsive behavior and relevant runtime issues. For critique, explain hierarchy, grouping, information order, density, brand expression and how those choices affect the task. Distinguish observations, hypotheses and taste. Review-only requests produce findings without silently editing files.

A screenshot establishes one rendered state, not working interactions. A successful capture is not image review. Automated scans identify some failures and still require manual keyboard, visual and task checks. Do not invent findings to fill a checklist.

## Make findings actionable
<!-- keelson: id=frontend-review.findings | without: Subjective adjectives leave no reproducible problem or repair priority | sunset: never -->

For each material finding give location and trigger, observed behavior, user impact, evidence, and the smallest useful repair. Prioritize blocked tasks, lost work and misleading state first; then operability, comprehension, hierarchy and consistency; finish with decoration. Do not produce a score without a defined basis.

Example: “After a failed save, the button says Saved. Users may leave with unsaved changes. Bind feedback to the server result, preserve inputs and expose retry.” A specific before/after scenario is more useful than “make it intuitive.”

## Polish without broadening scope
<!-- keelson: id=frontend-review.finish | without: A finishing pass becomes a redesign or decorates unresolved failures | sunset: never -->

Once the journey works, inspect alignment, spacing rhythm, type roles, icon sizing/baselines, control heights, semantic color, hover/focus/pressed/disabled states and content consistency. Use existing tokens; remove accidental one-off values rather than normalizing intentional variation. Fix truncation, unstable loading and vague error copy before micro-decoration.

Check the densest and sparsest real content, not only the perfect demo. Keep an authorized local fix local. Recheck adjacent states and components that share the changed token.

## Recheck the same scenario
<!-- keelson: id=frontend-review.acceptance | without: Passing builds are reported as passing visual acceptance | sunset: never -->

Repeat the original route, viewport, data and state after changes. Compare rendered images for visual changes and execute the actual action for behavior changes. Reuse automation to protect stable contracts. Capture evidence after the last relevant edit.

Report separately: visual observations, interactions exercised, automated checks, and unverified scope. If a browser or required service is unavailable, name the blocked scenarios and explicitly report browser visual/interaction verification as not performed. Continue independent work; never convert unavailable evidence into a pass or lower acceptance to make a completion gate green.
