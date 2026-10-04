# Northstar website starter

A responsive, interactive, framework-free website ready for GitHub Pages.

## Customize

- Update the site name, copy, links, and email in `index.html`.
- Change the design tokens at the top of `styles.css`.
- Adjust interactions and accent colors in `script.js`.

## Preview locally

You can open `index.html` directly, or serve the folder with any static server. For example:

```powershell
npx --yes serve .
```

## Publish on GitHub Pages

1. Create a new GitHub repository. Name it `<your-username>.github.io` for a root user site, or use any repository name for a project site.
2. Push this project to the repository's `main` branch.
3. In the repository, open **Settings → Pages** and set **Source** to **GitHub Actions**.
4. The included workflow will deploy the site after every push to `main`.

Your address will be:

- `https://<your-username>.github.io/` for a repository named `<your-username>.github.io`
- `https://<your-username>.github.io/<repository-name>/` for any other repository
