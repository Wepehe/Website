# Coming Soon

A minimal WebGL teaser featuring a transparent glass cube in a dark room.

## Rendering

- Three.js `0.186.1` renders the scene directly in WebGL.
- A physical glass material uses 90% transmission, restrained surface alpha, a glass IOR, optical thickness, and subtle dispersion.
- A black floor and back wall provide a visible horizon edge for the glass to refract.
- One overhead spotlight is the scene's only light source, so every highlight responds consistently as the cube rotates.
- The front-face label is a high-resolution canvas texture layered onto the glass.

## Interaction

- The cube rotates automatically.
- Drag anywhere on the stage with a mouse or touch using a quaternion arcball, surface-following rotation, momentum, and reliable pointer capture.
- After ten seconds without interaction, it smoothly returns to its original alignment and automatic rotation.
- Arrow keys provide keyboard rotation.
- Automatic motion is disabled when the visitor prefers reduced motion.

The approved interaction feel is preserved by the Git tag `interaction-checkpoint-2026-10-07`.

Pushes to `main` deploy automatically through the included GitHub Pages workflow.
