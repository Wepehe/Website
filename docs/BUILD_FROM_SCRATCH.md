# Build this portfolio from scratch with ChatGPT Terminal

This is a learning plan, not a request to generate the finished site in one pass. Its purpose is to help you rebuild the portfolio yourself while a terminal-based ChatGPT acts as a tutor, reviewer, and debugging partner.

The finished `v0.1` tag is the reference implementation. Do your learning build in a new repository or branch so you can compare decisions without copying the answer accidentally.

## The tutor contract

Paste the prompt at the end of this document into a new ChatGPT terminal session. Ask it to follow these rules:

1. Work through one milestone at a time and wait for you after each checkpoint.
2. Explain the browser, JavaScript, math, rendering, or server concept before editing code.
3. Let you write the important part first when the lesson is about a new concept.
4. Review what you wrote, identify the exact failure, and give the smallest useful correction.
5. Never replace working interaction code without saving a Git checkpoint.
6. Keep content, configuration, styles, UI behavior, 3D rendering, and backend logic separate.
7. Test each milestone in the browser and from the terminal before moving forward.
8. Keep GitHub Pages static; deploy the backend as a separate HTTPS service.

## Target architecture

```text
portfolio/
|-- index.html                     semantic application shell
|-- assets/
|   |-- css/
|   |   |-- tokens.css             colors, fonts, spacing, easing
|   |   |-- base.css               reset and accessibility helpers
|   |   |-- animations.css         reusable keyframes/reduced motion
|   |   `-- main.css               layouts and components
|   `-- js/
|       |-- content.js             biography, links, and project data
|       |-- scene-config.js        camera, materials, lights, motion
|       |-- cube-scene.js          Three.js scene and quaternion input
|       |-- portfolio.js           years, projects, and mini-cubes
|       |-- contact.js             browser-side form controller
|       `-- main.js                routing, views, theme, coordination
|-- server/
|   |-- src/
|   |   |-- config.js              environment configuration
|   |   |-- validation.js          input normalization and rules
|   |   |-- rate-limiter.js        abuse control
|   |   |-- contact-store.js       replaceable persistence adapter
|   |   `-- server.js              HTTP routes, CORS, security headers
|   `-- Dockerfile
|-- docs/                           architecture and operation notes
|-- compose.yaml                    frontend + API for local development
|-- dev-server.js                   static server with live reload
|-- package.json
`-- .github/workflows/deploy.yml    static GitHub Pages deployment
```

The dependency direction should stay simple:

```text
index.html -> main.js
                 |-> content.js
                 |-> portfolio.js
                 |-> contact.js -> HTTPS contact API
                 `-> cube-scene.js -> scene-config.js -> Three.js
```

The rendering module must not know your biography. The contact server must not know how the form looks. The content file must not manipulate the DOM.

## Milestone 0: decisions and repository

Learn: the difference between a static frontend, a browser application, and a server.

- Create a new repository and a `main` branch.
- Add `.gitignore`, `.nojekyll`, `README.md`, and the target folders.
- Decide the public name, role, email, résumé path, project categories, and default theme.
- Decide that URL hashes represent views: `#/about`, `#/portfolio`, `#/contact`, and `#/project/id`.
- Make the first commit: `chore: create project structure`.

Checkpoint: every directory has a stated responsibility and no secret exists in frontend code.

## Milestone 1: semantic single-page shell

Learn: landmarks, sections, buttons versus links, labels, focus, and `hidden`.

- Write `index.html` with a header, navigation, one `<main>`, and one section per view.
- Add a skip link, accessible form labels, status region, and a useful `<noscript>` message.
- Use `data-*` attributes for JavaScript hooks and classes only for styling.
- Switch views with plain JavaScript before adding animation or WebGL.

Checkpoint: keyboard navigation works and every route can be opened directly by its hash.

## Milestone 2: visual system and fixed layout

Learn: CSS custom properties, stacking contexts, responsive constraints, and internal scrolling.

- Put the black/blue/purple palette and the white/cyan light palette in `tokens.css`.
- Keep the document at one viewport with `overflow: hidden`.
- Allow long content to scroll inside its panel, not the whole page.
- Build the top-right navigation, typography, line work, and responsive breakpoints.
- Add `prefers-reduced-motion` handling before writing animations.

Checkpoint: all content remains usable at 390x844 and 1440x900 without WebGL.

## Milestone 3: Three.js rendering foundation

Learn: scene graph, camera projection, renderer, geometry, material, light, and the render loop.

