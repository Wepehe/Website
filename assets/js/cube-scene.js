import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { SCENE_CONFIG, SCENE_PRESENTATIONS } from './scene-config.js';

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const easeInOutCubic = (value) => value < 0.5
  ? 4 * value * value * value
  : 1 - Math.pow(-2 * value + 2, 3) / 2;

export class CubeScene {
  constructor({ root, identity, onActivate }) {
    this.root = root;
    this.identity = identity;
    this.onActivate = onActivate;
    this.reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.presentationName = 'landing';
    this.presentation = SCENE_PRESENTATIONS.landing;
    this.mode = this.reduceMotion ? 'manual' : 'auto';
    this.activePointerId = null;
    this.dragDistance = 0;
    this.angularSpeed = 0;
    this.autoOffset = 0;
    this.previousTime = performance.now();
    this.previousPointerTime = 0;
    this.returnStartedAt = 0;
    this.transitionStartedAt = 0;
    this.idleTimer = null;
    this.theme = 'dark';

    this.currentQuaternion = new THREE.Quaternion();
    this.dragStartQuaternion = new THREE.Quaternion();
    this.returnStartQuaternion = new THREE.Quaternion();
    this.transitionStartQuaternion = new THREE.Quaternion();
    this.targetQuaternion = new THREE.Quaternion();
    this.dragStartVector = new THREE.Vector3();
    this.previousTrackballVector = new THREE.Vector3();
    this.angularVelocityAxis = new THREE.Vector3(0, 1, 0);
    this.deltaQuaternion = new THREE.Quaternion();
    this.inertiaQuaternion = new THREE.Quaternion();
    this.pointerStart = new THREE.Vector2();
    this.pointerNdc = new THREE.Vector2();
    this.projectedCenter = new THREE.Vector3();
    this.raycaster = new THREE.Raycaster();
    this.targetPosition = new THREE.Vector3(...this.presentation.position);
    this.targetScale = this.presentation.scale;

    this.createRenderer();
    this.createScene();
    this.createRoomWeb();
    this.createCube();
    this.createLighting();
    this.bindEvents();
    this.resize();
    this.setTheme(document.documentElement.dataset.theme || 'dark');
    this.setPresentation('landing', true);
    this.renderer.setAnimationLoop((time) => this.animate(time));
  }

