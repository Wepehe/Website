export class PortfolioController {
  constructor({ projects, onOpenProject }) {
    this.projects = projects;
    this.onOpenProject = onOpenProject;
    this.years = [...new Set(projects.map((project) => project.year))].sort((a, b) => b - a);
    this.yearIndex = 0;

    this.yearCube = document.querySelector('[data-year-cube]');
    this.projectGrid = document.querySelector('[data-project-grid]');
    this.traces = document.querySelector('[data-timeline-traces]');
    this.detail = document.querySelector('[data-project-detail]');

    document.querySelector('[data-year-previous]')?.addEventListener('click', () => this.changeYear(-1));
    document.querySelector('[data-year-next]')?.addEventListener('click', () => this.changeYear(1));
    this.renderYear();
  }

  changeYear(direction) {
    if (this.years.length < 2) return;
    this.yearIndex = (this.yearIndex + direction + this.years.length) % this.years.length;
    this.yearCube.classList.remove('is-flipping');
    void this.yearCube.offsetWidth;
    this.yearCube.classList.add('is-flipping');
    window.setTimeout(() => this.renderYear(), 240);
  }

  renderYear() {
    const year = this.years[this.yearIndex];
    const projects = this.projects.filter((project) => project.year === year);
    this.yearCube.textContent = year ?? '—';
    this.projectGrid.replaceChildren(...projects.map((project) => this.createProjectNode(project)));
    this.renderTraces(projects);
  }

  createProjectNode(project) {
    const button = document.createElement('button');
    button.className = 'project-node';
    button.type = 'button';
    button.style.setProperty('--project-color', project.color);
    button.setAttribute('aria-label', `Open ${project.title}`);

    const cube = document.createElement('span');
    cube.className = 'mini-cube';
    cube.setAttribute('aria-hidden', 'true');

    const meta = document.createElement('span');
    meta.className = 'project-node__meta';
    const title = document.createElement('strong');
    title.textContent = project.title;
    const term = document.createElement('span');
    term.textContent = `${project.term} / ${project.year}`;
    meta.append(title, term);
    button.append(cube, meta);

    let pointerId = null;
    let moved = false;
    let startX = 0;
    let startY = 0;
    let rotationX = -18;
    let rotationY = 28;

    button.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;
      pointerId = event.pointerId;
      moved = false;
      startX = event.clientX;
      startY = event.clientY;
      button.setPointerCapture(pointerId);
      button.classList.add('is-spinning');
    });

    button.addEventListener('pointermove', (event) => {
      if (event.pointerId !== pointerId) return;
      const deltaX = event.clientX - startX;
      const deltaY = event.clientY - startY;
      if (Math.hypot(deltaX, deltaY) > 5) moved = true;
      if (!moved) return;
      rotationY += deltaX * 0.45;
      rotationX -= deltaY * 0.45;
      cube.style.setProperty('--rx', `${rotationX}deg`);
      cube.style.setProperty('--ry', `${rotationY}deg`);
      startX = event.clientX;
      startY = event.clientY;
    });

    const release = (event) => {
      if (event.pointerId !== pointerId) return;
      if (button.hasPointerCapture(pointerId)) button.releasePointerCapture(pointerId);
      pointerId = null;
      button.classList.remove('is-spinning');
    };
    button.addEventListener('pointerup', release);
    button.addEventListener('pointercancel', release);
    button.addEventListener('click', (event) => {
      if (moved) {
        event.preventDefault();
        moved = false;
        return;
      }
      this.onOpenProject(project.id);
    });

    return button;
  }

  renderTraces(projects) {
    this.traces.replaceChildren();
    const namespace = 'http://www.w3.org/2000/svg';
    projects.forEach((project, index) => {
      const path = document.createElementNS(namespace, 'path');
      const y = 28 + index * 24;
      path.setAttribute('d', `M 2 ${y} C 24 ${y - 24}, 42 ${y + 30}, 64 ${y} S 86 ${y - 22}, 98 ${y + 4}`);
      path.setAttribute('stroke', project.color);
      path.setAttribute('vector-effect', 'non-scaling-stroke');
      this.traces.append(path);
    });
    this.traces.setAttribute('viewBox', '0 0 100 100');
    this.traces.setAttribute('preserveAspectRatio', 'none');
  }

  showProject(id) {
    const project = this.projects.find((candidate) => candidate.id === id);
    if (!project) return null;

    this.detail.style.setProperty('--project-color', project.color);
    this.detail.querySelector('[data-project-meta]').textContent = `${project.term} / ${project.year}`;
    this.detail.querySelector('[data-project-title]').textContent = project.title;
    this.detail.querySelector('[data-project-summary]').textContent = project.summary;
    this.detail.querySelector('[data-project-description]').textContent = project.description;

    const tags = this.detail.querySelector('[data-project-tags]');
    tags.replaceChildren(...project.tags.map((tag) => {
      const item = document.createElement('li');
      item.textContent = tag;
      return item;
    }));

    const link = this.detail.querySelector('[data-project-link]');
    link.hidden = !project.url;
    if (project.url) {
      link.href = project.url;
      link.target = '_blank';
      link.rel = 'noreferrer';
    } else {
      link.removeAttribute('href');
    }

    return project;
  }
}
