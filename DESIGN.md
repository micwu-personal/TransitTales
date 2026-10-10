# Transit Tales — design record

## Collection concourse: choose a place, not a tile

The root entry extends the coastal world into an original side-view, dimensional station cutaway. A sunlit glass-canopy atrium and coral metro carriage occupy one connected illustration, rather than separate game thumbnails. Deep green ink, seafoam surroundings, ivory floors, planted landings and restrained operational colors inherit the metro identity. This is an authored SVG scene, not an interactive 3D map.

The invitation leads directly to two labeled departures beside the architecture: upward to the escalator puzzle and downward to metro dispatch. Each explains the actual play loop and offers one full-width action. The artwork itself is decorative, with a localized text equivalent; no essential action relies on deciphering a picture or color. On phones the scene precedes the same two departures in normal document order, without horizontal page overflow. Future concepts and the preserved localized construction studio sit below a quiet divider and are explicitly distinguished from playable transit adventures. Shared language preference, native links, visible keyboard focus and reduced-motion behavior keep the collection straightforward.

## Escalator Orchestra: build a journey, hear it arrive

A sunlit, side-view mall extends the collection's ivory floors, green ink, seafoam daylight and planted landings. Four dimensional floor plates, shop windows, canopy rafters, suspended lamps and planted edges frame a seven-column route-building field. Original SVG escalators, bridges and elevators are distinct silhouettes; destination signs use icons plus English/Chinese/Japanese names. The interface is a quiet construction desk beside the mall, not a timer-driven arcade dashboard.

Choose a tool, then two labeled landings. Selection rings, travel arrows, route checkmarks and dotted previews make construction visible before shoppers depart. An untimed planning phase separates editing from short observable passenger waves. Arrival notes and optional synthesized tones reward routes without making sound essential. Eight puzzles introduce direction, branching, step-free access, courtyard clearance and balloon headroom. Failed waves invite another route rather than punish the player.

Desktop pairs the large cutaway with the tool desk; phone layout places controls below a horizontally swipeable, minimum-width mall. Native buttons/selects, keyboard-operable SVG landing/piece nodes, retained focus, live feedback, translated labels and reduced-motion animation provide alternatives to pointer-only construction. Shared language preference updates text without clearing routes or restarting waves. The root collection link remains visible.

The pure model owns placement, graph traversal, history and deterministic wave/scoring rules. Detached, deeply frozen snapshots cross into the mount/render/dispose renderer contract; display-only moving steps cannot change routes. Richer 2D/Canvas/WebGL renderers can replace SVG without altering the puzzle rules, but none are currently shipped. The mall is a dimensional vector illustration, not true 3D or a physics-based escalator. Floors are visual architecture, not implicit walkable connections: only placed pieces join landings.

## Rush Hour Rescue: a little city worth looking after

**Product thesis:** Make care visible. Select a waiting crowd, send a relief train, and watch it cross a miniature coastal city. The city is the experience, not decoration behind a dashboard. The game title is **Transit Tales**; its intended project identity is **TransitTales**.

**Audience and use:** Children and curious casual players on desktop, keyboard, or touch. Start a short shift, find a busy station, dispatch, and notice the consequences. English, Simplified Chinese and Japanese have equal standing; switching languages never restarts a shift.

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

## Metro interiors: stay with the journey
A nonmodal cutaway below the city keeps dispatch available while opening a platform or carriage. Pale-green structure, ivory floors, seafoam windows, operational coral/blue trim and an overhead destination sign extend the coastal world. Small original passenger figures use live IDs/counts, bounded to 24 with an explicit remaining count. A readable broadcast rail pairs captions with play/retry, mute and status. Mobile stacks scene and broadcast without horizontal page overflow. Keyboard station/train activation, focus restoration and Escape support exploration without trapping focus.

Real-service captions are kept separate from a clearly labeled broadcast studio for hypothetical non-stopping-service and sample notices. Recorded full sentences retain one voice per language across devices; captions and failure states never disappear when audio is unavailable. Snapshot and playback seams leave room for richer renderers and refined recordings without modifying dispatch simulation.


Mongolian adaptation: `mn-Cyrl-MN` and `mn-Mong-CN` join English, Simplified Chinese and Japanese across playable surfaces. Traditional Mongolian uses the bundled OFL Noto Sans Mongolian font and vertical prose/labels while preserving gameplay geometry. Native translation and physical-device review remain required; both Mongolian scripts share a clearly labelled Mongolia Mongolian recorded voice.
