# As Is

A weathered, ivy-grown elevator in golden-hour light. Each floor is someone's project: ride up, step out onto the landing, and the project's link opens in a new tab.

Built with three.js 0.160 (loaded from jsDelivr). Everything else is procedural: materials are baked on the GPU at load, and the score and sound effects are synthesised with Web Audio.

## Adding projects

Edit the `PROJECTS` array at the top of `src/head.html` (one entry per floor), then run `./build.sh` to rebuild `index.html`.

```js
{ floor: 20, name: 'Kite Theory', author: 'Your Name', url: 'https://example.com', sticker: '🪁' }
```

The entries in the repo are placeholders.

## Files

- `index.html`: the built page, ready to publish or open.
- `src/head.html`: project list, styles and page markup.
- `src/js1.js`: renderer, post-processing (light shafts, SSAO, bloom, depth of field, grading, FXAA) and the material baker.
- `src/js2.js`: textures, geometry, ivy and the lobby, shaft, cab and landing.
- `src/js3.js`: audio, lift logic, controls, intro sequence and the frame loop.