- Import a pinned Three.js version with an import map.
- Create one `WebGLRenderer`, one `Scene`, and one `PerspectiveCamera`.
- cap pixel ratio so high-density screens do not multiply rendering cost excessively.
- Set sRGB output, ACES filmic tone mapping, exposure, and responsive canvas sizing.
- Add a cube group rather than rotating unrelated meshes individually.
- Dispose geometries, materials, textures, observers, and animation loops if the scene is destroyed.

Checkpoint: a normally lit cube renders at the correct aspect ratio after resizing.

## Milestone 4: physical glass and light dynamics

Learn: direct versus ambient light, surface reflection, transmission, refraction, and tone mapping.

- Start with `MeshStandardMaterial`; move to `MeshPhysicalMaterial` only after the light is understandable.
- Experiment with `roughness`, `metalness`, `transmission`, `opacity`, `thickness`, `ior`, `attenuationColor`, `attenuationDistance`, `clearcoat`, and `specularIntensity` one value at a time.
- Use a narrow spotlight for direction and a very dim ambient light for readable shadows.
- Give transparent material something to refract: room geometry, line art, or a subtle environment.
- Treat transparency as an ordering/performance feature too: compare `depthWrite` on and off.
- If adding shadows, enable renderer shadow maps and configure both the light and receiving meshes.

Checkpoint: moving the light visibly changes the highlight, interior tint, transmitted background, and shadow. Explain why each material value contributes before tuning aesthetics.

## Milestone 5: quaternion arcball interaction

Learn: vectors, normalized device coordinates, raycasting, quaternions, inertia, and frame-rate-independent damping.

Build the interaction in this order:

1. Project the pointer onto a virtual sphere centered on the cube's projected screen position.
2. Save the cube quaternion and starting sphere vector on `pointerdown`.
3. Use `Quaternion.setFromUnitVectors(start, current)` during the drag.
4. Multiply by the saved starting quaternion and normalize the result.
5. Calculate a recent angular axis/speed for momentum.
6. Capture the pointer so dragging continues outside the cube.
7. Distinguish a click from a drag with a small distance threshold.
8. After ten idle seconds, slerp back to the presentation quaternion and resume slow rotation.
9. Raycast clicks against the cube and choose a route from the hit face's local normal.

Never mix Euler updates into the active drag. Euler angles are acceptable for creating a target orientation, but the live orientation should remain a quaternion.

Checkpoint: grabbing any visible face makes that face follow the pointer instead of appearing to pull the rear of the cube.

## Milestone 6: scene presentations and transitions

Learn: application state, finite presentations, easing, and coordinating DOM/WebGL motion.

- Define configuration objects for `landing`, `menu`, `about`, `portfolio`, `contact`, and `project`.
- Each state owns cube position, scale, target orientation, interactivity, projector visibility, and clamp visibility.
- Make navigation update the URL, active DOM section, navigation state, interaction hint, and scene presentation in one controlled function.
- Animate into the cube, cover the view during the swap, then reveal the destination.
- Lock cube dragging on the project detail view while keeping it available elsewhere.

Checkpoint: browser back/forward works and rapid route changes never leave two panels interactive.

## Milestone 7: data-driven portfolio

Learn: separating data from rendering and creating safe DOM nodes.

- Store projects as objects containing `id`, `title`, `year`, `term`, `color`, `summary`, `description`, `tags`, and `url`.
- Derive years from the data instead of hard-coding year buttons.
- Render project nodes with `textContent`, not HTML strings.
- Give mini-cubes their own pointer rotation and suppress click navigation after a drag.
- Generate colored SVG paths behind the projects.
- Render one reusable project-detail view from the selected object.

Checkpoint: adding one project object creates its timeline node and detail route without editing HTML.

## Milestone 8: personal stylization

Before styling, answer these questions with the tutor:

- Which three adjectives should the site communicate?
- Which work deserves attention first?
- What private jokes belong on secondary cube faces without confusing navigation?
- Should the visual density feel like a gallery, instrument panel, game, or archive?
- Which motion expresses meaning, and which motion is only decoration?
- What does the light theme preserve besides inverted colors?
- What should remain readable if WebGL fails?

Create tokens and configuration from the answers. Avoid scattering one-off colors and magic numbers through rendering code.

Checkpoint: someone can identify the intended personality without being told which references inspired it.

## Milestone 9: contact backend

Learn: trust boundaries, HTTP, validation, CORS, storage, secrets, and abuse controls.

Implement:

