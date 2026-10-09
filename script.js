import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { SITE_CONFIG as config } from './site-config.js?v=20261007-ambient5';

const stage = document.querySelector('.stage');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const BASE_PITCH = config.motion.basePitch;
const INITIAL_YAW = config.motion.initialYaw;
const AUTO_SPEED = (Math.PI * 2) / config.motion.autoRotationMs;
const RETURN_DELAY = config.motion.returnDelayMs;
const RETURN_DURATION = config.motion.returnDurationMs;

let renderer;

try {
  renderer = new THREE.WebGLRenderer({
    antialias: config.renderer.antialias,
    powerPreference: config.renderer.powerPreference,
  });
} catch (error) {
  const message = document.createElement('p');
  message.className = 'webgl-error';
  message.textContent = 'This experience requires WebGL.';
  stage.append(message);
  throw error;
}

renderer.setPixelRatio(Math.min(window.devicePixelRatio, config.renderer.maxPixelRatio));
renderer.setSize(stage.clientWidth, stage.clientHeight, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = config.renderer.exposure;
renderer.transmissionResolutionScale = config.renderer.transmissionResolutionScale;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
stage.prepend(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(config.scene.backgroundColor);

const ambientLight = new THREE.AmbientLight(
  config.ambientLight.color,
  config.ambientLight.intensity,
);
scene.add(ambientLight);

const camera = new THREE.PerspectiveCamera(
  config.camera.fieldOfView,
  1,
  config.camera.near,
  config.camera.far,
);
camera.position.set(...config.camera.position);

const roomMaterial = new THREE.MeshStandardMaterial({
  color: config.room.material.color,
  roughness: config.room.material.roughness,
  metalness: config.room.material.metalness,
});

const floor = new THREE.Mesh(new THREE.PlaneGeometry(...config.room.floor.size), roomMaterial);
floor.rotation.x = config.room.floor.rotationX;
floor.position.set(...config.room.floor.position);
floor.receiveShadow = config.room.floor.receiveShadow;
scene.add(floor);

const backWall = new THREE.Mesh(new THREE.PlaneGeometry(...config.room.backWall.size), roomMaterial);
backWall.position.set(...config.room.backWall.position);
backWall.receiveShadow = config.room.backWall.receiveShadow;
scene.add(backWall);

const cubeGroup = new THREE.Group();
scene.add(cubeGroup);

const glassMaterial = new THREE.MeshPhysicalMaterial({
  ...config.cube.material,
  attenuationColor: new THREE.Color(config.cube.material.attenuationColor),
  specularColor: new THREE.Color(config.cube.material.specularColor),
});

const cubeGeometry = new RoundedBoxGeometry(
  ...config.cube.size,
  config.cube.cornerSegments,
  config.cube.cornerRadius,
);
const cubeBody = new THREE.Mesh(cubeGeometry, glassMaterial);
cubeBody.castShadow = config.cube.castShadow;
cubeBody.receiveShadow = config.cube.receiveShadow;
cubeGroup.add(cubeBody);

await document.fonts.ready;

const labelCanvas = document.createElement('canvas');
labelCanvas.width = config.label.canvasSize[0];
labelCanvas.height = config.label.canvasSize[1];
const labelContext = labelCanvas.getContext('2d');
labelContext.clearRect(0, 0, labelCanvas.width, labelCanvas.height);
labelContext.fillStyle = config.label.color;
labelContext.textAlign = 'center';
labelContext.textBaseline = 'middle';
labelContext.font = config.label.font;
config.label.lines.forEach(({ text, x, y }) => labelContext.fillText(text, x, y));

const labelTexture = new THREE.CanvasTexture(labelCanvas);
labelTexture.colorSpace = THREE.SRGBColorSpace;
labelTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();

const labelMaterial = new THREE.MeshBasicMaterial({
  map: labelTexture,
  transparent: true,
  alphaTest: config.label.alphaTest,
  depthWrite: false,
  toneMapped: false,
});
const label = new THREE.Mesh(new THREE.PlaneGeometry(...config.label.planeSize), labelMaterial);
label.position.set(...config.label.position);
label.renderOrder = config.label.renderOrder;
cubeGroup.add(label);

const spotLight = new THREE.SpotLight(
  config.spotlight.color,
  config.spotlight.intensity,
  config.spotlight.distance,
  config.spotlight.angle,
  config.spotlight.penumbra,
  config.spotlight.decay,
);
spotLight.position.set(...config.spotlight.position);
spotLight.castShadow = config.spotlight.castShadow;
spotLight.shadow.mapSize.set(...config.spotlight.shadowMapSize);
spotLight.shadow.bias = config.spotlight.shadowBias;
spotLight.shadow.normalBias = config.spotlight.shadowNormalBias;
spotLight.target.position.set(...config.spotlight.target);
scene.add(spotLight, spotLight.target);

let mode = reduceMotion ? 'manual' : 'auto';
let autoYaw = INITIAL_YAW;
let previousTime = performance.now();
let previousPointerTime = 0;
let activePointerId = null;
let idleTimer = null;
let returnStartedAt = 0;
let angularSpeed = 0;

const autoEuler = new THREE.Euler(BASE_PITCH, INITIAL_YAW, 0, 'YXZ');
const currentQuaternion = new THREE.Quaternion().setFromEuler(autoEuler);
const dragStartQuaternion = new THREE.Quaternion();
const returnStartQuaternion = new THREE.Quaternion();
const targetAutoQuaternion = new THREE.Quaternion();
const dragStartVector = new THREE.Vector3();
const previousTrackballVector = new THREE.Vector3();
const angularVelocityAxis = new THREE.Vector3(0, 1, 0);
const deltaQuaternion = new THREE.Quaternion();
const inertiaQuaternion = new THREE.Quaternion();
const cameraRight = new THREE.Vector3();
const cameraUp = new THREE.Vector3();

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const easeInOutCubic = (value) => value < 0.5
  ? 4 * value * value * value
  : 1 - Math.pow(-2 * value + 2, 3) / 2;

function updateAutoQuaternion(target = targetAutoQuaternion) {
  autoEuler.set(BASE_PITCH, autoYaw, 0, 'YXZ');
  return target.setFromEuler(autoEuler);
}

function projectPointerToTrackball(clientX, clientY, target = new THREE.Vector3()) {
  const bounds = renderer.domElement.getBoundingClientRect();
  const radius = Math.min(bounds.width, bounds.height) * config.controls.trackballRadiusScale;
  const x = (clientX - bounds.left - bounds.width / 2) / radius;
  const y = (bounds.top + bounds.height / 2 - clientY) / radius;
  const distanceSquared = x * x + y * y;
  const z = distanceSquared <= config.controls.trackballEdgeThreshold
    ? Math.sqrt(1 - distanceSquared)
    : config.controls.trackballEdgeThreshold / Math.sqrt(distanceSquared);

  target.set(x, y, z).normalize();
  return target.applyQuaternion(camera.quaternion);
}

function beginReturn() {
  if (mode === 'dragging' || reduceMotion) return;

  mode = 'returning';
  returnStartedAt = performance.now();
  returnStartQuaternion.copy(currentQuaternion);
  angularSpeed = 0;
}

function scheduleReturn() {
  window.clearTimeout(idleTimer);
  if (!reduceMotion) idleTimer = window.setTimeout(beginReturn, RETURN_DELAY);
}

function beginInteraction() {
  window.clearTimeout(idleTimer);
  mode = 'manual';
}

function finishDrag(event) {
  if (mode !== 'dragging' || event.pointerId !== activePointerId) return;

  mode = 'manual';
  activePointerId = null;
  stage.classList.remove('is-dragging');
  if (stage.hasPointerCapture(event.pointerId)) stage.releasePointerCapture(event.pointerId);
  scheduleReturn();
}

stage.addEventListener('pointerdown', (event) => {
  event.preventDefault();
  stage.focus({ preventScroll: true });
  beginInteraction();
  mode = 'dragging';
  activePointerId = event.pointerId;
  previousPointerTime = performance.now();
  angularSpeed = 0;
  dragStartQuaternion.copy(currentQuaternion);
  projectPointerToTrackball(event.clientX, event.clientY, dragStartVector);
  previousTrackballVector.copy(dragStartVector);
  stage.classList.add('is-dragging');
  stage.setPointerCapture(event.pointerId);
});

stage.addEventListener('pointermove', (event) => {
  if (mode !== 'dragging' || event.pointerId !== activePointerId) return;

  const now = performance.now();
  const elapsed = Math.max(now - previousPointerTime, config.controls.minimumPointerDeltaMs);
  const currentVector = projectPointerToTrackball(event.clientX, event.clientY);

  deltaQuaternion.setFromUnitVectors(dragStartVector, currentVector);
  currentQuaternion.copy(deltaQuaternion).multiply(dragStartQuaternion).normalize();

  deltaQuaternion.setFromUnitVectors(previousTrackballVector, currentVector).normalize();
  const halfAngle = Math.acos(clamp(deltaQuaternion.w, -1, 1));
  const sinHalfAngle = Math.sin(halfAngle);
  const angle = halfAngle * 2;

  if (angle > 0.0001 && Math.abs(sinHalfAngle) > 0.0001) {
    angularVelocityAxis
      .set(deltaQuaternion.x, deltaQuaternion.y, deltaQuaternion.z)
      .divideScalar(sinHalfAngle)
      .normalize();
    angularSpeed = Math.min(angle / elapsed, config.controls.maximumAngularSpeed);
  }

  previousTrackballVector.copy(currentVector);
  previousPointerTime = now;
});

stage.addEventListener('pointerup', finishDrag);
stage.addEventListener('pointercancel', finishDrag);

stage.addEventListener('keydown', (event) => {
  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;

  event.preventDefault();
  beginInteraction();
  cameraRight.set(1, 0, 0).applyQuaternion(camera.quaternion).normalize();
  cameraUp.set(0, 1, 0).applyQuaternion(camera.quaternion).normalize();
  const isHorizontal = event.key === 'ArrowLeft' || event.key === 'ArrowRight';
  const axis = isHorizontal ? cameraUp : cameraRight;
  const direction = event.key === 'ArrowLeft' || event.key === 'ArrowDown' ? -1 : 1;
  deltaQuaternion.setFromAxisAngle(axis, direction * config.controls.keyboardRotationStep);
  currentQuaternion.premultiply(deltaQuaternion).normalize();
  angularSpeed = 0;
  scheduleReturn();
});

function resize() {
  const width = stage.clientWidth;
  const height = stage.clientHeight;
  const aspect = width / height;
  camera.aspect = aspect;
  camera.position.z = config.camera.position[2]
    * Math.max(1, config.camera.narrowScreenFraming / aspect);
  camera.lookAt(...config.camera.lookAt);
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, config.renderer.maxPixelRatio));
}

