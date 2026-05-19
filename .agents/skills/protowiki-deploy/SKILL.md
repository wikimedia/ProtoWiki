---
name: protowiki-deploy
description: How to build and deploy ProtoWiki to GitHub Pages — production deploy, PR preview deployments on gh-pages, fork setup, base path (PROTOWIKI_BASE), SPA 404 fallback, and CI workflows. Use when asked to deploy, publish, preview a PR, ship to GitHub Pages, set up a fork, or fix base-path / 404 issues.
license: MIT
---

# Deploy ProtoWiki to GitHub Pages

ProtoWiki is a static SPA. **CI builds and deploys** on push to `main` and on
pull requests — you rarely need `npm run build` locally. For day-to-day
prototyping, use `npm run dev` (see
[`protowiki-getting-started`](../protowiki-getting-started/SKILL.md)).

## Local dev vs production build

| Command | When |
| --- | --- |
| `npm run dev` | **Default** — HMR at `http://localhost:5173`, Vite `base: '/'`. |
| `npm run build` | **Optional** — CI runs this. Locally only to reproduce Pages or debug deploy issues. |
| `npm run preview` | **After** a local build — serves `dist/` with the same base path as the build. |

## Reproducing GitHub Pages locally

When something works in dev but breaks on Pages:

```bash
PROTOWIKI_BASE='/ProtoWiki/' npm run build    # match your repo name casing
npm run preview                               # http://localhost:4173
```

For a PR preview subpath:

```bash
PROTOWIKI_BASE='/ProtoWiki/pr-preview/pr-99/' npm run build
npm run preview
```

The build:

