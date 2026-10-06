# Coming Soon

A minimal WebGL teaser featuring a physically lit black-glass cube.

## Rendering

- Three.js `0.186.1` renders the scene directly in WebGL.
- A physically based black-glass material uses 94% light transmission, glass-like refraction, and a subtle dark tint.
- One overhead spotlight is the scene's only light source, so every highlight responds consistently as the cube rotates.
- The front-face label is a high-resolution canvas texture layered onto the glass.

## Interaction

- The cube rotates automatically.
- Drag anywhere on the stage with a mouse or touch to rotate it manually with momentum and reliable pointer capture.
- After ten seconds without interaction, it smoothly returns to its original alignment and automatic rotation.
- Arrow keys provide keyboard rotation.
- Automatic motion is disabled when the visitor prefers reduced motion.

Pushes to `main` deploy automatically through the included GitHub Pages workflow.