new ResizeObserver(resize).observe(stage);
resize();

function animate(now) {
  const delta = Math.min(now - previousTime, config.motion.maxFrameDeltaMs);
  previousTime = now;

  if (!reduceMotion) {
    autoYaw += delta * AUTO_SPEED;

    if (mode === 'auto') {
      currentQuaternion.copy(updateAutoQuaternion());
    } else if (mode === 'manual') {
      if (angularSpeed > 0.00001) {
        inertiaQuaternion.setFromAxisAngle(angularVelocityAxis, angularSpeed * delta);
        currentQuaternion.premultiply(inertiaQuaternion).normalize();
        angularSpeed *= Math.exp(-delta / config.motion.inertiaDecayMs);
      }
    } else if (mode === 'returning') {
      const progress = clamp((now - returnStartedAt) / RETURN_DURATION, 0, 1);
      const eased = easeInOutCubic(progress);
      updateAutoQuaternion();
      currentQuaternion.slerpQuaternions(returnStartQuaternion, targetAutoQuaternion, eased);

      if (progress === 1) {
        mode = 'auto';
        currentQuaternion.copy(targetAutoQuaternion);
      }
    }
  }

  cubeGroup.quaternion.copy(currentQuaternion);
  renderer.render(scene, camera);
}

renderer.setAnimationLoop(animate);
