# Architecture walkthrough

This project separates content, appearance, behavior, rendering, and server work. That separation is the main habit worth carrying into a version you rebuild yourself.

## 1. Request flow

```text
Browser
  |-- index.html                 semantic structure
  |-- assets/css/*              appearance and animation
  |-- assets/js/main.js         application state and navigation
  |    |-- content.js           editable words and project data
  |    |-- portfolio.js         timeline and project UI
  |    |-- contact.js           form submission
  |    `-- cube-scene.js        Three.js renderer and input
  |          `-- scene-config.js editable 3D parameters
  `-- POST /api/contact ------- separate Node server
```

The frontend is still useful if the API is offline: everything renders and the email link remains available.

## 2. HTML: meaning before visuals

`index.html` contains one section per view. JavaScript changes which section has `hidden` removed. Buttons remain real buttons, navigation has a label, the form has labels, and the 3D canvas is decorative to screen readers. This makes the experience usable even though it looks unconventional.

Useful attributes such as `data-route`, `data-bind`, and `data-project-grid` connect HTML to JavaScript without styling classes doing two jobs.

## 3. CSS: layers

- `tokens.css` defines reusable colors, fonts, and easing curves. Theme changes happen here.
- `base.css` normalizes the page and contains accessibility helpers.
- `animations.css` owns named keyframes and reduced-motion behavior.
- `main.css` lays out the actual components and responsive states.

Change a token when you want a site-wide decision; change a component rule when you want one local decision.

## 4. JavaScript: state and controllers

`main.js` is the coordinator. It reads the URL hash, switches views, starts transitions, applies the theme, and tells the 3D scene which presentation to use. It does not build project cards or contain WebGL math.

`portfolio.js` turns project data into the year timeline and detail page. Because the content is data-driven, adding a project does not require copying HTML.

`contact.js` owns only form validation feedback and the API request.

`cube-scene.js` owns Three.js objects and input. Dragging maps the pointer to a virtual trackball. The rotation between two trackball vectors becomes a quaternion, avoiding Euler-axis flips. Presentation states change position, scale, alignment, clamps, and whether the cube may be dragged.

## 5. Editable configuration

`content.js` is the lightweight content system. Start here for normal portfolio edits.

`scene-config.js` is the 3D control panel:

- `renderer`: resolution cap and exposure
- `camera`: field of view and camera position
- `cube.material`: color, transmission, opacity, IOR, thickness, dispersion, and surface response
- `lights`: ambient and spotlight settings
- `motion`: automatic rotation, inertia, and idle return timing
- `themes`: WebGL colors matching the CSS themes
- `SCENE_PRESENTATIONS`: cube position, scale, alignment, interactivity, and clamps per page

Three.js positions are `[x, y, z]`: X is left/right, Y is down/up, and Z is away/toward the camera.

## 6. Backend boundary

The browser sends JSON to `POST /api/contact`. The Node server:

1. verifies the browser origin and content type;
2. limits payload size and request frequency;
3. validates and normalizes the fields;
4. silently discards honeypot submissions;
5. saves an ID, timestamp, name, email, and message to an NDJSON file.

Each backend concern has a small module. For a real production service, the storage module is the seam you would replace with a database or email provider.

## 7. Hosting boundary

GitHub Pages serves files but cannot execute Node.js. The Pages action therefore builds a static `dist` directory containing only the public frontend. The server has its own Dockerfile so it can be deployed independently and connected by an HTTPS URL in `content.js`.

This frontend/backend split is common in real projects: each part can be deployed, secured, and scaled independently.
