# Firefly Forest — 3D Nocturnal Diorama

[![Three.js](https://img.shields.io/badge/Three.js-r160-black?logo=three.js)](https://threejs.org/)
[![WebGL](https://img.shields.io/badge/WebGL-2.0-800000?logo=webgl)](https://www.khronos.org/webgl/)
[![FPS](https://img.shields.io/badge/FPS-60%20Stable-00ffff)](#)
[![License: MIT](https://img.shields.io/badge/License-MIT-d4af37)](LICENSE)

A real-time, zero-dependency 3D nocturnal forest environment built with Three.js. The scene showcases an ancient oak centerpiece surrounded by a procedural forest clearing, rendered under atmospheric twilight lighting with soft shadows and exponential fog.

---

## Live Demo

Experience the interactive real-time 3D scene directly in your browser:  
**[https://agouti-ar.github.io/firefly-forest/](https://agouti-ar.github.io/firefly-forest/)**

---

## Overview

Firefly Forest is designed as a standalone, modular Three.js experiment. It leverages modern ES modules and native browser import maps to deliver a rich WebGL experience directly in any standard web browser without requiring bundling, transpilations, or external build toolchains.

---

## Architectural Highlights

### 1. Procedural Oak Architecture
- **Trunk & Roots:** Multi-tiered tapered cylinder segments with organic directional inclination, anchored by seven radiating buttress root structures that ground the tree naturally into the terrain.
- **Canopy Structure:** Seven primary sprawling boughs reaching outward and upward at varied angles, capped with deformed low-poly icosahedral foliage clusters.
- **Organic Vertex Displacement:** Custom mathematical perturbation applied to foliage vertices to break geometric uniformity and achieve the broad, horizontal silhouette typical of old-growth oak canopies.

### 2. Forest Ecology & Scattering
- **Procedural Forest Clones:** Secondary trees scattered in a radial ring between 8 and 25 units from the origin, each parameterized with randomized scaling (0.5x to 1.2x) and Y-axis rotation.
- **Terrain & Undergrowth:** Circular terrain with gentle sinusoidal wave displacement, populated with over 60 weathered low-poly dodecahedron stones, 50 dark green undergrowth bushes, and 80 wild grass blade clusters.
- **Bioluminescent Anchor:** A warm amber point light at the base of the central oak, accompanied by a cluster of glowing mushrooms that provides narrative and visual focal balance against the cool nocturnal palette.

### 3. Illumination & Color Pipeline
- **Tone Mapping:** ACES Filmic tone mapping (`THREE.ACESFilmicToneMapping`) with calibrated exposure (`1.2`) to preserve dynamic range and extract color depth from shadowed foliage.
- **Shadow Mapping:** High-resolution soft shadow maps (`THREE.PCFSoftShadowMap`) projected by a cool-toned directional moon light.
- **Atmospheric Mist:** Exponential depth fog (`THREE.FogExp2`) matched precisely to the twilight horizon color (`#12182b`), smoothly dissolving distant geometry into the mist.

### 4. Camera Dynamics
- **Orbital Navigation:** Powered by `OrbitControls` with smooth inertia damping (`dampingFactor: 0.05`).
- **Automated Orbit:** Continuous slow panoramic rotation around the central oak trunk at `target: (0, 2, 0)`.
- **Constraint Clamping:** Polar angles constrained above the ground plane to prevent camera clipping through the terrain.

---

## Technical Specifications

| Parameter | Specification |
|---|---|
| Core Engine | Three.js (v0.160.0) |
| Delivery Model | ES Modules via CDN (`jsdelivr.net`) |
| Shadow Filter | PCF Soft Shadow Mapping (2048x2048) |
| Tone Mapping | ACES Filmic (Exposure: 1.2) |
| Fog Formulation | Exponential (`THREE.FogExp2`, Density: 0.015) |
| Asset Pipeline | 100% Procedural Geometry (Zero external 3D model files) |

---

## Launching the Scene

### Live Interactive Scene
Run the real-time WebGL application directly in your browser:  
**[https://agouti-ar.github.io/firefly-forest/](https://agouti-ar.github.io/firefly-forest/)**

### Local Inspection
Double-click `index.html` in your file explorer or serve the directory with any static server:
```bash
npx serve .
```

---

## Project Structure

```
firefly-forest/
├── index.html       # Self-contained WebGL scene, lighting, geometry, and shaders
└── README.md        # Technical documentation and project overview
```

---

## License

This project is open source and available under the [MIT License](LICENSE).
