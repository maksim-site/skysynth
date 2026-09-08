# Main hero pendant

The selected wide pendant photo and its aligned ImageGen luminance matte are converted to WebP without changing their framing. The exact original photo remains in `../../../../../previews/hero-pendant-motion/pendant-photo.png` and the matte alongside it.

The frontend uses the matte once to isolate a small lamp bitmap and prepares two small lighting textures once. Only their transform and opacity animate. These files are background artwork, not evidence of real production. The client PCB stays a separate exact source image / interactive GLB.

## Rejected first white material, 2026-09-05

`pendant-white.webp` is a 268 × 254 crop at source coordinates (278, 0), generated with built-in ImageGen and compressed to 5 KB. It uses the same original silhouette matte and rig as the dark lamp. Both materials are decoded before the first-screen loader leaves; theme changes only switch their visibility, without restarting motion. The generated laboratory background is not used.

This first variant was rejected because applying the dark lamp's mask to a changed white contour produced visible cutout artefacts. It is retained only as history and is no longer referenced by the frontend.

Final edit prompt:

> Use case: precise-object-edit. Input image is the EDIT TARGET, an existing website photograph. Change ONLY the hanging pendant lampshade at upper left from black to matte warm-white painted metal. Keep the exact lamp silhouette, cap, perspective, size, position, thin dark suspension cord, and its thin warm luminous underside rim. Preserve dimensional soft grey shadows and subtle material texture on the white shade, not a flat white fill or blown-out glow. Every other pixel/compositional element must remain visually unchanged: dark laboratory, large black empty mounting panel on right, bench, bolts. Keep the original wide 1586:992 framing with no crop, zoom, tilt, repositioning, extra objects, text or watermark. The white shade is being extracted with the EXISTING silhouette mask, so edge geometry and placement must match the source exactly.

## Independent white pendant, 2026-09-06

The active `pendant-white-v2.webp` is a new standalone built-in ImageGen asset with its own genuine transparency, resized to 536 × 536 and compressed to 18 KB. The browser uses that alpha directly; no dark-lamp matte is applied. The accepted dark lamp is unchanged. Both assets are decoded before the loader exits and share the same pendulum animation. The compact rig has its own coordinate frame so it stays visible on mobile and tablets.

Final prompt:

> Use case: product-mockup. Create ONE standalone photorealistic matte white industrial pendant lamp on a genuinely transparent alpha background. The reference photograph is ONLY a shape/style reference for the small pendant on the upper left, not the edit target: do not reproduce any laboratory, board, panel or bench. A broad shallow white metal dome, a neat small white socket cap, one straight thin dark grey vertical cord, subtle warm ivory lit underside visible only as a narrow elliptical rim. Perfectly upright and symmetric, level lower rim, front view from almost rim height, clean smooth manufactured contours and convincing restrained grey shading on the white material. No chipped paint, grime, jagged cutout, black edge fringe, cast shadow, glow outside the object, floor, checkerboard drawn into RGB, props, text or watermark. Square 1024x1024 transparent canvas. Cord centered at x=512 extends exactly from top edge to socket at y=320. Dome extends approximately x=55..969 and y=440..915. Small transparent margin below the lower rim. Crisp high-quality anti-aliased transparency edges suitable for animating over a light-grey website.
