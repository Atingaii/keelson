# Interaction and content

Work from the actual user journey and data lifecycle. Cover the states that exist in this flow without inventing unrelated features.

## Define states and recovery
<!-- keelson: id=frontend-interaction.states | without: The happy path works but errors lose input or imply false success | sunset: never -->

For each affected control or region, identify applicable initial, loading, empty, partial, success, error, disabled and read-only states. Explain what actions remain available and which transition changes the state. Distinguish permissions from transient failure and absence of content from a filter with no matches.

Bind save feedback to real request results. Prevent duplicate side effects during submission, preserve recoverable input, and handle late/out-of-order responses using existing project patterns. Retry, cancel and back must not silently discard work. Simulate slow, offline, failed and interrupted paths where relevant. Do not create optimistic success without a recovery contract. Error copy should explain the problem, impact and a feasible next action; never expose secrets in diagnostics.

## Make controls operable
<!-- keelson: id=frontend-interaction.controls | without: Mouse demos pass while keyboard, touch or assistive use fails | sunset: never -->

Prefer semantically correct native elements and established project components. Controls need clear accessible names; inputs need persistent associated labels and connected help/error messages. A placeholder is not a label. Do not make essential actions depend on hover or color alone.

Actually test tab order, visible focus, keyboard submission and relevant popovers/dialogs. Opening and closing a modal must manage focus appropriately; hidden controls must not remain interactive. Validate without discarding input and help the user locate the failing field. Check dynamic feedback is available to assistive technology through the project's established pattern. Destructive actions need confirmation or recovery proportional to their real consequences; routine actions do not need extra permission dialogs.

## Clarify copy and first use
<!-- keelson: id=frontend-interaction.content | without: Users cannot infer what controls mean or how to reach a useful outcome | sunset: never -->

Use action verbs on buttons, orienting headings and only necessary constraints in supporting copy. Use the product's vocabulary rather than internal implementation terms. Replace vague failure messages with specific recovery. Explain why an action is unavailable when the reason is not apparent.

For onboard, start with the first useful task. Distinguish not-yet-created, no-results, no-access and failed-loading empty states and offer the correct next step. Teach at the moment of need; allow nonessential guidance to be skipped. Do not add a mandatory tour or welcome modal by default. Preserve user data during examples and never imply sample content belongs to a real customer.

## Apply content and language pressure
<!-- keelson: id=frontend-interaction.locale | without: Translations and real values break layout or change meaning | sunset: never -->

Use the project's localization mechanism. Avoid constructing translated sentences from fragments. For supported locales, check longer translations, mixed scripts, plurals, number/date/timezone formatting and writing direction. Prefer logical layout properties when bidirectional support is required.

Exercise long names, long error messages, absent data, large values and content that cannot naturally wrap. Preserve task context across locale changes and asset failures. Do not impose arbitrary input limits just because the demo is short. State which locales and directions were actually checked; avoid claiming coverage from source inspection alone.
