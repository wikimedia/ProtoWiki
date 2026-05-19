---
name: protowiki-deploy
description: How to build and deploy ProtoWiki to GitHub Pages — npm run build, the GitHub Pages base path config, the index.html → 404.html SPA fallback, and the GitHub Actions workflow. Use when asked to "deploy", "publish", "ship to GitHub Pages", set up a custom domain, or fix a base-path / 404 issue.
license: MIT
---

# Deploy ProtoWiki to GitHub Pages

ProtoWiki is a static SPA. It builds to `dist/` and deploys via GitHub
Pages with a tiny SPA-routing trick.

## Local build

```bash
npm run build      # produces dist/
npm run preview    # serves dist/ at http://localhost:4173
```

The build:

1. Runs Vite with `base: '/protowiki/'` (configurable — see below).
2. Code-splits per route (each prototype gets its own JS chunk).
3. **Copies `dist/index.html` to `dist/404.html`** so GitHub Pages serves
   the SPA shell for any unknown path. Vue Router then matches the path
   client-side. This is the SPA-on-Pages fallback pattern.

## Base path

Vite's `base` decides the prefix for asset URLs and the router base.
Defaults to `/protowiki/` (the repo name). Override via env var:

```bash
PROTOWIKI_BASE='/my-fork-name/' npm run build
PROTOWIKI_BASE='/' npm run build           # custom domain at root
```

## GitHub Actions workflow

`.github/workflows/deploy.yml` triggers on push to `main`:

1. Checks out the repo.
2. Sets up Node and runs `npm ci`.
3. Runs `npm run build`.
4. Uploads `dist/` as a Pages artifact.
5. Publishes via the official `actions/deploy-pages@v4`.

The first time you enable Pages on the repo, set Source to "GitHub
Actions" in **Settings → Pages**. The workflow handles the rest.

## Custom domain

If you point a custom domain (e.g., `protowiki.example.org`) at Pages:

1. Set `PROTOWIKI_BASE='/'` (or whatever path the domain serves).
2. Add a `CNAME` file at `public/CNAME` containing the domain.
3. Configure DNS as documented at
   <https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site>.

## Sharing a single prototype

Once deployed:

```
https://<org>.github.io/protowiki/                   ← gallery
https://<org>.github.io/protowiki/template-chrome            ← chrome template prototype
https://<org>.github.io/protowiki/template-chrome?theme=dark ← forced dark
https://<org>.github.io/protowiki/template-chrome?skin=mobile ← forced mobile
```

The `?skin=` and `?theme=` URL params are handled at boot — paste them
into review tickets to pin a specific preview.

## Troubleshooting

- **404 on a deep link.** The `404.html` copy step in `vite.config.ts`
  must run; verify `dist/404.html` exists after build.
- **Asset URLs missing the base path.** Check `import.meta.env.BASE_URL`
  in your prototype matches the Pages URL prefix; the router uses it.
- **The dev server works but the deployed build is broken.** Run
  `npm run preview` locally — it serves the built bundle and reproduces
  the deployed environment without needing to push.
