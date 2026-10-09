# Transit Tales

**Transit Tales** is the game title; **TransitTales** is the project identity for this collection of playful transit adventures. The local project folder remains **`D:\my_projects\Lego`**, and the Copilot app’s existing **Lego** registration is retained intentionally. The npm package is named **`transit-tales`** to follow npm’s lowercase naming rules. The GitHub repository is [micwu-personal/TransitTales](https://github.com/micwu-personal/TransitTales). Its first playable transit prototype is **Rush Hour Rescue / 地铁调度室**, alongside the preserved original **Build a World** game.

Build a World is an original, browser-first 3D building game for children. Make miniature worlds from clay-like shapes, then watch each world respond to what you built. Built with TypeScript, Babylon.js, and Vite. No account, downloads, or external game assets are needed; creations are saved in this browser.

## Run

Requires Node.js 20.19+ or 22.12+.

```sh
npm install
npm run dev
```

Open the local address Vite prints (normally `http://localhost:5173`). `npm run build` makes a production site in `dist/`; `npm run preview` serves that build. `npm run test` runs the building, transit, localization, and renderer-adapter tests. The original building game requires WebGL; Rush Hour Rescue uses SVG and does not require WebGL.

## Play

Choose **Skyline Rescue**, **Wonder Park**, **Pocket Solar System**, **Story Parade**, or **Creative Studio**. Choose a shape in the workbench, then tap/click the stage to place it. You can also drag a shape onto the stage with a mouse. Drag on the stage to look around; scroll or pinch to zoom. Tap/click an existing piece while at Level 1 to select it. Change its color, rotate it, or remove it. Use **+** and **−** to place at different levels; lower back to Level 1 to select again. The mission card shows what to try next. **Test my world** brings the scene to life and gives a hint if it needs more work.

**Keys:** R rotate; Delete/Backspace remove the selected piece; Ctrl/⌘+Z undo; Ctrl/⌘+Shift+Z or Ctrl+Y redo; Escape close a panel or deselect.

Changes are automatically recovered per world. **Save** creates a separate snapshot for the current world; **Load** returns to that snapshot. **Clear** asks before emptying the current world and can be undone. Browser storage is local to this browser/profile and can be lost if site data is cleared; it does not sync or export files.

## Rush Hour Rescue prototype

Open `http://localhost:5173/rush-hour.html` after `npm run dev`. This is a separate, original metro dispatch game; the building game remains at `/`. Start a shift, select a station on the map, and send a spare train to help its queue. Platform helpers speed up boarding; trains stopped at Central can hold their doors for a connection. Use pause and 1×/2×/3× speed freely. Three short scenarios have replayable goals and local best scores. Space pauses; keys 1–3 select speed. On touch screens the dispatch desk sits below the map. The coastal city can be swiped horizontally on narrow screens, keeping station labels and touch targets readable.

Choose **English** or **简体中文** from the visible Language / 语言 selector. All prototype text, station names, notices, controls, results, and accessible labels switch immediately without restarting or pausing a shift. The selection is saved locally under `transit-tales-language`; without a valid saved preference, the first supported browser language preference selects English or Simplified Chinese (including other Chinese regional preferences); unsupported languages fall back to English. Blocked browser storage does not prevent switching or playing. The original building game and archived concept descriptions remain unchanged.

All eight transit/elevator concept designs and original SVG illustrations are preserved at `/transit-concepts/`. They remain separate ideas that can later share systems or become connected small games.

`src/rush/locale.ts` supplies typed English / Simplified Chinese dictionaries, substitutions, scenario content, and safe language preferences. The simulation emits language-neutral notice descriptors so existing notices can be translated when switching. `src/rush/model.ts` contains the seeded, fixed-step simulation independently of the UI; `src/rush/main.ts` handles controls, storage and frame scheduling; `style.css` defines the city-led dispatch shell. Network data is separate from scenario rules for future city packs. This prototype uses a fictional ten-station network, aggregate queues, two lines, fixed travel times, and simplified station/segment occupancy. It is not a professional operations simulator, a real-city importer, or live journey advice. Platform waiting contributes to the score; riders waiting over 100 simulated seconds choose another way home. Spare trains refill every 28 seconds up to three. Goals award up to three stars, but shifts never end early in a punitive failure. Best scores are local and do not sync.

### City presentation and renderer seam

The prototype now presents Little Bay as an original **2.5D SVG coastal diorama**: dimensional buildings, planted parks, streets, harbor, river crossing, depth-bearing rails, station platforms and animated three-car trains. It is **not actual full 3D**: no orbit camera, free rotation, terrain mesh, zoom controls or physically simulated train cars are included.

- `src/rush/view.ts` adapts the simulation into readonly, deeply frozen and detached snapshots. Stations and trains use normalized presentation coordinates, and trains include stable segment endpoints, bounded progress and heading. Fractional time is a display-only interpolation, disabled when paused, ready, finished or under reduced motion.
- `src/rush/city.ts` owns the coastal scenery and an independently remappable station layout. The adapter never reads the simulation station `x/y` coordinates. Unknown IDs receive a neutral circular fallback; this is an adapter capability, **not an arbitrary-city gameplay feature**.
- `src/rush/renderer.ts` exposes `CityRenderer` with `mount(host, onSelect)`, `render(snapshot)` and `dispose()`, plus the shipped SVG implementation. The renderer only consumes a snapshot and reports typed station selections; it cannot mutate the simulation. Lifecycle cleanup removes listeners and SVG nodes. Main suspends animation on page exit and remounts on browser back/forward-cache restoration.
- Future Canvas, WebGL or Babylon implementations can replace the SVG factory behind that contract. **None are implemented yet**, and the fixed Little Bay scenery still needs replacement/remapping for another city. No arbitrary-city importer, city pack selector, real-world geography or automatic scene generator is included.

The minimum-width city viewport scrolls horizontally below 680px rather than shrinking labels beyond usefulness; all dispatch actions remain below it. Language selector QA hook: `#language` (`en` / `zh-CN`), storage key `transit-tales-language`; renderer SVG: `#map`, contained in `#city-map`.

`npm test -- tests/rush.test.ts` validates routes, dispatch actions, cooldowns, boarding, connections, complete scenarios, and passenger conservation. `tests/rush-locale.test.ts` covers language completeness, substitutions, safe preferences and state-preserving switching. `tests/rush-view.test.ts` covers snapshot immutability, bounded interpolation, frozen states, network independence and bilingual geometry preservation. `npm run build` includes both game pages and the concept gallery.

## Structure and limits

`src/model.ts` contains portable building rules, missions, validation and history; `src/world.ts` contains Babylon rendering and animation; `src/main.ts` handles the browser UI and localStorage. The web platform boundary leaves room for a future Tauri or mobile shell without including one now. Art is procedural and original; the app uses system fonts and works without network access. The full Babylon rendering bundle remains roughly 1.2 MB before compression (about 290 KB compressed); Vite warns about the chunk size, but there are no external image or audio downloads.
