# Prototype Instructions

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

Build app UI in `src/`. Keep `.openai/hosting.json`, `worker/index.js`, `scripts/prepare-sites-build.mjs`, and `tests/sites-worker.test.mjs` intact so the same local prototype can be handed to Sites. Before a Sites handoff, run `npm run build` and `npm run test:sites`; the build must leave `dist/client/index.html`, `dist/server/index.js`, and `dist/.openai/hosting.json`.

## Project design lock

- Visual direction: variant **C «Стенд»**, chosen 18.08.2026 from the preview set in `скс/previews`. Structure stays variant 1 (герой, услуги, реверс, разработки, процесс, заявка).
- Dark is the default theme; light is a complete alternate behind the header icon with the same layout and component grammar.
- Type: `Unbounded` (300/400/500) for display, `Golos Text` (400/500/600) for body. Both are self-hosted in `public/assets/fonts` with cyrillic + latin subsets. Do not add a webfont CDN.
- Palette: `--bg #08090a`, `--deep #13171c`, `--fg #f0ece4`, gold `#c9a227` / `#e0c877`, hairline borders only.
- No frosted glass, no backdrop blur, no ambient gradient wash behind sections, no decorative accent rules that animate. The client rejected all of these.
- The header is a floating capsule centred at the top, `position: fixed`. Section `scroll-margin-top` must clear it.
- Services are a numbered list, not cards: round icon, number, title, then text with small tags. The lead service block is not boxed. Tags may only restate what the service text already says, never add a new claim.
- `Разработки` is a two-column block: capsule chips with round board thumbnails on the left (same shape language as the header capsule), the 3D stage on the right, the description under both.
- The hero copy is capped to `min(52%, 660px)` and the composite stage is nudged right on wide screens so text never overlaps the board. `.hero-copy` is `pointer-events: none` with `pointer-events: auto` on its children, so the board stays clickable next to the text.
- The hero veil is two gradients: a horizontal one that holds the copy column and a vertical one that seats the scene. Both have a light-theme counterpart.
- Never stretch or fill-crop electronics. Keep the complete board inside a `contain` treatment with breathing room.
- AI laboratory imagery may be used only as a non-evidence backdrop. Boards shown on top of it must remain the client's exact 3D/CAD renders and stay fully visible.
- Do not add real production photos back; the client rejected them for this site.
- Motion stays restrained: hero copy entrance, one-shot reveal on scroll, hero board lift into 3D, board cross-fade, and the process trace drawing itself once. Everything respects `prefers-reduced-motion`.
- «Процесс» is a scroll-led sequence (`src/ProcessFlow.jsx`), not a click selector. All five stages are readable in order; a sticky laboratory stage changes automatically as each stage crosses the viewport. On phones every stage carries its own contained visual.
- Any `<img>` sized by `aspect-ratio` also needs `height: auto`: the HTML `height` attribute is a presentational hint and otherwise wins.
- Section backgrounds alternate `--bg` / `--deep` and each section carries its own soft radial light via `::before`, with a fading hairline divider in `::after`. This exists because the client said the page read as one flat black mass.
- `--bg` and `--deep` must stay visibly different: the sections alternate between them, and when the two were nearly identical the whole page read as one black mass.
- Ground all visible copy in `скс.docx`, and prefer the client's own wording over a paraphrase. The hero description is their company description, trimmed. Do not add clients, figures, specifications, certifications or capabilities that are absent from the supplied material.
- Keep visible Russian copy plain and natural. Avoid promotional filler and em dashes.
- The intake form is intentionally simple: name, company, phone/email and a short message. Do not add a technical-brief upload; the client asked for briefs and files by email.

## Client answers, 17.08.2026

