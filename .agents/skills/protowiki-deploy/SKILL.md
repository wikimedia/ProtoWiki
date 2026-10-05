---
name: protowiki-deploy
description: How to build and deploy ProtoWiki to GitHub Pages — production deploy, PR preview deployments on gh-pages, template-first repo setup, base path (PROTOWIKI_BASE), SPA 404 fallback, and CI workflows. Use when asked to deploy, publish, preview a PR, ship to GitHub Pages, set up a copied repo, or fix base-path / 404 issues.
---

# Deploy ProtoWiki to GitHub Pages

ProtoWiki is a static SPA. **CI builds and deploys** on push to `main` and on
pull requests — you rarely need `npm run build` locally. For day-to-day
prototyping, use `npm run dev` (see
[`protowiki-getting-started`](../protowiki-getting-started/SKILL.md)).

## Golden path (template-first)

Default recommendation for designers/PMs:

1. Use `wikimedia/ProtoWiki` as a **template** (copy into your own repo).
2. Build locally with `npm run dev`.
3. Push to `main` in your copied repo to deploy production.
4. Use branch + PR previews only when you want parallel in-progress links or review.

Do not require a fork or upstream write access for the standard deploy flow.

## Local dev vs production build

| Command           | When                                                                                 |
| ----------------- | ------------------------------------------------------------------------------------ |
| `npm run dev`     | **Default** — HMR at `http://localhost:5173`, Vite `base: '/'`.                      |
| `npm run build`   | **Optional** — CI runs this. Locally only to reproduce Pages or debug deploy issues. |
| `npm run preview` | **After** a local build — serves `dist/` with the same base path as the build.       |

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

## GitHub Pages setup (one-time per deployed repo)

| Setting                 | Value                                                                        |
| ----------------------- | ---------------------------------------------------------------------------- |
| **Pages source**        | **Deploy from a branch** → `gh-pages` / `/ (root)`                           |
| **Actions permissions** | **Settings → Actions → General → Workflow permissions** → **Read and write** |

