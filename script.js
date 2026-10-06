const cubeControl = document.querySelector('.cube-control');
const interactionNote = document.querySelector('.interaction-note');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

document.querySelector('#year').textContent = new Date().getFullYear();

if (reduceMotion) {
  cubeControl.setAttribute('aria-label', 'Decorative three-dimensional cube');
  cubeControl.disabled = true;
} else {
  cubeControl.addEventListener('click', () => {
    const isPaused = cubeControl.classList.toggle('is-paused');
    cubeControl.setAttribute('aria-pressed', String(isPaused));
    cubeControl.setAttribute('aria-label', `${isPaused ? 'Resume' : 'Pause'} cube rotation`);
    interactionNote.textContent = isPaused ? 'Click the cube to resume' : 'Click the cube to pause';
  });
}
