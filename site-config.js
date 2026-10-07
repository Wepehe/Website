// Edit this file to tune the site without changing the rendering or interaction code.
// Three.js coordinates: +X = right, +Y = up, +Z = toward the camera.
export const SITE_CONFIG = {
  renderer: {
    antialias: true,
    powerPreference: 'high-performance',
    maxPixelRatio: 2,
    exposure: 1.05,
    transmissionResolutionScale: 1,
  },

  scene: {
    backgroundColor: 0x080808,
  },

  camera: {
    fieldOfView: 32,
    near: 0.1,
    far: 50,
    position: [0, 0.2, 8.7],
    lookAt: [0, 0, 0],
    narrowScreenFraming: 0.9,
  },

  room: {
    material: {
      color: 0x080808,
      roughness: 0.82,
      metalness: 0,
    },

    // Raise/lower the floor with position[1].
    // position[0] moves it left/right; position[2] moves it forward/back.
    floor: {
      size: [30, 30],
      position: [0, -2, -2],
      rotationX: -Math.PI / 2,
      receiveShadow: true,
    },

    // Move the wall forward/back with position[2].
    // position[0] moves it left/right; position[1] raises/lowers its center.
    backWall: {
      size: [30, 12],
      position: [0, 4.25, -4.5],
      receiveShadow: true,
    },
  },

  cube: {
    size: [2.4, 2.4, 2.4],
    cornerSegments: 8,
    cornerRadius: 0.055,
    castShadow: false,
    receiveShadow: true,
    material: {
      color: 0x080808,
      roughness: 0.12,
      metalness: 0,
      transmission: 0.95,
      transparent: true,
      opacity: 0.1,
      depthWrite: false,
      thickness: 0.8,
      ior: 2,
      dispersion: 0.5,
      attenuationColor: 0xddeeff,
      attenuationDistance: 30,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
      specularIntensity: 1,
      specularColor: 0xffffff,
    },
  },

  label: {
    canvasSize: [1024, 512],
    color: '#f1f1ee',
    font: '600 142px Inter, sans-serif',
    lines: [
      { text: 'COMING', x: 512, y: 190 },
      { text: 'SOON', x: 512, y: 330 },
    ],
    planeSize: [1.9, 0.95],
    position: [0, 0, 1.23],
    alphaTest: 0.02,
    renderOrder: 2,
  },

  spotlight: {
    color: 0xfff4e8,
    intensity: 1600,
    distance: 14,
    angle: Math.PI * 0.085,
    penumbra: 0.58,
    decay: 2,
    // Matching position/target X and Z values keeps the beam vertical.
    // Reduce angle to tighten the pool; increase it to light more of the room.
    position: [0, 6.8, 0],
    target: [0, 0, 0],
    castShadow: true,
    shadowMapSize: [2048, 2048],
    shadowBias: -0.00015,
    shadowNormalBias: 0.025,
  },

  motion: {
    basePitch: 0.34,
    initialYaw: -0.56,
    autoRotationMs: 48000,
    returnDelayMs: 10000,
    returnDurationMs: 2200,
    inertiaDecayMs: 520,
    maxFrameDeltaMs: 32,
  },

  controls: {
    trackballRadiusScale: 0.36,
    trackballEdgeThreshold: 0.5,
    minimumPointerDeltaMs: 8,
    maximumAngularSpeed: 0.018,
    keyboardRotationStep: 0.16,
  },
};
