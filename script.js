const cubeControl = document.querySelector('.cube-control');
const cube = document.querySelector('.cube');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const BASE_PITCH = -12;
const AUTO_SPEED = 360 / 48000;
const RETURN_DELAY = 10000;
const RETURN_DURATION = 2200;
const DRAG_SENSITIVITY = 0.36;

let mode = reduceMotion ? 'manual' : 'auto';
let pitch = BASE_PITCH;
let yaw = -24;
let autoYaw = -24;
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
const shortestAngle = (angle) => ((angle + 180) % 360 + 360) % 360 - 180;
const easeInOutCubic = (value) => value < 0.5
  ? 4 * value * value * value
  : 1 - Math.pow(-2 * value + 2, 3) / 2;

function render() {
  cube.style.transform = `rotateX(${pitch}deg) rotateY(${yaw}deg)`;
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
  idleTimer = window.setTimeout(beginReturn, RETURN_DELAY);
}

function beginInteraction() {
  window.clearTimeout(idleTimer);
  mode = 'manual';
}

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
      pitch = clamp(pitch + velocityY * delta, -72, 72);

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

  render();
  requestAnimationFrame(animate);
}

cubeControl.addEventListener('pointerdown', (event) => {
  if (reduceMotion) return;

  event.preventDefault();
  beginInteraction();
  mode = 'dragging';
  activePointerId = event.pointerId;
  previousPointerX = event.clientX;
  previousPointerY = event.clientY;
  previousPointerTime = performance.now();
  velocityX = 0;
  velocityY = 0;
  cubeControl.classList.add('is-dragging');
  cubeControl.setPointerCapture(event.pointerId);
});

cubeControl.addEventListener('pointermove', (event) => {
  if (mode !== 'dragging' || event.pointerId !== activePointerId) return;

  const now = performance.now();
  const elapsed = Math.max(now - previousPointerTime, 8);
  const deltaX = event.clientX - previousPointerX;
  const deltaY = event.clientY - previousPointerY;

  yaw += deltaX * DRAG_SENSITIVITY;
  pitch = clamp(pitch - deltaY * DRAG_SENSITIVITY, -72, 72);
  velocityX = (deltaX * DRAG_SENSITIVITY) / elapsed;
  velocityY = (-deltaY * DRAG_SENSITIVITY) / elapsed;

  previousPointerX = event.clientX;
  previousPointerY = event.clientY;
  previousPointerTime = now;
});

function finishDrag(event) {
  if (mode !== 'dragging' || event.pointerId !== activePointerId) return;

  mode = 'manual';
  activePointerId = null;
  cubeControl.classList.remove('is-dragging');
  if (cubeControl.hasPointerCapture(event.pointerId)) {
    cubeControl.releasePointerCapture(event.pointerId);
  }
  scheduleReturn();
}

cubeControl.addEventListener('pointerup', finishDrag);
cubeControl.addEventListener('pointercancel', finishDrag);

cubeControl.addEventListener('keydown', (event) => {
  if (reduceMotion || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;

  event.preventDefault();
  beginInteraction();
  yaw += event.key === 'ArrowLeft' ? -12 : event.key === 'ArrowRight' ? 12 : 0;
  pitch = clamp(pitch + (event.key === 'ArrowUp' ? 12 : event.key === 'ArrowDown' ? -12 : 0), -72, 72);
  scheduleReturn();
});

render();
requestAnimationFrame(animate);
