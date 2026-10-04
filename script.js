const root = document.documentElement;
const themeButton = document.querySelector('.theme-toggle');
const themeLabel = document.querySelector('.theme-label');
const metaTheme = document.querySelector('meta[name="theme-color"]');
const navToggle = document.querySelector('.nav-toggle');
const nav = document.querySelector('.site-nav');
const dial = document.querySelector('.dial');
const dialNumber = document.querySelector('.dial-number');

const accentColors = ['#ff4d23', '#9f7aea', '#16c79a', '#ffcc33'];
let accentIndex = 0;

function setTheme(theme) {
  const isDark = theme === 'dark';
  root.dataset.theme = theme;
  themeLabel.textContent = isDark ? 'Light' : 'Dark';
  themeButton.setAttribute('aria-label', `Switch to ${isDark ? 'light' : 'dark'} theme`);
  metaTheme.setAttribute('content', isDark ? '#151515' : '#f4f0e7');
  localStorage.setItem('northstar-theme', theme);
}

const savedTheme = localStorage.getItem('northstar-theme');
const preferredTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
setTheme(savedTheme || preferredTheme);

themeButton.addEventListener('click', () => {
  setTheme(root.dataset.theme === 'dark' ? 'light' : 'dark');
});

navToggle.addEventListener('click', () => {
  const isOpen = navToggle.getAttribute('aria-expanded') === 'true';
  navToggle.setAttribute('aria-expanded', String(!isOpen));
  navToggle.querySelector('.sr-only').textContent = isOpen ? 'Open navigation' : 'Close navigation';
  nav.classList.toggle('is-open', !isOpen);
});

nav.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    navToggle.setAttribute('aria-expanded', 'false');
    navToggle.querySelector('.sr-only').textContent = 'Open navigation';
    nav.classList.remove('is-open');
  });
});

dial.addEventListener('click', () => {
  accentIndex = (accentIndex + 1) % accentColors.length;
  root.style.setProperty('--accent', accentColors[accentIndex]);
  dialNumber.textContent = String(accentIndex + 1).padStart(2, '0');
});

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.14 }
);

document.querySelectorAll('.reveal').forEach((element) => observer.observe(element));
document.querySelector('#current-year').textContent = new Date().getFullYear();