1. Runs Vite with `PROTOWIKI_BASE` (see [Base path](#base-path)).
2. Code-splits per route (each prototype gets its own JS chunk).
3. Copies **`public/.nojekyll`** into `dist/` so GitHub Pages does not run
   Jekyll (Jekyll drops Vite chunks whose names start with `_`, e.g.
   `_plugin-vue_export-helper-….js`).
4. **Copies `dist/index.html` to `dist/404.html`** and prepends
   [`public/gh-pages-preview-404.js`](../../../public/gh-pages-preview-404.js)
   so GitHub Pages can serve the SPA shell for production deep links and redirect
   `…/pr-preview/pr-N/…` deep links into the preview base. **`public/gh-pages-restore.js`**
   is injected at the top of `<head>` on every build so the preview index can
   restore the stashed path before Vue Router starts.

## Base path

Vite's `base` decides the prefix for asset URLs and the router base.
Defaults to `/protowiki/` when unset. CI sets it from the repository name.

```bash
PROTOWIKI_BASE='/ProtoWiki/' npm run build
PROTOWIKI_BASE='/ProtoWiki/pr-preview/pr-42/' npm run build   # PR preview
PROTOWIKI_BASE='/' npm run build                              # custom domain at root
```

## GitHub Pages setup (one-time per repo or fork)

| Setting | Value |
| --- | --- |
| **Pages source** | **Deploy from a branch** → `gh-pages` / `/ (root)` |
| **Actions permissions** | **Settings → Actions → General → Workflow permissions** → **Read and write** |

Do **not** use the Pages option labeled **“GitHub Actions”** for this repo —
previews deploy to the `gh-pages` branch via
[`rossjrw/pr-preview-action`](https://github.com/rossjrw/pr-preview-action).

After the first successful `deploy.yml` run on `main`, the `gh-pages` branch
exists; then switch Pages to deploy from that branch.

## Production deploy

[`.github/workflows/deploy.yml`](../../../.github/workflows/deploy.yml) on push
to `main`:

1. Checks out, `npm ci`, `npm run build` with
   `PROTOWIKI_BASE=/${{ repository.name }}/`.
2. Publishes `dist/` to the `gh-pages` branch root via
   [`JamesIves/github-pages-deploy-action`](https://github.com/JamesIves/github-pages-deploy-action)
   (`clean-exclude: pr-preview/`, `force: false` so open PR previews are not
   wiped).

Production URL:

```
https://<owner>.github.io/<RepoName>/
```

## PR preview deployments

[`.github/workflows/preview.yml`](../../../.github/workflows/preview.yml) on
`pull_request` (`opened`, `reopened`, `synchronize`, `closed`):

1. Builds with
   `PROTOWIKI_BASE=/<RepoName>/pr-preview/pr-<number>/` (trailing slash required).
2. Deploys to `gh-pages` under `pr-preview/pr-<number>/` via
   `rossjrw/pr-preview-action@v1`.
3. Leaves a sticky comment on the PR with the preview link (and QR code).
4. Removes the preview folder when the PR is closed.

Preview URL:

```
https://<owner>.github.io/<RepoName>/pr-preview/pr-<number>/
```

**Preview deep links** (e.g. `…/pr-preview/pr-3/template-chrome`) work after a
**main** deploy: GitHub only reads **root** `404.html`, which preview CI does not
update. The root file redirects into the preview base via `sessionStorage`; the
preview `index.html` restores the path before the router boots. Merging preview-only
changes without deploying `main` leaves deep links broken until the next production
deploy. Hard-refreshing a preview deep URL briefly hops through the gallery (no
server-side SPA rewrite on GitHub Pages).

### Fork contributors

Fork `wikimedia/ProtoWiki`, complete [GitHub Pages setup](#github-pages-setup-one-time-per-repo-or-fork)
on **your fork**, push to `main` once, then open PRs **within your fork**
(e.g. `feature` → `main` on `youruser/ProtoWiki`). Previews appear on **your**
`github.io` site — no extra accounts or secrets.

### Cross-repo PRs to upstream

PRs from `alice/ProtoWiki` **into** `wikimedia/ProtoWiki` do **not** get
automatic upstream previews (untrusted code must not write to upstream
`gh-pages`). **Preview in your fork first**, then open the upstream PR and
link your fork preview in the description.

## Custom domain

If you point a custom domain (e.g. `protowiki.example.org`) at Pages:

1. Set `PROTOWIKI_BASE='/'` (or whatever path the domain serves).
2. Add a `CNAME` file at `public/CNAME` containing the domain.
3. Configure DNS as documented at
   <https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site>.

## Sharing a single prototype

Once deployed:

```
https://<org>.github.io/ProtoWiki/                         ← gallery
https://<org>.github.io/ProtoWiki/template-chrome          ← prototype
https://<org>.github.io/ProtoWiki/template-chrome?theme=dark
https://<org>.github.io/ProtoWiki/template-chrome?skin=mobile
```

The `?skin=` and `?theme=` URL params are handled at boot — paste them
into review tickets to pin a specific preview.

## Troubleshooting

- **404 on a deep link (production).** The `404.html` copy step in `vite.config.ts`
  must run; verify `dist/404.html` exists after build (SPA shell + pr-preview
  preamble script).
- **404 or blank page on a route inside a PR preview.** Root `gh-pages/404.html`
  must come from a recent **main** deploy (preview workflows do not update it).
  Push or merge to `main`, wait for Pages, then hard-refresh the preview deep link.
- **Preview deep link shows the gallery with `?template-…` in the URL.** That was
  an older `?/` redirect experiment; current builds use `sessionStorage` and should
  end on `…/pr-N/template-…` with no query hack.
- **Preview deep link always lands on the gallery (URL is only `…/pr-N/`).** Check that
  root `404.html` includes the pr-preview preamble and that restore skips deep paths on
  the 404 page (so `sessionStorage` survives). The preamble must also stop the
  **production** bundle in `404.html` from booting (wrong `PROTOWIKI_BASE`); only the
  preview `index.html` should run Vue.
- **Asset URLs missing the base path.** Check `import.meta.env.BASE_URL`
  matches the deployed URL prefix; the router uses it.
- **Blank app on Pages or preview.** Wrong `PROTOWIKI_BASE` (missing repo
  name prefix or trailing slash). Reproduce with `npm run build` +
  `npm run preview` using the same base as CI.
- **The dev server works but the deployed build is broken.** Run
  `npm run preview` locally after a production build — see
  [Reproducing GitHub Pages locally](#reproducing-github-pages-locally).
- **PR preview comment but 404 at the URL.** Pages source must be **Deploy
  from branch** `gh-pages`, not “GitHub Actions”. Wait a minute for Pages
  to rebuild after the action commits.
- **Main deploy deleted PR previews.** `deploy.yml` must keep
  `clean-exclude: pr-preview/` and `force: false` on JamesIves.
- **Blank page; 404 on `_plugin-vue_export-helper-….js` or other `_*`
  assets.** Missing `.nojekyll` at the site root — ensure `public/.nojekyll`
  exists and redeploy `main` (and re-run the PR preview workflow if needed).
