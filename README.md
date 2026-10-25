# Firefly Forest — Floating Sakura Island

A procedural Three.js night diorama: a sakura grove on a floating asteroid, surrounded by translucent water, stars, drifting mist and interactive fireflies.

[Live scene](https://agouti-ar.github.io/firefly-forest/)

## Scene

- Irregular faceted rock underside, downward shards, soil and moss shore.
- Tapered roots, dense trailing vines, ferns and an orbiting cloud of differently sized rock fragments.
- Cold moonlight, blue fill and a subtle underside rim light.
- HDR firefly and mushroom glow through UnrealBloomPass; OutputPass handles the final tone mapping.
- Translucent wind-driven water, two moving ripple scales and circular wakes. Desktop water also uses a one-time environment reflection capture; light highlights and waves remain animated.
- Two swimming koi, twenty floating leaves and ten open water-lily blooms (sixteen/eight on compact devices), and two breathing frogs that occasionally hop. Fish contact shadows stay directly beneath them.
- Optional Web Audio ambience uses CC0 field recordings of insects and frogs, a stream, and rare owl calls, with wind and splash effects synchronized with koi jumps. Recordings load only after enabling sound; synthesized ambience remains a fallback. The English Sound on/off control includes a volume slider, remembers volume, and supports touch screens. Audio starts off and pauses in background tabs. See AUDIO-CREDITS.md for sources.
- Airy ground mist disperses below the island edges. A cratered moon with dark maria and a soft halo completes an artistic phase cycle in 90 seconds and drifts around the sky in eight minutes. Its light direction and shadows follow its movement. A faint nebula adds depth.
- A 146-second firefly cycle opens with a luminous koi, then morphs through all twelve zodiac glyphs, eight seconds per sign, before dispersing. An additional twenty-second rest leaves the swarm in the grove between performances. Tree canopy and trunk colliders keep particles outside the trees, including during formation transitions.
- Procedural soil and bark grain, softly irregular textured sakura crowns and falling petals.
- A more detailed owl with patterned feathers, blinking and occasional wing stretches. It swivels toward the clearing and looks up during the firefly performance.
- Cinematic orbit with a gradual change in elevation.

## Controls

Drag to orbit, scroll/pinch to zoom. Fireflies gently avoid the mouse pointer over the island. Close-up inspection has gentle camera sway. After five seconds without camera interaction, the camera returns to the view saved before zooming over 3.5 seconds, then resumes its orbit (about 95 seconds per revolution). Mouse movement during inspection postpones the return. Reduced-motion preferences disable automatic camera motion and animal jumps.

The audio listener follows the camera at 20 Hz. Separate world-positioned forest and water zones, the owl's perch, and each fish splash use distance attenuation and stereo direction. Wind has a broader range than local pond sounds. The night field recording contains both insects and frogs; it is positioned as a mixed habitat recording, not separated into individual animals. While recordings load, only the wind bed plays; synthetic calls are used only if loading fails.

## Run locally

Use the project's **Live Preview** action in Codex, or double-click `start-preview.cmd` in Windows File Explorer. This starts a visible, long-lived terminal server on port 8080. Keep that terminal running; Ctrl+C or closing it stops the server. The launcher reuses an already-running preview. Python 3 must be available as `python`. Clicking a file link in chat opens its source code; it does not execute the launcher.

The desktop shortcut **Firefly Forest Preview** starts the launcher with `-OpenBrowser`: it opens the scene in your default browser and reuses a running server. When it starts a new server, leave the console open (it can be minimized). No repeated launch is needed after edits.

For a visible terminal server, use:

Requires Python 3 and an internet connection for the pinned Three.js CDN modules:

```sh
python -u preview_server.py
```

Open http://127.0.0.1:8080/ once. On localhost, the page checks its HTML and local scene/audio modules every two seconds and reloads the same tab when they change. GitHub Pages does not run the reload watcher.

## Rendering and performance

Three.js **0.160.0**, browser ES modules, no build step or external model assets.

| Setting | Desktop | Small screen / coarse pointer |
|---|---|---|
| Fireflies | 300 | 180 |
| Stars | 1400 | 800 |
| Petals | 100 | 55 |
| Hanging vines | 58 | 36 |
| Floating rocks | 23 | 14 |
| Shadow map | 2048² | 1024² |
| Pixel ratio cap | 1.75 | 1.25 |

Water normals update every second frame on desktop and every third frame on compact devices. After startup, a sustained average frame time above 34 ms triggers one resolution reduction. These are quality safeguards, not a measured FPS guarantee. Mobile appearance and performance still need device testing.

## Files

- `index.html`: scene, procedural models, materials, animation and local preview watcher.
- `ambient-audio.js`: opt-in recorded night ambience, synthesized fallback and synchronized pond sounds.
- `assets/audio/` and `AUDIO-CREDITS.md`: bundled CC0 recordings and attribution.
- `forest-details.js`: procedural textures, curved flower geometry, nebula and the phased moon.
- `swarm-patterns.js`: sampled vector silhouettes of twelve zodiac glyphs.
- `firefly-avoidance.js`: tree collision volumes, steering and particle projection.
- `README.md`: current scene and development instructions.
- `preview_server.py`: local server with disabled browser caching.
- `start-preview.cmd` / `start-preview.ps1`: terminal launchers.
