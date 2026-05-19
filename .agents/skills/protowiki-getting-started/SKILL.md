---
name: protowiki-getting-started
description: Orientation for the ProtoWiki repo — what it is, the Vite + Vue 3 + Codex + GitHub Pages stack, where code lives, where skills live, and the first thing to do. Use when first opening this repo, when asked "what is ProtoWiki" or "how does this repo work", or when an agent needs a high-level map before doing anything else.
license: MIT
---

# ProtoWiki — getting started

## What this repo is

ProtoWiki is a prototyping playground for Wikimedia features. It is **not**
a CMS, not a real wiki, not a deployed product. It exists so that designers,
PMs, and engineers can stand up a realistic-looking Wikipedia / MediaWiki
prototype in minutes, hand it to a researcher, and link it from a Phabricator
ticket — using the **same design system, the same fonts, and (optionally)
the same real data** as production.

Realism is the goal. The repo bundles:

- The Wikimedia [Codex design system](https://doc.wikimedia.org/codex/) (Vue 3
  components, CSS tokens, icons) so prototypes look right.
- Data utilities that talk to the live Wikipedia REST and Action APIs.
- Single-concern layout wrappers that paint each Wikipedia surface (chrome,
  article column, special-page shell, plain canvas) and compose by nesting.
- A skills system under `.agents/skills/` that documents every part of
  the repo for both humans and AI coding agents.

For the full component catalogue, see
[`protowiki-components`](../protowiki-components/SKILL.md).

## Tech stack

- **Vite** + **Vue 3** (Composition API, `<script setup>`)
- **TypeScript**, non-strict (`strict: false`, `allowJs: true`) — optional
  for prototype authors; editors get autocomplete without build errors
- **`unplugin-vue-router`** — file-based routing under `src/prototypes/`
- **`@wikimedia/codex`** + `@wikimedia/codex-design-tokens` +
  `@wikimedia/codex-icons`
- Plain CSS (no preprocessor)
- **Prettier** + **ESLint**
- **GitHub Pages** for hosting (no server needed)

## Where things live

```
protowiki/
├── src/
│   ├── main.ts             ← Vue mount + boot-time skin/theme setup
│   ├── App.vue             ← thin shell (RouterView)
│   ├── prototypes/         ← prototypes (each folder = one route)
│   │   ├── index.vue       ← home / gallery (auto-lists prototypes)
│   │   ├── template-chrome/index.vue
│   │   ├── template-dashboard/index.vue
│   │   └── dashpage/index.vue
│   ├── components/         ← shipped components (wrappers, primitives, article, dashboard)
│   ├── composables/        ← useSkin / useTheme (read-only hooks)
│   ├── lib/                ← theming logic, helpers
│   └── styles/             ← global.css, wiki-content/, dark.css
├── .agents/skills/         ← skills for both humans and agents (see below)
├── AGENTS.md               ← thin index pointing at the skills
└── README.md               ← human-friendly intro pointing at the same skills
```

There is **no** `.cursor/rules/`, **no** parallel `resources/` folder, **no**
`CLAUDE.md`. All non-code material is a skill. Skills are markdown that humans
read and that AI agents auto-discover.

## What to do next

| If you want to… | Read… |
| --- | --- |
| Make a new prototype | [`protowiki-create-prototype`](../protowiki-create-prototype/SKILL.md) |
| Look up a component (wrappers, article surfaces, search bar…) | [`protowiki-components`](../protowiki-components/SKILL.md) |
| Use a Codex component, token, or icon | [`codex-usage`](../codex-usage/SKILL.md) |
| Fetch real data from Wikipedia | [`wiki-apis`](../wiki-apis/SKILL.md) |
| Snapshot an article + its skin CSS into the repo | [`protowiki-snapshot-data`](../protowiki-snapshot-data/SKILL.md) |
| Prototype VisualEditor-style editing (article template, suggestion mode) | [`protowiki-components` → `editors.md`](../protowiki-components/references/editors.md) |
| Make light/dark or desktop/mobile previews | [`protowiki-skins`](../protowiki-skins/SKILL.md) + [`protowiki-theme`](../protowiki-theme/SKILL.md) |
| Deploy to GitHub Pages | [`protowiki-deploy`](../protowiki-deploy/SKILL.md) |

## Local dev

```bash
npm install
npm run dev      # http://localhost:5173 — use this for prototyping
```

That's it — there's no registration step for new prototypes. Drop a folder
under `src/prototypes/` and the route is live. CI runs `npm run build` when
you push or open a PR; you only need a local build to debug GitHub Pages
issues — see [`protowiki-deploy`](../protowiki-deploy/SKILL.md).
