// Replace the placeholder copy here with your real biography, links, and work.
export const CONTENT = {
  identity: {
    name: 'WEPEHE',
    shortName: 'WP',
    role: 'Creative developer & systems thinker',
    location: 'Toronto, Canada',
    insideJokes: ['SHIP IT', 'ONE MORE CUBE', 'IT WORKS LOCALLY'],
  },

  about: {
    heading: 'I turn systems into experiences.',
    intro: 'I design and build digital work where motion, interaction, and structure are part of the story—not decoration added at the end.',
    body: 'This is starter copy. Replace it with the path that brought you here, the problems you enjoy solving, and the kind of collaborators you want to meet.',
    skills: ['Creative coding', '3D interaction', 'Web design', 'Prototyping', 'Systems thinking'],
  },

  contact: {
    intro: 'Have a project, experiment, or strange idea? Send a note through the form or reach out directly.',
    email: 'your@email.com',
    // Leave blank until your separately hosted API is deployed. Localhost is detected automatically.
    productionApiUrl: '',
  },

  links: {
    github: 'https://github.com/Wepehe',
    // Upload your PDF to assets/resume.pdf, then set this to './assets/resume.pdf'.
    resume: '',
  },

  projects: [
    {
      id: 'cube-of-time',
      title: 'Cube of Time',
      year: 2026,
      term: 'Winter',
      color: '#72f6ff',
      summary: 'An explorable archive where time is navigated as physical space.',
      description: 'A concept project for organizing years, terms, and individual work as connected cubes. Replace this text with the project problem, your process, decisions, and outcome.',
      tags: ['Three.js', 'Interaction', 'Information design'],
      url: '',
    },
    {
      id: 'signal-garden',
      title: 'Signal Garden',
      year: 2026,
      term: 'Fall',
      color: '#986cff',
      summary: 'A generative interface that turns live data into a growing visual system.',
      description: 'Use this project slot for a piece that shows technical depth. Explain the constraints, your role, the system architecture, and what you learned.',
      tags: ['Generative art', 'Data', 'Frontend'],
      url: '',
    },
    {
      id: 'afterimage-index',
      title: 'Afterimage Index',
      year: 2025,
      term: 'Spring',
      color: '#4f7cff',
      summary: 'A spatial collection of images, notes, and half-remembered connections.',
      description: 'Use this project slot for work that communicates your visual taste. Add images later and link to a case study or live build.',
      tags: ['Art direction', 'Archive', 'Motion'],
      url: '',
    },
    {
      id: 'parallel-play',
      title: 'Parallel Play',
      year: 2025,
      term: 'Fall',
      color: '#ff5fd2',
      summary: 'A collaborative space built around quiet presence instead of constant messaging.',
      description: 'Project descriptions live in one data file so the rendering code stays reusable. Duplicate this object to add more work.',
      tags: ['Product design', 'Realtime', 'Research'],
      url: '',
    },
  ],
};

export function getContactApiUrl() {
  if (['localhost', '127.0.0.1'].includes(window.location.hostname)) {
    return 'http://localhost:8787';
  }

  return CONTENT.contact.productionApiUrl.replace(/\/$/, '');
}
