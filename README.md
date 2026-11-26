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
- `src/roof.js`: the roof garden. `src/hidden.js`: the hidden lift. `src/gallery.js`: the As Is gallery on floor 2, and `src/cat.js` its black cat.
- `src/cliffs.js`: floor 3, the Updraft sea cliffs (tall grass, the river, the sea, gulls, the water that comes into the cab). Its paintings are in `images/cliffs/`.
- `src/js3.js`: audio, lift logic, controls, intro sequence and the frame loop.

## Generating 3D assets with Tripo

Claude Code sessions on this repo can generate models with [Tripo](https://developers.tripo3d.ai/en/mcp):

- `tools/tripo` runs the Tripo CLI (for example `tools/tripo make "mossy stone planter" --json`). In a Claude Code cloud session on the `air-trek` environment, the network proxy adds the Tripo API key, so no key is stored in the repo.
- `.mcp.json` registers Tripo's MCP server (`npx -y tripo-cli mcp`) for Claude Code sessions opened on this repo.
- On your own machine, run `npm i -g tripo-cli` and `tripo login` instead.

Generating uses Tripo API credits.
