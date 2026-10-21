# Necromancer_game

A necromancer roguelike for the browser, in the spirit of Caves of Qud and Dwarf Fortress Adventure Mode, drawn in the Dread style. You raise the dead, fights are lethal, and a death is final.

## Layout

- `src/core/` the rules: map, creatures, combat, the turn clock, saving. No screen code and no `Math.random`, so a seed always plays out the same way.
- `src/core/gen/` level generation.
- `src/render/` the Dread renderer: map art, lighting, figures, effects. It listens to events from the rules and never changes them.
- `src/ui/` the interface around the map, input, windows, the title screen and storage.
- `src/bot/` a bot that plays by the same rules, for testing and balance.
- `src/sealed-stub/` stand-ins for the story texts. The real ones are kept out of this repository.
- `tools/build.mjs` bundles everything into one page, `dist/necromancer.html`.
- `tools/sim.mjs` runs headless checks: determinism, save round trips, and bot runs.
- `tools/browser-check.mjs` opens the built page in headless Chromium and plays it.

## Working on it

```
npm install
npm run build      # dist/necromancer.html
npm run sim        # determinism, saves, bots
npm run check      # build, then play it in a headless browser
```
