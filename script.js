import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const stage = document.querySelector('.stage');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const BASE_PITCH = -0.16;
const INITIAL_YAW = -0.4;
const AUTO_SPEED = (Math.PI * 2) / 48000;
const RETURN_DELAY = 10000;
const RETURN_DURATION = 2200;

let renderer;

try {
  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
} catch (error) {
  const message = document.createElement('p');
  message.className = 'webgl-error';
  message.textContent = 'This experience requires WebGL.';
  stage.append(message);
  throw error;
}

renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(stage.clientWidth, stage.clientHeight, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
stage.prepend(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
camera.position.set(0, 0.2, 7.4);

const cubeGroup = new THREE.Group();
scene.add(cubeGroup);

const glassMaterial = new THREE.MeshPhysicalMaterial({
  color: 0x111111,
  roughness: 0.035,
  metalness: 0,
  transmission: 0.94,
  thickness: 1.15,
  ior: 1.62,
  dispersion: 0.045,
  attenuationColor: new THREE.Color(0x202020),
  attenuationDistance: 5,
  clearcoat: 0.18,
  clearcoatRoughness: 0.025,
  specularIntensity: 1,
  specularColor: new THREE.Color(0xffffff),
});

const cubeGeometry = new RoundedBoxGeometry(2.4, 2.4, 2.4, 8, 0.055);
const cubeBody = new THREE.Mesh(cubeGeometry, glassMaterial);
cubeBody.castShadow = true;
cubeBody.receiveShadow = true;
cubeGroup.add(cubeBody);

await document.fonts.ready;

const labelCanvas = document.createElement('canvas');
labelCanvas.width = 1024;
labelCanvas.height = 512;
const labelContext = labelCanvas.getContext('2d');
labelContext.clearRect(0, 0, labelCanvas.width, labelCanvas.height);
labelContext.fillStyle = '#f1f1ee';
labelContext.textAlign = 'center';
labelContext.textBaseline = 'middle';
labelContext.font = '600 142px Inter, sans-serif';
labelContext.fillText('COMING', 512, 190);
labelContext.fillText('SOON', 512, 330);

const labelTexture = new THREE.CanvasTexture(labelCanvas);
labelTexture.colorSpace = THREE.SRGBColorSpace;
labelTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();

const labelMaterial = new THREE.MeshBasicMaterial({
  map: labelTexture,
  transparent: true,
  alphaTest: 0.02,
  depthWrite: false,
  toneMapped: false,
});
const label = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.95), labelMaterial);
label.position.z = 1.23;
label.renderOrder = 2;
cubeGroup.add(label);

const spotLight = new THREE.SpotLight(0xfff4e8, 1200, 15, Math.PI * 0.2, 0.68, 2);
spotLight.position.set(0, 5.4, 1.5);
spotLight.castShadow = true;
spotLight.shadow.mapSize.set(2048, 2048);
spotLight.shadow.bias = -0.00015;
spotLight.shadow.normalBias = 0.025;
spotLight.target.position.set(0, 0, 0);
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
  const radius = Math.min(bounds.width, bounds.height) * 0.36;
  const x = (clientX - bounds.left - bounds.width / 2) / radius;
  const y = (bounds.top + bounds.height / 2 - clientY) / radius;
  const distanceSquared = x * x + y * y;
  const z = distanceSquared <= 0.5
    ? Math.sqrt(1 - distanceSquared)
    : 0.5 / Math.sqrt(distanceSquared);

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
  const elapsed = Math.max(now - previousPointerTime, 8);
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
    angularSpeed = Math.min(angle / elapsed, 0.018);
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
  deltaQuaternion.setFromAxisAngle(axis, direction * 0.16);
  currentQuaternion.premultiply(deltaQuaternion).normalize();
  angularSpeed = 0;
  scheduleReturn();
});

function resize() {
  const width = stage.clientWidth;
  const height = stage.clientHeight;
  const aspect = width / height;
  camera.aspect = aspect;
  camera.position.z = 7.4 * Math.max(1, 0.72 / aspect);
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
}

new ResizeObserver(resize).observe(stage);
resize();

function animate(now) {
  const delta = Math.min(now - previousTime, 32);
  previousTime = now;

  if (!reduceMotion) {
    autoYaw += delta * AUTO_SPEED;

    if (mode === 'auto') {
      currentQuaternion.copy(updateAutoQuaternion());
    } else if (mode === 'manual') {
      if (angularSpeed > 0.00001) {
        inertiaQuaternion.setFromAxisAngle(angularVelocityAxis, angularSpeed * delta);
        currentQuaternion.premultiply(inertiaQuaternion).normalize();
        angularSpeed *= Math.exp(-delta / 520);
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
