# Visual craft

Choose expression from the product, content and task. Existing design decisions take precedence over generic styling preferences.

## Compose before decorating
<!-- keelson: id=frontend-visual.hierarchy | without: Every element competes for attention and repeated containers hide relationships | sunset: never -->

Rank content importance before choosing size, placement, alignment, spacing or containers. Group related information; separate distinct topics. Make the primary action easy to find without amplifying every action. A dense operational tool and a reading page need different rhythms.

For layout, define a clear reading order, consistent alignment and a small spacing scale; test real narrow and wide content. For simplify, remove repeated labels, nested decoration and unnecessary decisions while preserving essential information and discoverability. For bolder, strengthen one meaningful focal point through scale, contrast, composition or imagery. For quieter, reduce competing emphasis and ornament without erasing hierarchy or brand. Do not default every section to a card or every hero to a centered headline plus badges.

## Typeset real content
<!-- keelson: id=frontend-visual.typography | without: Demo headings look polished while body copy and multilingual data fail | sunset: never -->

Reuse project fonts and define a limited set of roles for headings, body, labels, supporting text and data. Tune size, weight, line height and line length together. Do not create hierarchy by enlarging all text. Use font weights that actually exist; choose a fallback that keeps content readable while assets load.

Check long headings, expanded button labels, mixed scripts, numeric columns, missing glyphs and font loading shifts. Match numeric alignment to the task. Essential content must remain understandable; truncation needs a usable route to full content. Avoid hard-coded heights that clip text at zoom. Load only needed font assets and respect the project's delivery constraints.

## Give color and imagery a role
<!-- keelson: id=frontend-visual.color | without: Decoration undermines readability, state recognition and product truth | sunset: never -->

Use semantic tokens for text, surfaces, borders, interaction, status and accent. Test actual foreground/background combinations including interactive states; color cannot be the only signal for error, success or selection. Respect existing brand colors while correcting inaccessible combinations. Test other themes only when supported or requested.

Choose imagery that explains product or content. Inspect crop, focal point, aspect ratio, sharpness, missing assets and loading layout. Decorative images should not add redundant speech; informative images need an equivalent accessible description. Reuse licensed project assets or generate new ones when appropriate and supported. Never invent customers, certifications, reviews or product outcomes to fill a layout.

## Use motion and delight with purpose
<!-- keelson: id=frontend-visual.motion | without: Animation delays actions and reduced motion removes essential feedback | sunset: never -->

Name what each animation explains: feedback, spatial continuity, progress or a meaningful state transition. Keep it interruptible and responsive to rapid repeated input. Prefer compositor-friendly changes when they fit the effect; do not animate every property by default. Avoid layout jumps, delayed access to essential content and effects that block the primary task.

Test reduced-motion preferences, cancellation, rapid toggling and entrance/exit paths. Reduced motion must still communicate result and error. For delight, add one context-appropriate detail that rewards real progress; avoid fake progress, surprise sound, forced celebration or distracting loops. Expressive effects must survive low-end conditions and preserve controls and reading order.
