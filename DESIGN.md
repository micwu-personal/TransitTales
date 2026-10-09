# Transit Tales — design record

## Rush Hour Rescue: a little city worth looking after

**Product thesis:** Make care visible. Select a waiting crowd, send a relief train, and watch it cross a miniature coastal city. The city is the experience, not decoration behind a dashboard. The game title is **Transit Tales**; its intended project identity is **TransitTales**.

**Audience and use:** Children and curious casual players on desktop, keyboard, or touch. Start a short shift, find a busy station, dispatch, and notice the consequences. English and Simplified Chinese have equal standing; switching languages never restarts a shift.

**Visual world:** A warm, original 2.5D coastal diorama under soft daylight. Seafoam water (`#a9cfca`), an ivory shell (`#f5f3eb`), planted pale-green land, ochre and slate roofs, and deep green ink (`#284d47`) establish a quiet city. Coral and blue retain their operational line meanings. Buildings have separate front walls, side walls, roofs, windows and offset ground shadows. The harbor, river crossing, park paths, stadium, museum and airport give each neighborhood a distinct place. All geometry is authored SVG; no stock images, imported sets or franchise marks.

**Hierarchy and composition:** A compact brand/navigation bar precedes a map-led field with a short invitation and four modest shift counters. The wide city shares the first viewport with a restrained, unboxed dispatch rail: scenario → start/pause and speed → mission → selected platform and relief actions → notice/help. A line legend and state hint sit below the city. Results appear below, leaving the city in view. No oversized hero, chunky paper borders, decorative stamps or nested cards.

**Typography and spacing:** System UI text with Segoe UI on Windows and native Chinese fallbacks; restrained 650-weight headings, plain readable supporting copy, and tabular counters. Large groups are separated by space or a fine hairline rather than heavy containers. Chinese headings use natural tracking and more line height. Buttons wrap rather than clip translated text.

**Signature behavior:** Three-car trains move continuously between simulation steps, follow the railway direction, and carry a small upright rider badge. A selected station uses a coral platform outline; high queues use warm queue badges, and helpers tint the platform green. Train interpolation stops during pause, ready/finished states or reduced-motion preference. These views do not change simulation time or rules.

**Responsive and inclusive behavior:** Desktop shows the city beside the dispatch rail. Tablet-width controls become a two-column workbench below it. Phones return to a single-column desk. The SVG retains a minimum width of 680px so station labels and hit areas do not become microscopic; the contained city can be swiped horizontally, with a bilingual hint. Keyboard focus brings offscreen stations into view through native overflow scrolling. Selectable stations have button roles, localized names, pressed state and Enter/Space activation. Form controls have 44px minimum heights, visible focus, and honest disabled explanations. Queues wrap; result controls wrap; the page itself must not overflow horizontally.

**Renderer boundary:** `view.ts` makes detached, deeply frozen renderer-neutral snapshots containing station identities/status, line stop identities/colors, and normalized train positions/segment progress. `city.ts` owns presentation coordinates and coastal scenery; it does not read simulation coordinates. `renderer.ts` implements `CityRenderer.mount(host, onSelect)`, `render(snapshot)` and `dispose()`. The SVG renderer owns its nodes/listeners and maps normalized positions to its projection. A future Canvas/WebGL/Babylon renderer can consume the same contract without changing simulation. Main owns gameplay, localization, pause/speed, storage and frame scheduling.

**Honest limits:** This is an SVG 2.5D illustration, not a full 3D city or freely orbitable camera. No alternative renderer, arbitrary-city UI/importer, dynamic scenery generator, zoom controls or real-world map data is implemented. The adapter can remap coordinates and accept different network data; the shipped scenery is still authored for one fictional ten-station city. Passenger queues and train cars are visual aggregates, not individual route agents in a physically modeled city. Browser visual and touch QA remains a separate validation step.

---

The original construction game remains unchanged. Its established visual documentation follows as a legacy record, not the direction for the transit prototype.

# Legacy: Build a World design record

**Product thesis:** A living miniature stage, not a menu of disconnected puzzles. Children choose a world, make it with their hands, and watch it answer.

**Audience and use:** Primary-school builders on desktop or touch screens. First-run invitation offers five doors; each themed stage gives a short goal and honest feedback. Creative Studio removes the goal entirely.

**Visual direction:** A sunlit tabletop theater with paper-card controls and softly modeled clay shapes. A blue drafting sky gives breathing room; warm cream cards, butter yellow calls to action, coral details, mint success states, and dark ink outlines keep controls legible. The camera, textured stages, little residents, orbit guides, and translucent placement preview make the building surface feel alive without relying on stock assets or familiar toy designs.

**Hierarchy:** World chooser → world mission → uninterrupted 3D stage → reachable shape/color/edit bench → undo/save utilities. The mission stays visible, while results occupy a small nonblocking card so the child can see reactions and continue building. Text labels accompany shapes and buttons; focus indicators, accessible names, live status feedback, and reduced-motion CSS support different input needs.

**Responsive behavior:** Desktop tools flank the stage; on narrow screens, the mission shrinks, utility actions become labeled-by-tooltip icons, and the bench becomes a horizontally scrolling shape tray plus compact color/edit groups. Touch gestures orbit and pinch-zoom the stage; shape selection followed by tap avoids requiring drag-and-drop on touch.

**Originality and portability:** Geometry and scenery are assembled from primitives at runtime. There are no branded characters, imported set designs, stock illustrations, or third-party audio. Portable rules and snapshot validation live separately from Babylon rendering and browser storage; no platform shell is bundled.
