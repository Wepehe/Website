import { CONTENT } from './content.js';
import { ContactController } from './contact.js';
import { CubeScene } from './cube-scene.js';
import { PortfolioController } from './portfolio.js';

const VALID_VIEWS = new Set(['landing', 'menu', 'about', 'portfolio', 'contact', 'project']);
const app = document.querySelector('.app');
const panels = [...document.querySelectorAll('[data-view-panel]')];
const note = document.querySelector('[data-interaction-note]');
let currentView = 'landing';
let transitionTimer = 0;

function bindContent() {
  const values = {
    name: CONTENT.identity.name,
    shortName: CONTENT.identity.shortName,
    year: new Date().getFullYear(),
    aboutHeading: CONTENT.about.heading,
    aboutIntro: CONTENT.about.intro,
    aboutBody: CONTENT.about.body,
    contactIntro: CONTENT.contact.intro,
  };

  Object.entries(values).forEach(([key, value]) => {
    document.querySelectorAll(`[data-bind="${key}"]`).forEach((element) => {
      element.textContent = value;
    });
  });

  const skillList = document.querySelector('[data-skills]');
  skillList.replaceChildren(...CONTENT.about.skills.map((skill) => {
    const item = document.createElement('li');
    item.textContent = skill;
    return item;
  }));

  const emailLink = document.querySelector('[data-email-link]');
  emailLink.textContent = CONTENT.contact.email;
  emailLink.href = `mailto:${CONTENT.contact.email}`;

  const resumeLink = document.querySelector('[data-resume-link]');
  if (CONTENT.links.resume) {
    resumeLink.hidden = false;
    resumeLink.href = CONTENT.links.resume;
    resumeLink.target = '_blank';
    resumeLink.rel = 'noreferrer';
  }
}

function routeFromHash() {
  const route = window.location.hash.replace(/^#\/?/, '');
  if (!route) return { view: 'landing' };
  if (route.startsWith('project/')) return { view: 'project', projectId: route.slice(8) };
  return { view: VALID_VIEWS.has(route) ? route : 'landing' };
}

function updateNavigation(view) {
  document.querySelectorAll('[data-route]').forEach((link) => {
    const active = link.dataset.route === view;
    if (active) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
}

function noteFor(view) {
  return {
    landing: 'Drag the cube / press to enter',
    menu: 'Spin the cube / select a face',
    about: 'Cube projector / drag to rotate',
    portfolio: 'Drag a project cube / press to open',
    contact: 'Cube projector / send a message',
    project: 'Project cube is locked in timeline view',
  }[view];
}

function showView(view, projectId, immediate = false) {
  if (!VALID_VIEWS.has(view)) view = 'landing';
  if (view === 'project' && !portfolio.showProject(projectId)) view = 'portfolio';

  window.clearTimeout(transitionTimer);
  const swap = () => {
    currentView = view;
    app.dataset.view = view;
    panels.forEach((panel) => {
      const active = panel.dataset.viewPanel === view;
      panel.hidden = !active;
      panel.classList.toggle('is-active', active);
    });
    cubeScene.setPresentation(view);
    updateNavigation(view === 'project' ? 'portfolio' : view);
    note.textContent = noteFor(view);
    app.classList.remove('is-transitioning');
    app.classList.add('is-revealing');
    window.setTimeout(() => app.classList.remove('is-revealing'), 480);
  };

  if (immediate || currentView === view) {
    swap();
    return;
  }

  app.classList.add('is-transitioning');
  transitionTimer = window.setTimeout(swap, 390);
}

function navigate(route) {
  const hash = route === 'landing' ? '' : `#/${route}`;
  if (`${window.location.pathname}${window.location.search}${hash}` === `${window.location.pathname}${window.location.search}${window.location.hash}`) {
    const parsed = routeFromHash();
    showView(parsed.view, parsed.projectId);
  } else {
    window.location.hash = hash;
  }
}

function cubeActivated(face) {
  if (currentView === 'landing') {
    navigate('menu');
    return;
  }
  if (face === 'about' || face === 'portfolio' || face === 'contact') navigate(face);
  else if (currentView !== 'menu') navigate('menu');
}

function initialiseTheme() {
  const savedTheme = localStorage.getItem('portfolio-theme');
  const theme = savedTheme === 'light' || savedTheme === 'dark' ? savedTheme : 'dark';
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]').content = theme === 'dark' ? '#030409' : '#f4fbfc';
  return theme;
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]').content = theme === 'dark' ? '#030409' : '#f4fbfc';
  const toggle = document.querySelector('[data-theme-toggle]');
  toggle.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`);
  cubeScene?.setTheme(theme);
}

bindContent();
const initialTheme = initialiseTheme();

const portfolio = new PortfolioController({
  projects: CONTENT.projects,
  onOpenProject: (id) => navigate(`project/${id}`),
});
new ContactController();

await document.fonts.ready;
const cubeScene = new CubeScene({
  root: document.querySelector('#scene-root'),
  identity: CONTENT.identity,
  onActivate: cubeActivated,
});
applyTheme(initialTheme);

document.addEventListener('click', (event) => {
  const enter = event.target.closest('[data-action="enter"]');
  if (enter) navigate('menu');
  const routeLink = event.target.closest('[data-route]');
  if (routeLink) navigate(routeLink.dataset.route);
});

document.querySelector('[data-theme-toggle]').addEventListener('click', () => {
  const nextTheme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  localStorage.setItem('portfolio-theme', nextTheme);
  applyTheme(nextTheme);
});

window.addEventListener('hashchange', () => {
  const route = routeFromHash();
  showView(route.view, route.projectId);
});

window.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  navigate(currentView === 'project' ? 'portfolio' : 'menu');
});

const initialRoute = routeFromHash();
showView(initialRoute.view, initialRoute.projectId, true);
