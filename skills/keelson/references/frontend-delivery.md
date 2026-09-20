# Frontend delivery and iteration

Keep responsive behavior, performance and visual verification attached to the same real journey.

## Adapt to actual conditions
<!-- keelson: id=frontend-delivery.adaptation | without: One fixed screenshot conceals overflow and unreachable mobile controls | sunset: never -->

Check required wide, narrow and intermediate widths, then resize to locate where content actually fails. Choose breakpoints from that failure, not only device names. Preserve meaningful content and reading order rather than hiding the difficult part on mobile.

Inspect wrapping, scrolling regions, sticky/fixed surfaces, touch reach and viewport height. Tables may intentionally scroll if relationships and scroll affordances remain clear; unexpected page overflow is a defect. Where applicable test zoom, landscape, mobile keyboard, pointer and keyboard input. Primary actions and error messages must remain reachable. Recheck real long/empty/dense content at each affected layout.

## Measure the affected journey
<!-- keelson: id=frontend-delivery.performance | without: Speculative optimization adds mechanisms without reducing user wait | sunset: never -->

Record the path, device/network conditions, measurement method and relevant existing budget before optimizing. Locate the dominant source: downloads, fonts, images, rendering, event handlers, long lists or repeated requests. Use available project tooling rather than adding a framework for appearances.

Make the smallest supported improvement, such as correctly sized images with dimensions, loading noncritical resources later, reducing repeated work or splitting a measured heavy path. Remeasure under comparable conditions and confirm correctness and interaction quality. Do not present one development-machine sample as a universal improvement or trade away accessible content to reduce a number.

## Extract and document what is stable
<!-- keelson: id=frontend-delivery.system | without: One-off abstractions proliferate or documented design drifts from code | sunset: never -->

For extract, first find real repeated usage and its behavioral differences. Consolidate stable semantic tokens and components using the current stack, naming and ownership boundaries. Preserve public props, responsive behavior, accessibility and exceptional states. Migrate representative call sites and test them before expanding. Do not abstract a single occurrence or create universal components with dozens of unrelated switches.

For document, inspect actual CSS/theme files and representative components. Record token roles, typography, spacing, layout, states, accessibility patterns and examples in existing project docs; link to code rather than duplicate everything. Mark proposals separately from observed conventions. Correct the docs after implementation and keep only decisions that future work needs.

## Explore and iterate deliberately
<!-- keelson: id=frontend-delivery.iteration | without: Variants differ only in color or iteration continues without a task-based decision | sunset: never -->

For explore, use the same real content and task to compare a few materially different compositions or interaction approaches only when uncertainty justifies it. Name what each improves and sacrifices. Use code prototypes or image tools according to the question; do not treat an image as working software. Implement the selected direction within authorization; ask only when an unresolved choice belongs to the owner.

For iterate, inspect the rendered surface, identify one high-impact hypothesis, change a coherent area, reload and compare. Preserve application state where practical and check neighboring states. Stop when acceptance is met rather than chasing endless cosmetic variants. Temporary branches, prototypes and generated assets are owned task artifacts; retain the chosen deliverable and needed evidence, remove only disposable artifacts created for this work.

## Close the browser loop
<!-- keelson: id=frontend-delivery.browser | without: Code passes while browser-only visual and interaction failures ship | sunset: never -->

For interface changes or visual/interaction conclusions, use the host's browser tools or the project's existing browser tests to open the running app. Confirm the intended route and resources actually loaded; inspect captured screenshots; execute the primary action and relevant recovery. Check related console/network failures. Keep route, viewport, representative data, steps, result and enough screenshots or test records to reproduce the observation.

After a repair, reload and repeat the affected scenario; earlier images cannot prove the new state. Visual inspection, interaction runs and automated checks are distinct evidence. Record them through the existing verification workflow without treating a printed brief as a check result. If tools/services are unavailable, continue independent checks, identify unverified scenarios and give exact follow-up steps; never mark browser acceptance as passed. Remove disposable task outputs at delivery and preserve evidence needed for review.
