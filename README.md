# Transit Tales

**Transit Tales** is the game title; **TransitTales** is the project identity for this collection of playful transit adventures. The local project folder remains **`D:\my_projects\Lego`**, and the Copilot app’s existing **Lego** registration is retained intentionally. The npm package is named **`transit-tales`** to follow npm’s lowercase naming rules. The GitHub repository is [micwu-personal/TransitTales](https://github.com/micwu-personal/TransitTales). The collection opens in a English / Chinese / Japanese transit concourse connecting **Rush Hour Rescue / 地铁调度室** and **Escalator Orchestra / 扶梯拼拼乐**, alongside the preserved original **Build a World** experiment.

Build a World is an original, browser-first 3D building game for children. Make miniature worlds from clay-like shapes, then watch each world respond to what you built. Built with TypeScript, Babylon.js, and Vite. No account, downloads, or external game assets are needed; creations are saved in this browser.

## Run

Requires Node.js 20.19+ or 22.12+.

```sh
npm install
npm run dev
```

Open the local address Vite prints (normally `http://localhost:5173`). `npm run build` makes a production site in `dist/`; `npm run preview` serves that build. `npm run test` runs the building, transit, localization, and renderer-adapter tests. The original building game requires WebGL; Rush Hour Rescue uses SVG and does not require WebGL.

## Collection entry

Open `/` to choose a journey in an original illustrated transit concourse. Enter the escalator atrium or metro platform using the labeled play links. The eight future concepts are linked separately and are not presented as playable games. English / 简体中文 / 日本語 is shared across the hub and transit games through the same locally saved language preference. The localized 3D building experiment remains available at `/build-world.html`.

## Escalator Orchestra / 扶梯拼拼乐

Open `/escalator.html`, or choose the atrium departure from the collection. Eight handcrafted puzzles progress from a two-piece café route to branching journeys, wheelchair access, courtyard detours, and balloon headroom. Planning has no timer: choose a short/long escalator, bridge, or elevator, then tap its start and end landings. Each arrow points from the first landing toward the second. Matching endpoints connect; floor lines alone are not walkable routes. Destination symbols and text supplement color.

Select a placed piece to reverse its direction, mirror an escalator, or delete it. Undo, reset, and puzzle-specific hints make experimentation easy. Connected goals show checkmarks and dotted route previews. **Play shoppers** launches a short deterministic wave; pause/resume, return to editing, or replay freely. All shoppers arriving earns two or three stars; using no more pieces than the authored solution earns three. Different destinations arriving together add combo points. Scores and stars are saved per puzzle in this browser only; every puzzle is available without unlocking.

Wheelchair shoppers can only use elevators and bridges. Solid courtyards block construction; striped low-clearance regions block balloon routes. Escalator stairs animate for presentation only. Sound is optional and starts only after selecting the sound button; arrivals also show musical notes without audio. English / 简体中文 / 日本語 switches immediately, preserving the board and wave. The shared language key is `transit-tales-language`; this game's selector is `#escalator-language`. Keyboard players can Tab to tools/landings/pieces and activate with Enter or Space; from outside native controls, Space pauses/resumes, R reverses, M mirrors, Delete removes, and Escape cancels an unfinished placement. Phones can swipe the contained mall horizontally while controls stay readable below.

`src/escalator/model.ts` owns pure placement geometry, directed routes, history, waves, and scoring; `puzzles.ts` owns puzzle data and verified solutions. `view.ts` creates detached, deeply frozen presentation snapshots. `renderer.ts` implements a replaceable `mount/render/dispose` SVG renderer; `main.ts` handles browser controls, language, scheduling and optional WebAudio, while `storage.ts` validates local best scores. This is an original dimensional SVG mall, not full 3D, falling-block Tetris, or a physical crowd simulator. There is no cross-game progress system or real-city data importer yet. `tests/escalator.test.ts` verifies all eight solutions, direction/accessibility, geometric rules, undo/transformations, deterministic waves, snapshot isolation, and safe persistence.

## Build a World

Choose **Skyline Rescue**, **Wonder Park**, **Pocket Solar System**, **Story Parade**, or **Creative Studio**. Choose a shape in the workbench, then tap/click the stage to place it. You can also drag a shape onto the stage with a mouse. Drag on the stage to look around; scroll or pinch to zoom. Tap/click an existing piece while at Level 1 to select it. Change its color, rotate it, or remove it. Use **+** and **−** to place at different levels; lower back to Level 1 to select again. The mission card shows what to try next. **Test my world** brings the scene to life and gives a hint if it needs more work.

**Keys:** R rotate; Delete/Backspace remove the selected piece; Ctrl/⌘+Z undo; Ctrl/⌘+Shift+Z or Ctrl+Y redo; Escape close a panel or deselect.

Changes are automatically recovered per world. **Save** creates a separate snapshot for the current world; **Load** returns to that snapshot. **Clear** asks before emptying the current world and can be undone. Browser storage is local to this browser/profile and can be lost if site data is cleared; it does not sync or export files.

## Rush Hour Rescue prototype

Open `http://localhost:5173/rush-hour.html` after `npm run dev`. This is a separate, original metro dispatch game; select the Transit Tales brand to return to the collection. The building game remains at `/build-world.html`. Start a shift, select a station on the map, and send a spare train to help its queue. Platform helpers speed up boarding; trains stopped at Central can hold their doors for a connection. Use pause and 1×/2×/3× speed freely. Three short scenarios have replayable goals and local best scores. Space pauses; keys 1–3 select speed. On touch screens the dispatch desk sits below the map. The coastal city can be swiped horizontally on narrow screens, keeping station labels and touch targets readable.

Choose **English**, **简体中文**, **日本語**, **Монгол (Кирилл)** (`mn-Cyrl-MN`), or **ᠮᠣᠩᠭᠣᠯ** (`mn-Mong-CN`) from the visible language selector. All prototype text, station names, notices, controls, results, and accessible labels switch immediately without restarting or pausing a shift. The selection is saved locally under `transit-tales-language`; without a valid saved preference, the first supported browser language preference selects a supported locale (including Chinese regional and Mongolian script preferences); unsupported languages fall back to English. Blocked browser storage does not prevent switching or playing. The building game shares the same language preference; the archived concept gallery retains its original concept descriptions.

All eight transit/elevator concept designs and original SVG illustrations are preserved at `/transit-concepts/`. They remain separate ideas that can later share systems or become connected small games.

`src/rush/locale.ts` supplies typed five-locale dictionaries, substitutions, scenario content, and safe language preferences. The simulation emits language-neutral notice descriptors so existing notices can be translated when switching. `src/rush/model.ts` contains the seeded, fixed-step simulation independently of the UI; `src/rush/main.ts` handles controls, storage and frame scheduling; `style.css` defines the city-led dispatch shell. Network data is separate from scenario rules for future city packs. This prototype uses a fictional ten-station network, aggregate queues, two lines, fixed travel times, and simplified station/segment occupancy. It is not a professional operations simulator, a real-city importer, or live journey advice. Platform waiting contributes to the score; riders waiting over 100 simulated seconds choose another way home. Spare trains refill every 28 seconds up to three. Goals award up to three stars, but shifts never end early in a punitive failure. Best scores are local and do not sync.

### City presentation and renderer seam

The prototype now presents Little Bay as an original **2.5D SVG coastal diorama**: dimensional buildings, planted parks, streets, harbor, river crossing, depth-bearing rails, station platforms and animated three-car trains. It is **not actual full 3D**: no orbit camera, free rotation, terrain mesh, zoom controls or physically simulated train cars are included.

- `src/rush/view.ts` adapts the simulation into readonly, deeply frozen and detached snapshots. Stations and trains use normalized presentation coordinates, and trains include stable segment endpoints, bounded progress and heading. Fractional time is a display-only interpolation, disabled when paused, ready, finished or under reduced motion.
- `src/rush/city.ts` owns the coastal scenery and an independently remappable station layout. The adapter never reads the simulation station `x/y` coordinates. Unknown IDs receive a neutral circular fallback; this is an adapter capability, **not an arbitrary-city gameplay feature**.
- `src/rush/renderer.ts` exposes `CityRenderer` with `mount(host, onSelect, onTrainSelect?)`, `render(snapshot)` and `dispose()`, plus the shipped SVG implementation. The renderer only consumes a snapshot and reports station and train selections; it cannot mutate the simulation. Lifecycle cleanup removes listeners and SVG nodes. Main suspends animation on page exit and remounts on browser back/forward-cache restoration.
- Future Canvas, WebGL or Babylon implementations can replace the SVG factory behind that contract. **None are implemented yet**, and the fixed Little Bay scenery still needs replacement/remapping for another city. No arbitrary-city importer, city pack selector, real-world geography or automatic scene generator is included.

The minimum-width city viewport scrolls horizontally below 680px rather than shrinking labels beyond usefulness; all dispatch actions remain below it. Language selector QA hook: `#language` (`en` / `zh-CN` / `ja` / `mn-Cyrl-MN` / `mn-Mong-CN`), storage key `transit-tales-language`; renderer SVG: `#map`, contained in `#city-map`.

`npm test -- tests/rush.test.ts` validates routes, dispatch actions, cooldowns, boarding, connections, complete scenarios, and passenger conservation. `tests/rush-locale.test.ts` covers language completeness, substitutions, safe preferences and state-preserving switching. `tests/rush-view.test.ts` covers snapshot immutability, bounded interpolation, frozen states, network independence and multilingual geometry preservation. `npm run build` includes the collection hub, both transit games, the preserved construction page, and the concept gallery.

## Structure and limits

`src/model.ts` contains portable building rules, missions, validation and history; `src/world.ts` contains Babylon rendering and animation; `src/main.ts` handles the browser UI and localStorage. The web platform boundary leaves room for a future Tauri or mobile shell without including one now. Art is procedural and original; the app uses system fonts plus a locally bundled traditional Mongolian font and can run locally when its files are served from a local server. The full Babylon rendering bundle remains roughly 1.2 MB before compression (about 290 KB compressed); Vite warns about the chunk size, and the recorded metro announcements are bundled with the site rather than fetched from a voice service during gameplay.

### Step inside and hear the city

Click or keyboard-activate a station or train to open an original side-view station/carriage cutaway below the city. Dispatch continues while inspecting; pause the shift to linger. Figures reflect actual platform/train passengers (up to 24 drawn, with the remainder counted), not a separate crowd simulation. Central lets you choose either line. Back to the city or Escape closes the view and returns focus.

The broadcast panel provides localized captions, playback status, replay/retry and a persistent mute control. Opening a view starts a recording from the click gesture; relevant changes during a running journey update the broadcast. Browser autoplay restrictions may require tapping Play again. The broadcast studio explicitly labels non-stopping service and other sample scenarios as previews; it does not introduce express services or emergency simulation.

`interior.ts` creates detached frozen interior snapshots and original SVG scenes; `inspector.ts` owns interaction and localized controls. `announcements.ts` separates typed scenario descriptors, localized scripts and recording lookup from `audio.ts` playback lifecycle. Full-sentence English, Mandarin, Japanese and Mongolia Mongolian MP3 recordings ship under `public/audio/transit/`, so voice quality does not depend on installed OS speech voices. Extending or refining broadcasts means adding scripts/contexts and replacing or regenerating assets, not changing simulation rules.

MP3/HTMLAudio is supported by contemporary Windows/macOS/iOS/iPadOS/Android browsers; captions and explicit playback recovery remain available when sound is blocked, a file is unavailable, or a device is silent. This is cross-platform implementation, not certification of every browser/device, nor a guarantee against OS mute, device policy, or network failures. Offline use requires the deployed site and recordings to be available locally; no service-worker offline cache or packaged native app is included.

Recording maintenance: `python scripts\generate-announcements.py` verifies/reuses unchanged assets and regenerates changed scripts; `--force` replaces all recordings. Generation requires edge-tts and ffprobe and sends only the original announcement text to the speech service. The checked-in assets need neither tool nor the voice service at runtime. `manifest.json` records each sentence, voice, byte length and verified duration. The catalog includes 216 verified recordings: 54 each for English, Mandarin, Japanese and Mongolia Mongolian. Both written Mongolian locales share the Mongolia recordings; manifest metadata distinguishes captions from spoken text.

Baseline validation for metro interiors before Mongolian additions: all 81 automated tests and the TypeScript/Vite production build pass. Windows Edge checks cover actual MP3 playback, station/train views, line selection, preview captions, mute, language switching, shift controls, and desktop/mobile-sized layouts (1440px / 390px) in all three languages with no page overflow or runtime errors. Physical Apple/Android devices remain untested.


## Mongolian scripts

Both Cyrillic Mongolian (Mongolia) and traditional Mongolian (Inner Mongolia) are available across the collection and playable games. Script-qualified preferences are shared and saved locally. Traditional text uses vertical left-to-right columns in prose and labels while game geometry and numerals remain unchanged. Noto Sans Mongolian is bundled under the SIL Open Font License; its license is in `public/fonts/`. Native form controls use platform rendering and may display their menu labels horizontally.

Five-locale validation: all 93 automated tests pass, including with the Pages base path; the TypeScript/Vite production build passes. Windows Edge checks cover all four playable pages in both Mongolian scripts at desktop/mobile sizes, loaded traditional font, no document overflow, and recorded announcement playback. The production `/TransitTales/` path was checked for all pages, gallery, scripts, styles, font and MP3 access.

The Mongolian translations are drafts and need native-speaker linguistic review. Both scripts use the same Mongolia Mongolian recorded voice, explicitly labelled in the broadcast panel; there is no dedicated Inner Mongolian accent recording. Traditional captions are independently localized, not claims that a traditional-script voice was synthesized. Physical mobile devices still require testing.

## Publish on GitHub Pages

The prepared workflow `.github/workflows/pages.yml` builds and tests the site, uploads `dist`, and deploys on **manual dispatch only**. No site is published merely by pushing this code. The repository remains private.

1. In `micwu-personal/TransitTales`, open **Settings → Pages**. Private-repository Pages requires an eligible paid GitHub plan; GitHub Free supports public repositories. If unavailable, choose an eligible plan or explicitly decide whether to make the repository public. This project does not change visibility automatically.
2. Set **Build and deployment → Source → GitHub Actions**. Review that a published project site is ordinarily publicly accessible even if its source repository is private; do not publish secrets or private material.
3. Open **Actions → Publish Transit Tales → Run workflow**, choose `main`, and run it. Wait for both build and deployment to succeed.
4. Open **https://micwu-personal.github.io/TransitTales/**. The Actions build uses `/TransitTales/` as Vite's base so scripts, fonts, recordings and links resolve below the project URL. Normal local development retains `/`.

For automatic updates, add a `push` trigger limited to `main` after opting into publishing. To host at the account root instead, use a separate repository named `micwu-personal.github.io` and adjust the build base to `/`.

References: [Pages plan availability](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site) · [custom Actions deployment](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).
