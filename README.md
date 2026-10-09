# Cube of Time portfolio

An interactive, non-scrolling portfolio built around a quaternion-controlled Three.js cube. The public frontend is static and deploys to GitHub Pages; the contact form uses a small, separate Node.js API.

## Start locally

### Node.js (available now)

```powershell
npm run dev:all
```

Open `http://localhost:8080`. Changes inside `index.html` or `assets/` reload the browser. The contact API runs at `http://localhost:8787` and restarts when backend files change.

### Docker (after installing Docker Desktop)

```powershell
docker compose up --build
```

The same two services run on ports `8080` and `8787`. Contact submissions are stored in the `contact-data` Docker volume. Stop with `Ctrl+C`, then run `docker compose down` if you want to remove the stopped containers.

## Where to make changes

| Goal | File |
| --- | --- |
| Name, biography, email, resume, projects | `assets/js/content.js` |
| Cube size, glass, light, speed, and positions | `assets/js/scene-config.js` |
| Page structure and accessible text | `index.html` |
| Layout and component appearance | `assets/css/main.css` |
| Dark/light colors and fonts | `assets/css/tokens.css` |
| Motion keyframes | `assets/css/animations.css` |
| 3D rendering and quaternion interaction | `assets/js/cube-scene.js` |
| Navigation and page transitions | `assets/js/main.js` |
| Portfolio timeline behavior | `assets/js/portfolio.js` |
| Contact form browser behavior | `assets/js/contact.js` |
| Contact API behavior | `server/src/` |

Read [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for a guided tour of the finished code. Use [`docs/BUILD_FROM_SCRATCH.md`](docs/BUILD_FROM_SCRATCH.md) as a milestone-by-milestone curriculum with a terminal-based ChatGPT tutor.

## Personalize it

1. Replace the placeholder values in `assets/js/content.js`.
2. Put your PDF at `assets/resume.pdf` and set `links.resume` to `'./assets/resume.pdf'`.
3. Add project objects using a unique lowercase `id`; the timeline and detail pages are generated automatically.
4. Tune the 3D presentation states in `assets/js/scene-config.js`.
5. Preview locally before pushing.

## Contact backend

The API validates input, limits request size, rate-limits by IP, checks allowed origins, uses a bot honeypot, and appends accepted messages as newline-delimited JSON. Local messages go to `server/data/contact-submissions.ndjson`; this file is ignored by Git.

GitHub Pages cannot run server code. For production, deploy `server/Dockerfile` to a container-capable host with persistent storage, set its `ALLOWED_ORIGINS` environment variable to your Pages/custom domain, and put its HTTPS address in `CONTENT.contact.productionApiUrl`. Until then, the direct email link works but the hosted form explains that the API is not configured.

## Deployment

Pushes to `main` run `.github/workflows/deploy.yml`. The workflow publishes only `index.html`, `.nojekyll`, and `assets/`; development and backend files are intentionally excluded.

```powershell
git add .
git commit -m "Build interactive portfolio"
git push origin main
```

The current repository publishes at `https://wepehe.github.io/Website/` once the Pages workflow succeeds.

The earlier glass-room version is recoverable from Git history and the tag `interaction-checkpoint-2026-10-07`; its retired working files are also kept locally under `.cache/retired/`.
