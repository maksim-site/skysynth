# Prototype Instructions

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

Build app UI in `src/`. Keep `.openai/hosting.json`, `worker/index.js`, `scripts/prepare-sites-build.mjs`, and `tests/sites-worker.test.mjs` intact so the same local prototype can be handed to Sites. Before a Sites handoff, run `npm run build` and `npm run test:sites`; the build must leave `dist/client/index.html`, `dist/server/index.js`, and `dist/.openai/hosting.json`.

## Project design lock

- Selected visual target: `/Users/makaroshckamail.ru/Downloads/claude/скс/.design-director/assets/concepts/style/02-carbon-champagne.png`.
- Use `02 Carbon / Champagne` as the default theme.
- Implement `01 Light Laboratory` as a complete alternate theme behind the compact header icon; preserve the same layout, content, and component grammar.
- Current release is static: no video, 3D, parallax, scroll choreography, entrance animation, or object rotation.
- Never stretch or fill-crop electronics. Keep the complete identity-critical board inside a `contain` treatment with deliberate breathing room.
- The hero, all three development cards, and process evidence use AI-generated concept renders based on supplied company boards and photographs. Every visible concept image has a paired Carbon / Champagne and Light Laboratory asset selected by the theme control.
- Label every concept image explicitly as `Концептуальная визуализация` and replace it with a client-approved render from real 3D files or a controlled product-photo set when available.
