# Coming Soon

A minimal WebGL teaser featuring a physically lit translucent glass cube.

## Rendering

- Three.js `0.186.1` renders the scene directly in WebGL.
- A physically based pale-smoke shell combines refraction, light transmission, and translucent surface blending.
- A restrained material fill keeps the frosted volume legible against the otherwise empty black environment.
- The material keeps depth writing enabled so the closed volume remains visually coherent while it rotates.
- One overhead spotlight is the scene's only light source, so every highlight responds consistently as the cube rotates.
- The front-face label is a high-resolution canvas texture layered onto the glass.

## Interaction

- The cube rotates automatically.
- Drag anywhere on the stage with a mouse or touch using a quaternion arcball, surface-following rotation, momentum, and reliable pointer capture.
- After ten seconds without interaction, it smoothly returns to its original alignment and automatic rotation.
- Arrow keys provide keyboard rotation.
- Automatic motion is disabled when the visitor prefers reduced motion.

Pushes to `main` deploy automatically through the included GitHub Pages workflow.
