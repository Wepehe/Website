import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const stage = document.querySelector('.stage');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const BASE_PITCH = -0.16;
const INITIAL_YAW = -0.4;
const AUTO_SPEED = (Math.PI * 2) / 48000;
const RETURN_DELAY = 10000;
const RETURN_DURATION = 2200;
const DRAG_SENSITIVITY = 0.0062;

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

const pmremGenerator = new THREE.PMREMGenerator(renderer);
const roomEnvironment = new RoomEnvironment();
const environmentTarget = pmremGenerator.fromScene(roomEnvironment, 0.04);
scene.environment = environmentTarget.texture;
roomEnvironment.dispose();
pmremGenerator.dispose();

const cubeGroup = new THREE.Group();
cubeGroup.rotation.order = 'YXZ';
scene.add(cubeGroup);

const glassMaterial = new THREE.MeshPhysicalMaterial({
  color: 0x030303,
  roughness: 0.13,
  metalness: 0,
  transmission: 0.2,
  thickness: 1.5,
  ior: 1.5,
  attenuationColor: new THREE.Color(0x010101),
  attenuationDistance: 0.65,
  clearcoat: 0.5,
  clearcoatRoughness: 0.08,
  specularIntensity: 1,
  specularColor: new THREE.Color(0xffffff),
  envMapIntensity: 0.42,
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

const spotLight = new THREE.SpotLight(0xfff4e8, 900, 15, Math.PI * 0.19, 0.62, 2);
spotLight.position.set(0, 5.2, 2.8);
spotLight.castShadow = true;
spotLight.shadow.mapSize.set(2048, 2048);
spotLight.shadow.bias = -0.00015;
spotLight.shadow.normalBias = 0.025;
spotLight.target.position.set(0, 0, 0);
scene.add(spotLight, spotLight.target);

const topFill = new THREE.PointLight(0xdde7ff, 22, 10, 2);
topFill.position.set(-2.2, 3.5, 1.2);
scene.add(topFill);

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

let mode = reduceMotion ? 'manual' : 'auto';
let pitch = BASE_PITCH;
let yaw = INITIAL_YAW;
let autoYaw = INITIAL_YAW;
let velocityX = 0;
let velocityY = 0;
let previousTime = performance.now();
let previousPointerTime = 0;
let previousPointerX = 0;
let previousPointerY = 0;
let activePointerId = null;
let idleTimer = null;
let returnStartedAt = 0;
let returnYawOffset = 0;
let returnStartPitch = BASE_PITCH;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const shortestAngle = (angle) => ((angle + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
const easeInOutCubic = (value) => value < 0.5
  ? 4 * value * value * value
  : 1 - Math.pow(-2 * value + 2, 3) / 2;

function setPointerPosition(event) {
  const bounds = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
  pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
}

function pointerHitsCube(event) {
  setPointerPosition(event);
  raycaster.setFromCamera(pointer, camera);
  return raycaster.intersectObject(cubeBody, false).length > 0;
}

function beginReturn() {
  if (mode === 'dragging' || reduceMotion) return;

  mode = 'returning';
  returnStartedAt = performance.now();
  returnYawOffset = shortestAngle(yaw - autoYaw);
  returnStartPitch = pitch;
  velocityX = 0;
  velocityY = 0;
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
  if (!pointerHitsCube(event)) return;

  event.preventDefault();
  stage.focus({ preventScroll: true });
  beginInteraction();
  mode = 'dragging';
  activePointerId = event.pointerId;
  previousPointerX = event.clientX;
  previousPointerY = event.clientY;
  previousPointerTime = performance.now();
  velocityX = 0;
  velocityY = 0;
  stage.classList.add('is-dragging');
  stage.setPointerCapture(event.pointerId);
});

stage.addEventListener('pointermove', (event) => {
  if (mode !== 'dragging' || event.pointerId !== activePointerId) {
    stage.classList.toggle('can-grab', pointerHitsCube(event));
    return;
  }

  const now = performance.now();
  const elapsed = Math.max(now - previousPointerTime, 8);
  const deltaX = event.clientX - previousPointerX;
  const deltaY = event.clientY - previousPointerY;

  yaw += deltaX * DRAG_SENSITIVITY;
  pitch = clamp(pitch - deltaY * DRAG_SENSITIVITY, -1.25, 1.25);
  velocityX = (deltaX * DRAG_SENSITIVITY) / elapsed;
  velocityY = (-deltaY * DRAG_SENSITIVITY) / elapsed;

  previousPointerX = event.clientX;
  previousPointerY = event.clientY;
  previousPointerTime = now;
});

stage.addEventListener('pointerleave', () => {
  if (mode !== 'dragging') stage.classList.remove('can-grab');
});
stage.addEventListener('pointerup', finishDrag);
stage.addEventListener('pointercancel', finishDrag);

stage.addEventListener('keydown', (event) => {
  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;

  event.preventDefault();
  beginInteraction();
  yaw += event.key === 'ArrowLeft' ? -0.16 : event.key === 'ArrowRight' ? 0.16 : 0;
  pitch = clamp(pitch + (event.key === 'ArrowUp' ? 0.16 : event.key === 'ArrowDown' ? -0.16 : 0), -1.25, 1.25);
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
      pitch = BASE_PITCH;
      yaw = autoYaw;
    } else if (mode === 'manual') {
      yaw += velocityX * delta;
      pitch = clamp(pitch + velocityY * delta, -1.25, 1.25);
      const friction = Math.exp(-delta / 520);
      velocityX *= friction;
      velocityY *= friction;
    } else if (mode === 'returning') {
      const progress = clamp((now - returnStartedAt) / RETURN_DURATION, 0, 1);
      const eased = easeInOutCubic(progress);
      pitch = returnStartPitch + (BASE_PITCH - returnStartPitch) * eased;
      yaw = autoYaw + returnYawOffset * (1 - eased);

      if (progress === 1) {
        mode = 'auto';
        pitch = BASE_PITCH;
        yaw = autoYaw;
      }
    }
  }

  cubeGroup.rotation.x = pitch;
  cubeGroup.rotation.y = yaw;
  renderer.render(scene, camera);
}

renderer.setAnimationLoop(animate);
