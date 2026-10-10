# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Primary school children playing on a browser with mouse, keyboard, or touch, including on smaller screens.

## Product Purpose
Transit Tales is the umbrella for original, encouraging transit adventures. The multilingual collection entry is a shared illustrated concourse, with clear departures for metro dispatch and escalator construction puzzles. Rush Hour Rescue lets players look after a fictional coastal city through small dispatch decisions. Escalator Orchestra / 扶梯拼拼乐 turns route construction into observable passenger journeys. English, Simplified Chinese and Japanese have equal standing across the collection and playable games.

Build original 3D miniature worlds, explore cause and effect through playful simulations, and keep creations for another day. Success means a child can place and change pieces unaided, then see the scene respond meaningfully.

## Positioning
A shared miniature transit world connects small, encouraging games about movement and care. Metro dispatch and escalator construction are distinct journeys, not disconnected marketing cards. The preserved construction experiment offers four creative prompts and an open studio.

## Operating Context
Browser-first, local play without accounts. The collection concourse leads to transit games, a clearly labeled future-concept gallery, or the localized construction studio. Future Windows, macOS, iOS, and Android packaging should share the game logic and browser surface. There is no implemented cross-game progress or real-city map import.

## Capabilities and Constraints
Escalator Orchestra has eight verified route-building puzzles, limited piece inventories, direction/mirroring controls, undo, previews, deterministic shopper waves, pause/edit/replay, wheelchair and balloon restrictions, optional synthesized arrival notes, and local per-puzzle scores. Planning is untimed and all levels are available. Its detached frozen snapshots feed a replaceable mount/render/dispose SVG mall renderer. It is not a falling-block game, full 3D simulation, or physical crowd simulator.

Rush Hour Rescue has three replayable scenarios, seeded fixed-step transit simulation, station relief controls, local best scores, language persistence, and a replaceable mount/render/dispose renderer contract. The shipped city is a 2.5D SVG diorama, not actual full 3D. No alternative renderer or arbitrary-city importer is implemented.

TypeScript, Babylon.js, Vite. Original procedural 3D art and shapes. Place, rotate, recolor, remove, undo/redo, camera movement, and local save/load. No platform-specific shell in this release. Local saves live in this browser only; no cloud synchronization.

## Brand Commitments
The collection title is Transit Tales, with intended project identity TransitTales and npm package transit-tales. The original construction game retains its in-game title Build a World. The folder name is not the game's brand. No third-party franchise marks, branded figures, or copied construction sets. Friendly, encouraging language without punitive failure.

## Evidence on Hand
Working building game, multilingual collection concourse and two transit games, original dimensional SVG city/mall artwork, and preserved eight-concept gallery. The integrated production build and regression tests are maintained. Browser checks completed all eight escalator solutions, invalid placement, undo, failed wave/edit recovery, pause, next-puzzle progression, state-preserving language switching, and EN/Chinese navigation/layout at 390px and 1440px. Art and interactions are authored for this project.

## Product Principles
- Let children make a visible change immediately.
- Turn each challenge into an observable, replayable consequence.
- Keep the controls consistent across all worlds.
- Keep building freeform even when a prompt has a success condition.

## Accessibility & Inclusion
Responsive interface with touch targets, labeled controls, keyboard access to the building tools, readable instructions, focus visibility, and reduced-motion support.

## Metro interiors and voice
Stations and trains open live, original SVG cutaways with actual passenger counts. Captioned English/Mandarin/Japanese recordings use bundled MP3 assets and explicit replay/mute/retry controls, independent of installed OS voices. Extensible announcement descriptors and audio lifecycle are separate from simulation. Non-stopping-service broadcasts are labeled studio previews, not actual express operations. Browser/device autoplay and mute policies still apply; no universal-device certification, native packaging or offline cache is claimed.


Mongolian adaptation: `mn-Cyrl-MN` and `mn-Mong-CN` join English, Simplified Chinese and Japanese across playable surfaces. Traditional Mongolian uses the bundled OFL Noto Sans Mongolian font and vertical prose/labels while preserving gameplay geometry. Native translation and physical-device review remain required; both Mongolian scripts share a clearly labelled Mongolia Mongolian recorded voice.