Do **not** use the Pages option labeled **“GitHub Actions”** for this repo —
previews deploy to the `gh-pages` branch via
[`rossjrw/pr-preview-action`](https://github.com/rossjrw/pr-preview-action).

**Order for a new repo:** enable Actions permissions → push (or merge) to
`main` once so `deploy.yml` creates `gh-pages` → set Pages to **Deploy from a
branch** as above. Until `gh-pages` exists, that branch will not appear in the
Pages dropdown.

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

### Deploy path decision tree

Use this three-way decision:

1. **Template/new repo (default):**
   - If the user does **not** have write access to `wikimedia/ProtoWiki`, tell
     them to click **Use this template** on `wikimedia/ProtoWiki` (instead of
     creating a brand-new repo from scratch).
   - Ask for the URL of their template copy, then deploy there.
   - Push to `main` for production deploy.
   - For preview links, push your changes to a **separate branch** and open a
     pull request from that branch to `main` in the same repo
     (`pr-preview/pr-<number>/`).
2. **Upstream collaborator (`wikimedia/ProtoWiki` write access):**
   - Optional maintainer flow: branch in upstream and open PR to `main`.
3. **No GitHub account yet:**
   - Prototype locally now; create account/repo only when ready to deploy.
   - Agent can guide UI + commands without owning GitHub credentials.

### Agent deploy playbook (automated vs guided)

At deploy time, always declare capability mode first:

- **Automated mode:** "I can do this for you end-to-end."
- **Guided mode:** "I cannot access GitHub here; I will guide you step-by-step."

Then run:

1. Find the current state:
   - Does the user have write access to `wikimedia/ProtoWiki`?
   - If not, are they already in a template copy repo?
2. Confirm destination repo (`your copy` by default; upstream only if requested and permitted).
   - If the user lacks upstream write access and has no copy yet, instruct them
     to create one via **Use this template** on `wikimedia/ProtoWiki`, then ask
     for that repo URL and proceed there.
   - Prefer this route over asking users to create/configure a brand-new repo manually.
3. Confirm deploy intent:
   - `main` push for production update, or
   - separate branch + pull request for preview.
   - Never use a direct `main` push when the user asked for a preview link.
4. Check prerequisites:
   - repo exists,
   - Actions workflow permissions are read/write,
   - Pages source is **Deploy from a branch** → `gh-pages` / **/ (root)** (not
     “GitHub Actions”).
5. Execute (automated) or provide one copy/paste command block at a time (guided).
6. Return final URL(s): production and/or PR preview.

**When guiding users, include the one-time setup** (below) if any of these apply:
the repo was not created from the ProtoWiki template, the user has never deployed before, Pages is
still on the default source, workflows succeed but the public URL 404s, or PR
preview comments appear but preview URLs 404. Skip repeating it once the user
confirms Pages already uses `gh-pages` at root.

### Guided mode: one-time GitHub setup (give users these steps)

Use plain language. One step at a time; ask the user to confirm before the next.

1. **Workflow permissions** — In the repo on GitHub: **Settings** → **Actions**
   → **General** → **Workflow permissions** → choose **Read and write
   permissions** → **Save**.
2. **First production deploy** — Push or merge to `main` (or walk them through
   their first commit to `main`). In **Actions**, wait until **Deploy to GitHub
   Pages** finishes successfully. That run creates the `gh-pages` branch.
3. **GitHub Pages source** — **Settings** → **Pages**:
   - Under **Build and deployment**, **Source**: **Deploy from a branch** (not
     “GitHub Actions”).
   - **Branch**: `gh-pages`, folder **/ (root)** → **Save**.
   - If `gh-pages` is missing, go back to step 2 and wait for the workflow.
4. **Check the live site** — Open
   `https://<username>.github.io/<repo-name>/` (match repo name casing). It can
   take a minute after saving Pages settings.

**Do not** tell users to pick **GitHub Actions** as the Pages source — CI still
writes files to `gh-pages`; previews depend on that branch layout.

For pull request previews, the same Pages setup applies; after step 3, open a
pull request and use the preview link from the bot comment (under
`…/pr-preview/pr-<number>/`).

### Guided mode communication style (non-technical users)

When guiding designers/PMs, prefer plain language over Git jargon:

- On first deploy (or if the site 404s after a green workflow), walk through
  [Guided mode: one-time GitHub setup](#guided-mode-one-time-github-setup-give-users-these-steps)
  before debugging build flags or base paths.
- Say "your project copy" instead of "fork/upstream remote" unless needed.
- Say "make a new branch to test an idea" instead of "create a feature branch".
- Always say "pull request" in full (do not shorten to "PR").
- Say "deploy your prototype" instead of "deploy to GitHub Pages" when context is clear.
- Give one action at a time with an explicit success check ("Paste the link you see").
- Avoid unexplained terms like "rebase", "upstream", "HEAD", "origin", "detached", "CI".

Use this sentence starter in guided mode:
"I'll walk you through this step-by-step."

### Workflow coverage matrix

| Scenario                                   | Workflow                                                | Result                                                                                                           |
| ------------------------------------------ | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Push to `main` in any ProtoWiki-based repo | [`deploy.yml`](../../../.github/workflows/deploy.yml)   | Updates production site root                                                                                     |
| PR inside same repo                        | [`preview.yml`](../../../.github/workflows/preview.yml) | Creates/removes `pr-preview/pr-<number>/`                                                                        |
| External fork PR into upstream             | Not enabled by default in this strategy                 | Use template-first repo previews; upstream path is collaborator-only unless extra fork-preview workflow is added |

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
https://<org>.github.io/ProtoWiki/template-app-article?os=ios
https://<org>.github.io/ProtoWiki/template-app-chrome?os=android&theme=dark
https://<org>.github.io/ProtoWiki/template-app-article?os=auto
```

The `?skin=`, `?theme=`, and `?os=` URL params are handled at boot — paste them
into review tickets to pin a specific preview. `?os=auto|ios|android` masks the
saved App OS preference without changing it.

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
