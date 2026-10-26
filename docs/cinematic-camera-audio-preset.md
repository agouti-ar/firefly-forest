# Cinematic camera and sound preferences

Reusable defaults for AGOUTI's Three.js scenes; scale distances to each scene.

- One animation loop and OrbitControls. Manual input pauses automatic orbit; after 5 seconds idle, return smoothly over 3.5 seconds to the exact pose before zooming, then continue orbit without a jump. Save position and target together.
- Orbit approximately 0.066 radians/second. Gentle close-up dolly, elevation and target drift; reduce movement for prefers-reduced-motion. Keep the subject framed on mobile.
- Spatial nature: one AudioContext and camera-world listener updated about 20 Hz, smoothing 0.04 seconds. Inverse distance, equalpower panning, local rolloff 1.1, broad forest 0.7, wind 0.55. Reference distances 16–28 (wind 35), relative to island radius 18. Far forest fades over 55–140 units; water over 80–200. Never route duplicate dry audio directly to output.
- Music is an optional nonspatial stereo layer, independent of camera distance. Nature and music need separate saved sliders and a shared explicit Sound on/off control. Start with nature 40%, music 65%, then balance the actual recordings; percentages are not loudness measurements. Use a shared output compressor and gain ramps to avoid clicks.
- No autoplay. Pause audio while hidden; resume only if previously enabled. Preserve mobile memory by streaming music. Do not transfer recordings, rain synthesis or scene objects from unrelated projects.
- English labels, icons and at least 44px touch targets. Hide panel after 4 seconds idle, restore with mouse, touch, wheel or keyboard. Keep visible during slider drag and keyboard focus. Hiding UI never mutes playback.

These preferences do not authorize publishing or pushing future projects.