- Boards are examples of competence, not products for sale. Say so on the page.
- Main service: разработка программно-аппаратных комплексов. Additional service: реверс-инжиниринг. The page hierarchy must reflect that split.
- All boards and 3D models may be shown, except the `AKYMA RX 433 mHz` receiver (client: "убрать акума"). It is excluded from `boards` in `src/App.jsx` and must stay out.
- Enquiries go to `info@skysinth.com`. Technical briefs and files go to the same address by email.
- Logo received: `public/brand/` holds the final SKS wordmark, S mark and full favicon set. Header and footer both use the full theme-matched wordmark, not the single-letter mark, and `index.html` links the whole favicon set.

## Implementation notes

- The board in `Разработки` is live 3D by default. It mounts once the gallery is within 400 px of the viewport, so the three.js chunk still stays off the first paint.
- `OrbitControls` runs with `enableZoom={false}` so the wheel scrolls the page instead of zooming the board. Keep `overflow: clip` (never `hidden`) on `.board-stage` and `touch-action: auto` on the canvas: both would otherwise swallow the wheel.
- The still render is hidden as soon as the model is ready, so the board never doubles up.
- In the hero, a short click on the 3D board (moved under 6 px, held under 400 ms) returns it to the still render. Dragging to rotate must not close it. There is no close button any more; the gesture hint states both actions.
- Switching boards calls `controls.reset()` in `BoardScene`, so every board opens from the same angle no matter how the previous one was left. Do not remount the Canvas per board; that rebuilds the WebGL context.
- The board drifts slowly on its own (`autoRotate`) and stops completely while the pointer is over the stage: `BoardGallery` drives both `autoRotate` and `floating` from one `drifting` flag, mirrored to `data-drift` for debugging. Reduced motion disables the drift.
- `src/media.js` is deliberately free of three.js. `src/BoardCanvas.jsx` is the only lazy entry point into `@react-three/*`, so the 3D stack (about 285 kB gzipped) downloads on hover or click, not on first paint. Do not import `boardScene.jsx`, `Canvas` or `useGLTF` from `App.jsx`, `HeroBoardExperience.jsx` or `BoardGallery.jsx`.
- Surfaces are flat: `--bg` / `--deep` / `--raised` plus hairline `--line` borders. There is no panel component and no blur. The only soft light comes from the per-section `::before` gradients and `.stage-glow` behind the board.
- `FORM_ENDPOINT` is intentionally empty: the client will wire real sending when the site goes on a server. The form opens a prefilled email to `info@skysinth.com` meanwhile. A consent checkbox is required and links to `public/privacy.html`.
- The policy is called «Политика конфиденциальности» everywhere, matching the client's other sites. Do not rename it back to «Обработка персональных данных».
- The cookie bar offers a real choice, «Принять» / «Отклонить», stored in `localStorage` under `sks-cookie` as `accepted` / `declined`. The statistics counter only initialises after «Принять»; a single «Понятно» button was rejected on 20.08.2026.
- `METRIKA_ID` in `src/App.jsx` is empty, so no counter loads. Fill in the Yandex.Metrika number to switch it on; `useMetrika` handles the rest and the form reports a `form_sent` goal.
- Static pages live in `public/`: `privacy.html`, `404.html`, `robots.txt`, `sitemap.xml`. They carry their own copy of the font faces and a small stylesheet, so they do not depend on the app bundle. Canonical host in those files and in the JSON-LD is `https://skysinth.com`; change it everywhere if the domain differs.
- Smooth scrolling is deliberately off everywhere (CSS, logo click, board list). The client asked for instant jumps.
- No active-section highlight in the nav and no scroll progress bar: both were tried on 19.08.2026 and the client removed them.
- Anchor navigation scrolls smoothly (`scroll-behavior: smooth` on `html`, plus a smooth `scrollTo` on the logo). Plain jumping was rejected on 20.08.2026. Inertial/Lenis-style scrolling is still out.
- Reverse-engineering copy describes the standard scope of the work. Confirm the wording with the client before launch, since they only named the service.
- Visual feedback, 21.08.2026: do not use the phone snapshots from `public/assets/images/production/` as visible site photography. Use the clean theme-matched studio concept renders instead and label them as conceptual visualizations.
- Keep the header wordmark non-selectable and non-draggable. The hero board itself opens 3D; do not add a second invitation button. Use only a small explanatory note at the bottom of the stage.
- Services must use the full editorial width without a dead right edge. The process reads in sequence without a click selector and keeps every board fully visible. FAQ answers open and close with restrained motion. The light theme is a muted laboratory-grey alternate, not a bright ivory page.
- Visual feedback, later 21.08.2026: the light hero must be crisp rather than foggy; keep contrast in the laboratory backdrop and the board, and use a clear copper accent instead of muddy brown. Hero copy should read naturally and must not lead with the legal entity name.
- In `privacy.html`, the back action belongs on the left and the wordmark on the right. In `Разработки`, board changes should feel like a camera move across one laboratory stand while preserving exact, uncropped board renders.
- Visual feedback, later 21.08.2026: `Разработки` uses one short heading only. The live board sits over the sharp foreground octagonal stand; three matching positions follow a compact circular indexing path in the optically blurred background. The room stays fixed while stands/boards glide around the shallow arc; do not rotate the whole laboratory or build a visible giant turntable. Navigation uses clear standalone chevrons with no attached lines, and the bottom caption is reduced to the title and count so it does not cover the scene.
- The strip after FAQ is one continuous laboratory panorama with four identical cradles. Each cradle receives one exact client 3D model, front-facing and normalized; do not bake multiple boards into the photograph, tilt them randomly, add suspension cables, or combine several modules on one stand.
- The reverse-engineering photograph is a full-width scene behind the section, with the central fixture between the left description and right steps. Use strong edge shading for copy contrast and avoid presenting it as a separate framed card.
- The reverse fixture is deliberately much brighter than its room: a warm-neutral overhead inspection light isolates the PCB while the laboratory stays dark. The overhead light and its pool stay completely static; never animate the beam, glow, or floor illumination, and never turn it into a visible blue beam, neon effect, or game-like animation.
- For reverse engineering, use one existing complete scene as the background. Do not cut a lamp from another image, overlay a separate fixture, or generate a replacement scene. The accepted source is `exec-1321f294-cf35-40d1-a042-0c07e7c5eef7.png`; `exec-8db31dcf-8a9f-4237-9c7b-01ec033c06bf.png` is rejected because its lamp is oversized. Do not add a visible paper texture; preserve only the source photograph's own fine material detail.
- The contact panorama uses the complete `contact-panorama-boards-final.png` scene. Shift the photograph upward enough to keep the cradle bases visible, and fade it softly from the FAQ background into the contact-section background without a hard border.
- Final transition direction, 21.08.2026: keep the contact panorama compact above the boards, start the upper fade inside the empty laboratory area, and dissolve the lower table directly into the contact section's neutral dark grey. Do not introduce a blue band, a white hairline, or a radial glow from the form on the right.
- In `Разработки`, the laboratory photograph must begin at the section boundary with the heading inside the scene, not below a separate dark slab. Carousel motion is built from independent exact board renders and genuine-alpha turntable layers moving together at a constant camera scale; never stretch, morph, or bake the boards into generated video. Reject any asset whose checkerboard is baked into RGB pixels.
- Boundary feedback, later 21.08.2026: Process must flow into FAQ without doubled rules or a large empty slab. Reverse engineering must dissolve into `Разработки` through one shared near-black photographic overlap, never through a visible band. Light-theme scene variants must preserve the accepted boards, fixtures, framing and geometry exactly; only the room lighting and neutral material palette may change.
- Light reverse scene feedback, later 21.08.2026: retain a local off-camera inspection-light pool on the PCB while the rest of the light laboratory recedes into a nearly invisible neutral-grey field. The light source itself must not be visible; never turn the whole room into an evenly exposed product photo.
- Light reverse fixture feedback, later 21.08.2026: in the light theme the mounting fixture behind the exact black PCB is matte white or light neutral. Keep the PCB itself black and unchanged; do not leave the fixture as a heavy black slab.
- Light panorama and gallery feedback, 22.08.2026: all PCB mounting cradles and indexing stands are matte white or light neutral in the light theme while the exact boards stay black. `Разработки` gets a dedicated complete light laboratory plate and must show the uncropped scene without the former translate-and-scale zoom; the live 3D board remains a separate freely rotatable layer.
- Gallery motion feedback, 22.08.2026: prototype the right-arrow transition in Blender before trying Seedance or another video model. Keep one locked camera and constant scale; all four stands exchange positions along the same shallow carousel path, and every exact GLB board stays rigidly attached to its own stand with no morphing, stretching or zoom.
- Gallery motion correction, later 22.08.2026: the Blender carousel prototype is rejected. Return to one central foreground stand and keep the board as the live, fully opaque, freely rotatable GLB. On either arrow, the current board exits vertically upward and the next board descends from above onto the same stand; no video replacement, multiple stands, lateral carousel, scene transparency, model deformation or loss of orbit controls. Keep the title and count visibly above the lower scene fade.