  createRenderer() {
    try {
      this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    } catch (error) {
      const message = document.createElement('p');
      message.className = 'webgl-error';
      message.textContent = 'This portfolio requires WebGL.';
      this.root.append(message);
      throw error;
    }

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, SCENE_CONFIG.renderer.maxPixelRatio));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = SCENE_CONFIG.renderer.exposure;
    this.root.append(this.renderer.domElement);
  }

  createScene() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      SCENE_CONFIG.camera.fieldOfView,
      1,
      SCENE_CONFIG.camera.near,
      SCENE_CONFIG.camera.far,
    );
    this.camera.position.set(...SCENE_CONFIG.camera.position);
    this.camera.lookAt(0, 0, 0);
  }

  createRoomWeb() {
    this.webGroup = new THREE.Group();
    this.scene.add(this.webGroup);
    this.webMaterial = new THREE.LineBasicMaterial({ transparent: true, opacity: 0.18 });

    const positions = [
      [-6.4, 3.2, -7, 0.52], [5.6, 3.8, -8, 0.72], [-5.2, -3.5, -6, 0.42],
      [6.7, -2.8, -9, 0.58], [-3.2, 4.8, -10, 0.34], [3.1, -4.6, -8, 0.38],
      [-7.4, 0.2, -11, 0.64], [7.6, 0.6, -12, 0.44], [0, 5.6, -13, 0.5],
    ];

    const webPoints = [];
    positions.forEach(([x, y, z, scale], index) => {
      const edges = new THREE.EdgesGeometry(new THREE.BoxGeometry(scale, scale, scale));
      const cube = new THREE.LineSegments(edges, this.webMaterial);
      cube.position.set(x, y, z);
      cube.rotation.set(index * 0.21, index * -0.17, index * 0.09);
      this.webGroup.add(cube);
      webPoints.push(new THREE.Vector3(x, y, z));
      if (index > 0) webPoints.push(positions[index - 1] ? new THREE.Vector3(...positions[index - 1].slice(0, 3)) : new THREE.Vector3());
    });

    const webGeometry = new THREE.BufferGeometry().setFromPoints(webPoints);
    this.webLines = new THREE.LineSegments(webGeometry, this.webMaterial);
    this.webGroup.add(this.webLines);
  }

  createCube() {
    const { cube } = SCENE_CONFIG;
    this.cubeGroup = new THREE.Group();
    this.scene.add(this.cubeGroup);

    this.cubeMaterial = new THREE.MeshPhysicalMaterial({
      ...cube.material,
      attenuationColor: new THREE.Color(cube.material.attenuationColor),
      specularColor: new THREE.Color(cube.material.specularColor),
    });

    const geometry = new RoundedBoxGeometry(
      cube.size,
      cube.size,
      cube.size,
      cube.cornerSegments,
      cube.cornerRadius,
    );
    this.cubeBody = new THREE.Mesh(geometry, this.cubeMaterial);
    this.cubeGroup.add(this.cubeBody);

    this.edgeMaterial = new THREE.LineBasicMaterial({ transparent: true, opacity: 0.5 });
    const edges = new THREE.EdgesGeometry(new THREE.BoxGeometry(cube.size + 0.018, cube.size + 0.018, cube.size + 0.018));
    this.cubeEdges = new THREE.LineSegments(edges, this.edgeMaterial);
    this.cubeGroup.add(this.cubeEdges);

    this.labelPlanes = [];
    const half = cube.size / 2 + 0.012;
    this.addLabel(this.identity.name, [0, 0, half], [0, 0, 0], 0.94);
    this.addLabel('PORTFOLIO', [half, 0, 0], [0, Math.PI / 2, 0], 0.6);
    this.addLabel('ABOUT ME', [0, half, 0], [-Math.PI / 2, 0, 0], 0.66);
    this.addLabel('CONTACT', [0, -half, 0], [Math.PI / 2, 0, 0], 0.66);
    this.addLabel(this.identity.insideJokes[0] ?? 'SPIN ME', [-half, 0, 0], [0, -Math.PI / 2, 0], 0.48);
    this.addLabel(this.identity.insideJokes[1] ?? 'HELLO', [0, 0, -half], [0, Math.PI, 0], 0.48);

    this.clampMaterial = new THREE.MeshStandardMaterial({
      color: 0x7685aa,
      roughness: 0.35,
      metalness: 0.82,
      transparent: true,
      opacity: 0,
    });
    this.clamps = new THREE.Group();
    this.clamps.rotation.z = Math.PI / 2;
    const clampGeometry = new THREE.BoxGeometry(0.24, cube.size + 0.8, 0.3);
    [-1, 1].forEach((direction) => {
      const clamp = new THREE.Mesh(clampGeometry, this.clampMaterial);
      clamp.position.x = direction * (half + 0.23);
      this.clamps.add(clamp);
    });
    this.cubeGroup.add(this.clamps);

    this.beamMaterial = new THREE.MeshBasicMaterial({
      color: 0x6aa8ff,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.projectorBeam = new THREE.Mesh(
      new THREE.CylinderGeometry(3.4, 0.14, 4.7, 32, 1, true),
      this.beamMaterial,
    );
    this.projectorBeam.visible = false;
    this.scene.add(this.projectorBeam);
  }

  addLabel(text, position, rotation, size) {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
      side: THREE.DoubleSide,
    });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(2.55, 1.28), material);
    plane.position.set(...position);
    plane.rotation.set(...rotation);
    plane.renderOrder = 4;
    this.cubeGroup.add(plane);
    this.labelPlanes.push({ canvas, texture, text, size });
  }

  redrawLabels() {
    const color = SCENE_CONFIG.themes[this.theme].label;
    this.labelPlanes.forEach(({ canvas, texture, text, size }) => {
      const context = canvas.getContext('2d');
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = color;
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.font = `500 ${Math.round(150 * size)}px Space Grotesk, sans-serif`;
      context.fillText(text, 512, 256, 880);
      context.strokeStyle = color;
      context.globalAlpha = 0.5;
      context.lineWidth = 3;
      context.strokeRect(82, 100, 860, 312);
      context.globalAlpha = 1;
      texture.needsUpdate = true;
    });
  }

  createLighting() {
    const { ambient, spot } = SCENE_CONFIG.lights;
    this.ambientLight = new THREE.AmbientLight(ambient.color, ambient.intensity);
    this.scene.add(this.ambientLight);

    this.spotLight = new THREE.SpotLight(
      spot.color,
      spot.intensity,
      spot.distance,
      spot.angle,
      spot.penumbra,
      spot.decay,
    );
    this.spotLight.position.set(...spot.position);
    this.spotLight.target.position.set(...spot.target);
    this.scene.add(this.spotLight, this.spotLight.target);
  }

  bindEvents() {
    this.root.addEventListener('pointerdown', (event) => this.pointerDown(event));
    this.root.addEventListener('pointermove', (event) => this.pointerMove(event));
    this.root.addEventListener('pointerup', (event) => this.pointerUp(event));
    this.root.addEventListener('pointercancel', (event) => this.pointerUp(event));
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.root);
  }

  setTheme(theme) {
    this.theme = theme in SCENE_CONFIG.themes ? theme : 'dark';
    const palette = SCENE_CONFIG.themes[this.theme];
    this.scene.background = new THREE.Color(palette.background);
    this.cubeMaterial.color.setHex(palette.cube);
    this.edgeMaterial.color.setHex(palette.edge);
    this.webMaterial.color.setHex(palette.web);
    this.redrawLabels();
  }

  setPresentation(name, immediate = false) {
    this.presentationName = name;
    this.presentation = SCENE_PRESENTATIONS[name] ?? SCENE_PRESENTATIONS.menu;
    this.targetPosition.set(...this.presentation.position);
    this.targetScale = this.presentation.scale;
    this.transitionStartQuaternion.copy(this.currentQuaternion);
    this.transitionStartedAt = performance.now();
    this.mode = immediate || this.reduceMotion ? (this.reduceMotion ? 'manual' : 'auto') : 'transitioning';
    this.angularSpeed = 0;
    clearTimeout(this.idleTimer);

    if (immediate) {
      this.cubeGroup.position.copy(this.targetPosition);
      this.cubeGroup.scale.setScalar(this.targetScale);
      this.currentQuaternion.copy(this.getTargetQuaternion(0));
    }

    const projector = name === 'about' || name === 'contact';
    this.projectorBeam.visible = projector;
    this.projectorBeam.position.set(this.presentation.position[0], this.presentation.position[1] + 2.65, -0.4);
  }

  getTargetQuaternion(extraYaw = this.autoOffset) {
    const euler = new THREE.Euler(
      this.presentation.pitch,
      this.presentation.yaw + extraYaw,
      this.presentation.roll ?? 0,
      'YXZ',
    );
    return this.targetQuaternion.setFromEuler(euler);
  }

  projectPointer(clientX, clientY, target = new THREE.Vector3()) {
    const bounds = this.renderer.domElement.getBoundingClientRect();
    this.cubeGroup.getWorldPosition(this.projectedCenter).project(this.camera);
    const centerX = bounds.left + (this.projectedCenter.x + 1) * bounds.width / 2;
    const centerY = bounds.top + (1 - this.projectedCenter.y) * bounds.height / 2;
    const radius = Math.max(
      64,
      Math.min(bounds.width, bounds.height)
        * SCENE_CONFIG.motion.trackballRadiusScale
        * this.cubeGroup.scale.x,
    );
    const x = (clientX - centerX) / radius;
    const y = (centerY - clientY) / radius;
    const distanceSquared = x * x + y * y;
    const z = distanceSquared <= 0.5 ? Math.sqrt(1 - distanceSquared) : 0.5 / Math.sqrt(distanceSquared);
    return target.set(x, y, z).normalize().applyQuaternion(this.camera.quaternion);
  }

  pointerDown(event) {
    if (!this.presentation.interactive || event.button !== 0) return;
    event.preventDefault();
    clearTimeout(this.idleTimer);
    this.mode = 'dragging';
    this.activePointerId = event.pointerId;
    this.previousPointerTime = performance.now();
    this.angularSpeed = 0;
    this.dragDistance = 0;
    this.pointerStart.set(event.clientX, event.clientY);
    this.dragStartQuaternion.copy(this.currentQuaternion);
    this.projectPointer(event.clientX, event.clientY, this.dragStartVector);
    this.previousTrackballVector.copy(this.dragStartVector);
    this.root.classList.add('is-dragging');
    this.root.setPointerCapture(event.pointerId);
  }

  pointerMove(event) {
    if (this.mode !== 'dragging' || event.pointerId !== this.activePointerId) return;
    const now = performance.now();
    const elapsed = Math.max(now - this.previousPointerTime, 8);
    const currentVector = this.projectPointer(event.clientX, event.clientY);
    this.dragDistance = Math.max(this.dragDistance, this.pointerStart.distanceTo(new THREE.Vector2(event.clientX, event.clientY)));

    this.deltaQuaternion.setFromUnitVectors(this.dragStartVector, currentVector);
    this.currentQuaternion.copy(this.deltaQuaternion).multiply(this.dragStartQuaternion).normalize();

    this.deltaQuaternion.setFromUnitVectors(this.previousTrackballVector, currentVector).normalize();
    const halfAngle = Math.acos(clamp(this.deltaQuaternion.w, -1, 1));
    const sinHalfAngle = Math.sin(halfAngle);
    const angle = halfAngle * 2;
    if (angle > 0.0001 && Math.abs(sinHalfAngle) > 0.0001) {
      this.angularVelocityAxis
        .set(this.deltaQuaternion.x, this.deltaQuaternion.y, this.deltaQuaternion.z)
        .divideScalar(sinHalfAngle)
        .normalize();
      this.angularSpeed = Math.min(angle / elapsed, SCENE_CONFIG.motion.maximumAngularSpeed);
    }

    this.previousTrackballVector.copy(currentVector);
    this.previousPointerTime = now;
  }

  pointerUp(event) {
    if (this.mode !== 'dragging' || event.pointerId !== this.activePointerId) return;
    const wasClick = this.dragDistance < 7;
    this.mode = 'manual';
    this.activePointerId = null;
    this.root.classList.remove('is-dragging');
    if (this.root.hasPointerCapture(event.pointerId)) this.root.releasePointerCapture(event.pointerId);

    if (wasClick) {
      const face = this.pickCubeFace(event.clientX, event.clientY);
      if (face) this.onActivate?.(face);
    }

    if (!this.reduceMotion) {
      this.idleTimer = window.setTimeout(() => this.beginReturn(), SCENE_CONFIG.motion.returnDelayMs);
    }
  }

  pickCubeFace(clientX, clientY) {
    const bounds = this.renderer.domElement.getBoundingClientRect();
    this.pointerNdc.set(
      ((clientX - bounds.left) / bounds.width) * 2 - 1,
      -((clientY - bounds.top) / bounds.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(this.pointerNdc, this.camera);
    const intersection = this.raycaster.intersectObject(this.cubeBody, false)[0];
    if (!intersection?.face) return null;

    const normal = intersection.face.normal;
    if (normal.y > 0.7) return 'about';
    if (normal.y < -0.7) return 'contact';
    if (Math.abs(normal.x) > 0.7) return 'portfolio';
    return 'front';
  }

  beginReturn() {
    if (this.mode === 'dragging' || this.reduceMotion) return;
    this.mode = 'returning';
    this.returnStartedAt = performance.now();
    this.returnStartQuaternion.copy(this.currentQuaternion);
    this.angularSpeed = 0;
  }

  resize() {
    const width = this.root.clientWidth;
    const height = this.root.clientHeight;
    const aspect = width / height;
    this.camera.aspect = aspect;
    this.camera.position.z = SCENE_CONFIG.camera.position[2] * Math.max(1, 0.82 / aspect);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, SCENE_CONFIG.renderer.maxPixelRatio));
  }

  animate(now) {
    const delta = Math.min(now - this.previousTime, 32);
    this.previousTime = now;
    const positionDamping = 1 - Math.exp(-delta / 340);
    this.cubeGroup.position.lerp(this.targetPosition, positionDamping);
    const currentScale = this.cubeGroup.scale.x;
    this.cubeGroup.scale.setScalar(THREE.MathUtils.lerp(currentScale, this.targetScale, positionDamping));

    if (!this.reduceMotion) {
      this.autoOffset += delta * ((Math.PI * 2) / SCENE_CONFIG.motion.autoRotationMs);
      if (this.mode === 'auto') {
        this.currentQuaternion.copy(this.getTargetQuaternion());
      } else if (this.mode === 'manual' && this.angularSpeed > 0.00001) {
        this.inertiaQuaternion.setFromAxisAngle(this.angularVelocityAxis, this.angularSpeed * delta);
        this.currentQuaternion.premultiply(this.inertiaQuaternion).normalize();
        this.angularSpeed *= Math.exp(-delta / SCENE_CONFIG.motion.inertiaDecayMs);
      } else if (this.mode === 'returning') {
        const progress = clamp((now - this.returnStartedAt) / SCENE_CONFIG.motion.returnDurationMs, 0, 1);
        this.currentQuaternion.slerpQuaternions(this.returnStartQuaternion, this.getTargetQuaternion(), easeInOutCubic(progress));
        if (progress === 1) this.mode = 'auto';
      } else if (this.mode === 'transitioning') {
        const progress = clamp((now - this.transitionStartedAt) / 900, 0, 1);
        this.currentQuaternion.slerpQuaternions(this.transitionStartQuaternion, this.getTargetQuaternion(0), easeInOutCubic(progress));
        if (progress === 1) this.mode = 'auto';
      }
    }

    this.cubeGroup.quaternion.copy(this.currentQuaternion);
    this.clampMaterial.opacity = THREE.MathUtils.lerp(
      this.clampMaterial.opacity,
      this.presentation.clamps ? 0.82 : 0,
      positionDamping,
    );
    this.clamps.visible = this.clampMaterial.opacity > 0.01;
    this.beamMaterial.opacity = THREE.MathUtils.lerp(
      this.beamMaterial.opacity,
      this.projectorBeam.visible ? 0.075 : 0,
      positionDamping,
    );
    this.webGroup.rotation.y += delta * 0.000018;
    this.renderer.render(this.scene, this.camera);
  }
}
