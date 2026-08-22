# Interaction blueprint

## Hero model behaviour

- Full-sphere rotation using arcball/quaternion interaction rather than a vertically clamped orbit.
- Zoom bounds fitted from each model's bounding box so switching boards never changes apparent scale unpredictably.
- A studio environment supplies 360-degree fill; large key, fill and rim sources create form without black faces.
- ACES tone mapping and calibrated exposure replace bloom-driven brightness.
- Contact shadow anchors the board even while it levitates.

## Ambient scene

- Precision induction/inspection base below the board, not a glowing sci-fi portal.
- 8–14 small particles with low opacity, slow drift and depth fade.
- Background may be an AI-generated 6–8 second locked-camera loop containing only subtle machinery/reflection movement. The real board remains WebGL.

## Poster-to-live handoff

- Generate the poster from the same GLB, camera and lighting rig used by the live viewer.
- Display the poster immediately; crossfade only after the model, environment and materials are ready.
- Preserve identical bounds, pose and perspective at the handoff.

## Supporting development rail

- Move the rail/stand in real time, not through a fixed video per click.
- Use spring-damped translation with one short mechanical settle.
- Lazy-load the next board while the current one is in view.

## Performance and fallbacks

- Load only the hero GLB at high priority; remaining boards load progressively.
- Cap DPR and expensive post-processing; use baked or contact shadows instead of multiple live shadow maps.
- Weak-device fallback: matched still render with drag/swipe frame sequence or a simplified viewer.
- Reduced motion: no idle float, particles or speed ramp; direct crossfade and full manual inspection remain.