## Logo lab decisions

- Current client-comparison set: `59`, `01.4A`, `28`, `33`, `40`, `61`. Remove `01.3B` and `36` from the visible switcher.
- Show shortlisted marks directly on the Carbon / Champagne and Light Laboratory environments with no ivory preview card or baked checkerboard.
- Preserve each generated mark exactly; for the local comparison page, remove only its connected light canvas and keep the board, lettering, traces and contacts unchanged.
- Use a larger `contain` logo treatment in the upper-left brand lockup so horizontal and square marks remain readable.
- Keep the header mark fully inside the header boundary. Do not add CSS glow or drop-shadow to either the header mark or the large comparison specimen, and keep the specimen clear of the caption and switcher.
- The next focused wordmark is `59`: preserve both S letterforms from `56`, round the K stroke ends and inset copper route like `57`, but keep one continuous clean K junction like `58` with no touching-path gap.
- In the logo-lab switcher, replace `01` with `59`, remove `11`, and retain the other comparison candidates.
- Candidate `60` removed the two white-filled interior via dots from `36`, but its remaining horizontal gold bridges made the letters look connected and distorted the K; keep it only as a counted rejected attempt.
- Candidate `61` removes those horizontal bridges entirely, restores clean dark gaps between the letters, and uses a conventional standalone K while preserving the four large corner mounting holes and the rest of the PCB silhouette.
- Candidate `62` is the first graphite/copper light-background colorway of `59`, but it is rejected because the generator baked a checkerboard into the bitmap instead of returning alpha.
- Candidate `63` preserves the graphite/copper `62` wordmark and supplies genuine transparency. Use it automatically as the light-theme asset for visible candidate `59`; keep the champagne/copper `59` asset on the dark theme.
- Candidates `64–68` are champagne/copper palette studies for visible marks `01.4A`, `28`, `33`, `40`, and `61` respectively. Preserve their geometry and use these recolors as the default comparison palette.
- Keep a compact `Шампань / Жёлтый` control in the logo-lab switcher. Default to `Шампань`; `Жёлтый` restores the earlier assets for direct comparison. Candidate `59` keeps its own dark/light theme pair and is unchanged by this palette control.
- The raw palette-study canvases are passed through the existing neutral-backdrop removal before display so only the logo/board remains on the physical stage. Do not show checkerboards or ivory source fields in the logo-lab.
- In the logo-lab hero, keep the physical mounting plate centered inside the right-hand preview area and center every logo on that plate. Use the dedicated centered dark/light stage crops so neither the plate nor the logo drifts toward the right edge; verify both horizontal and square marks at desktop and mobile widths.
- The provisional client-facing set is `59`, `01.4A`, `28`, `33`, `40`, and cleaned `61`; this is still a comparison set, not a final approval.
