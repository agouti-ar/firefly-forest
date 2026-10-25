# Firefly Forest — Floating Sakura Island

A procedural Three.js night diorama: a sakura grove on a floating asteroid, surrounded by translucent water, stars, drifting mist and interactive fireflies.

[Live scene](https://agouti-ar.github.io/firefly-forest/)

## Scene

- Irregular faceted rock underside, downward shards, soil and moss shore.
- Tapered roots, dense trailing vines, ferns and an orbiting cloud of differently sized rock fragments.
- Cold moonlight, blue fill and a subtle underside rim light.
- HDR firefly and mushroom glow through UnrealBloomPass; OutputPass handles the final tone mapping.
- Translucent wind-driven water, two moving ripple scales and circular wakes. Desktop water also uses a one-time environment reflection capture; light highlights and waves remain animated.
- Two swimming koi with moving tails and occasional small jumps, ten floating leaves, four raised lotus flowers and two quietly breathing frogs. Fish contact shadows sit directly underneath them on the submerged bed.
- Optional quiet procedural Web Audio ambience: crickets, a soft rustle and rare frog calls. Toggle it with the lower-left sound button; audio starts off and pauses in background tabs.
- Every 64 seconds, part of the firefly swarm gathers into a pale luminous fish above the grove. Gathering begins around 12 seconds after loading, reaches its clearest shape around 19–25 seconds, and dissolves by 32 seconds.
- Independently swaying sakura crowns and slowly falling petals.
- A small procedural owl that turns its head and blinks on a branch.
- Cinematic orbit with a gradual change in elevation.

## Controls

Drag to orbit, scroll/pinch to zoom. Fireflies gently avoid the mouse pointer over the island. Camera automation pauses during interaction and for 12 seconds afterwards, then smoothly resumes from the current view. Reduced-motion preferences disable the automatic camera and reduce ambient movement.

## Run locally

Use the project's **Live Preview** action in Codex, or double-click `start-preview.cmd` in Windows File Explorer. This starts a visible, long-lived terminal server on port 8080. Keep that terminal running; Ctrl+C or closing it stops the server. The launcher reuses an already-running preview. Python 3 must be available as `python`. Clicking a file link in chat opens its source code; it does not execute the launcher.

The desktop shortcut **Firefly Forest Preview** starts the launcher with `-OpenBrowser`: it opens the scene in your default browser and reuses a running server. When it starts a new server, leave the console open (it can be minimized). No repeated launch is needed after edits.

For a visible terminal server, use:

Requires Python 3 and an internet connection for the pinned Three.js CDN modules:

```sh
python -u preview_server.py
```

Open http://127.0.0.1:8080/ once. On localhost, the page checks its HTML source every two seconds and reloads the same tab when the file changes. After adding this feature to an already open page, refresh that page once. GitHub Pages does not run the reload watcher.

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
- `night-audio.js`: opt-in synthesized night ambience with no audio downloads.
- `README.md`: current scene and development instructions.
- `preview_server.py`: local server with disabled browser caching.
- `start-preview.cmd` / `start-preview.ps1`: terminal launchers.