- `GET /api/health`
- `POST /api/contact` accepting JSON only
- a 16 KB request limit
- normalized name, email, and message validation
- an invisible honeypot field
- IP rate limiting with retry information
- an exact production/local origin allowlist
- security and no-cache headers
- generated submission IDs and server timestamps
- an interchangeable storage module

NDJSON is adequate for learning and local Docker. For production, replace the storage adapter with a managed database or transactional email service. Put provider credentials only in server environment variables. Never commit submissions or secrets.

Checkpoint: test health, malformed JSON, invalid fields, blocked origins, honeypot behavior, rate limiting, successful storage, and server failure feedback.

## Milestone 10: local development and containers

Learn: processes, ports, volumes, bind mounts, and environment variables.

- Run the frontend on `127.0.0.1:8080` with live reload.
- Run the API on `127.0.0.1:8787` with restart-on-change.
- Add separate frontend and backend Dockerfiles or clearly scoped stages.
- Use Compose to start both services and a named volume for contact data.
- Mount source read-only where practical.
- Bind development ports to loopback rather than every network interface.

Checkpoint: editing frontend code reloads the page, the form reaches the API, and restarting containers preserves contact data.

## Milestone 11: testing and accessibility

Test at minimum:

- JavaScript syntax for every module
- every direct URL route
- navigation, theme persistence, year switching, project opening, and Escape behavior
- drag, click, inertia, idle return, and raycasted faces
- mouse, touch-sized viewport, keyboard, and reduced motion
- WebGL failure messaging
- backend validation, CORS, limits, and persistence
- no horizontal overflow and no unreachable form controls
- browser console free of errors

Use real browser screenshots as regression references, but also interact with the page; screenshots do not test behavior.

## Milestone 12: deployment

Learn: build artifacts and the frontend/backend hosting boundary.

- Make the GitHub Actions workflow copy only `index.html`, `.nojekyll`, and public assets to `dist`.
- Deploy `dist` to GitHub Pages on pushes to `main`.
- Deploy the API container to a separate host with HTTPS and persistent storage.
- Set `ALLOWED_ORIGINS` to the exact Pages/custom-domain origins.
- Set the frontend's production API URL to the deployed service.
- Verify the public HTML contains the intended build and that the contact request succeeds from the public origin.
- Create a version tag only after the build and deployment checks pass.

Checkpoint: the Pages artifact contains no server source, submissions, development cache, or secrets.

## Definition of done

- The page is non-scrolling; intended panels handle their own overflow.
- Cube interaction uses quaternions and remains centered on the cube in every presentation.
- Lighting and physical material values have visible, explainable effects.
- Every cube face, button, and direct URL reaches the expected view.
- Content can be personalized without editing rendering code.
- Reduced-motion and keyboard users can access the same information.
- Contact data is validated and stored only by the backend.
- The frontend and API can run together locally but deploy independently.
- The README explains editing, operation, deployment, and recovery.
- A clean Git checkpoint exists for every stable milestone.

## Ready-to-paste ChatGPT Terminal prompt

```text
Act as my senior web-development tutor while I build an interactive 3D portfolio from scratch. Do not generate the entire finished project at once.

Use docs/BUILD_FROM_SCRATCH.md as the curriculum and docs/ARCHITECTURE.md only as a conceptual reference. Work through exactly one milestone at a time. At the start of each milestone:
1. explain the concepts and the purpose of every file we will touch;
2. inspect my current files and preserve my work;
3. give me one small coding task to attempt;
4. review my attempt with concrete evidence;
5. implement only corrections or pieces I explicitly ask you to implement;
6. run proportionate tests and explain their output;
7. summarize what I learned and propose a Git checkpoint;
8. wait for me before beginning the next milestone.

Requirements for the final system: semantic accessible HTML; a non-scrolling single-page interface; dark black/blue/purple and light white/cyan themes; content-driven About, Portfolio, Contact, and project views; Three.js physical rendering; dynamic spotlight and ambient lighting; quaternion arcball dragging, momentum, raycasting, auto-rotation, and idle return; responsive and reduced-motion behavior; a validated/rate-limited/CORS-restricted Node contact API; local Docker Compose; static GitHub Pages frontend deployment; and separately deployable HTTPS backend.

Teach the reasoning and math, not just syntax. Keep content, configuration, CSS, UI controllers, Three.js rendering, and server concerns separate. Never put secrets in browser code. Never delete or rewrite a working interaction without making a recoverable Git checkpoint first.

Begin with Milestone 0. First inspect the repository, explain static frontend versus backend hosting, and ask me the personal content/style questions required to define the project. Do not create files until I answer.
```
