# AGENTS.md — ProtoWiki

ProtoWiki is a Vite + Vue 3 + Wikimedia Codex prototyping environment.
**Almost everything an agent needs is in `.agents/skills/`.** This file
just orients you.

## Where things live

- **`src/`** — the Vue app. Each prototype is a folder under
  `src/prototypes/`. Single-concern layout wrappers, chrome primitives,
  data utilities, and reader-focused components — see
  [`protowiki-components`](.agents/skills/protowiki-components/SKILL.md)
  for the catalogue. Composables in `src/composables/`. Theming logic
  in `src/lib/`. Styles in `src/styles/`.
- **`.agents/skills/`** — the _single canonical home_ for non-code
  material: how to use Codex, how to fetch Wikipedia data, how the
  prototyping workflow works, how to deploy. Each skill is an
  [Agent Skill](https://agentskills.io/specification): a `SKILL.md` with
  YAML frontmatter (`name`, `description`) plus optional `references/`
  and `assets/`. There is no parallel `resources/` folder, no
  `.cursor/rules/` folder, and no `CLAUDE.md`.
- **`public/`** — static assets served as-is.
- **`.github/workflows/`** — `deploy.yml` publishes production to the
  `gh-pages` branch on push to `main`; `preview.yml` deploys PR previews
  under `pr-preview/pr-<n>/` on the same site.

## How to use the skills

Skills load via **progressive disclosure** — agents see only `name +
description` at task time and pull in a body when the task matches.
You don't need to read every `SKILL.md` upfront. When the user says
"build a related-articles strip on the article page", the relevant
skills (`protowiki-create-prototype`, `protowiki-components`, `codex-usage`,
`codex-components`, `wiki-apis`, `wiki-signals`) auto-activate.

Humans can also browse `.agents/skills/` directly — every `SKILL.md`
reads as a normal markdown document.

## Portability of skills (prefix-as-contract)

Skills in `.agents/skills/` come in two flavours, distinguished by name:

- **Portable, environment-agnostic skills** — `codex-*`, `wiki-*`.
  These describe the upstream design system and the Wikimedia APIs
  _without_ assuming ProtoWiki. They should be safely copyable into
  another repo, or consumable on their own. ProtoWiki-specific notes in
  these skills live in a clearly-marked trailing **Inside ProtoWiki**
  section, or in a `references/protowiki-integration.md` file beside the
  skill.
- **ProtoWiki integration skills** — `protowiki-*`. These are the home
  for repo-specific paths, components, scripts, and wiring. They
  reference the portable skills above and tell you how to apply them
  _in this repo_.

If you find ProtoWiki-specific content (`src/…` paths, ProtoWiki
component names, repo-only scripts) leaking into a `codex-*` /
`wiki-*` skill, move it to a `protowiki-*` skill or to that skill's
trailing **Inside ProtoWiki** section.

## Skill index

### ProtoWiki workflow

| Skill                                                                              | What it covers                                                           |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| [`protowiki-getting-started`](.agents/skills/protowiki-getting-started/SKILL.md)   | Orientation: what ProtoWiki is, the stack, where everything lives        |
| [`protowiki-create-prototype`](.agents/skills/protowiki-create-prototype/SKILL.md) | Adding a new prototype via file-based routing — zero registration        |
| [`protowiki-components`](.agents/skills/protowiki-components/SKILL.md)             | Shipped Vue components: wrappers, chrome, article surfaces, search       |
| [`protowiki-skins`](.agents/skills/protowiki-skins/SKILL.md)                       | Vector 2022 (desktop) vs Minerva (mobile); per-component skin overrides  |
| [`protowiki-theme`](.agents/skills/protowiki-theme/SKILL.md)                       | Light / dark theming; per-component theme overrides                      |
| [`protowiki-deploy`](.agents/skills/protowiki-deploy/SKILL.md)                     | GitHub Pages deploy, PR previews, base path, fork setup, SPA 404         |
| [`protowiki-update-codex`](.agents/skills/protowiki-update-codex/SKILL.md)         | Upgrading Codex: bump packages, diff upstream docs, sync skills + tokens |

### Codex (design system)

| Skill                                                                        | What it covers                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`codex-usage`](.agents/skills/codex-usage/SKILL.md)                         | Umbrella: how to use Codex anywhere — components first, then tokens, then icons; when (rarely) to write custom CSS; matching Figma fidelity                                                                                                                                                                                                                                                                                                           |
| [`codex-tokens`](.agents/skills/codex-tokens/SKILL.md)                       | Codex CSS custom properties (color, spacing, type, dark mode)                                                                                                                                                                                                                                                                                                                                                                                         |
| [`codex-typography`](.agents/skills/codex-typography/SKILL.md)               | The 9 canonical text styles rule — every piece of text uses exactly one; never mix tokens across styles                                                                                                                                                                                                                                                                                                                                                |
| [`codex-components`](.agents/skills/codex-components/SKILL.md)               | Every Codex Vue component shipped via `@wikimedia/codex`                                                                                                                                                                                                                                                                                                                                                                                              |
| [`codex-icons`](.agents/skills/codex-icons/SKILL.md)                         | The `@wikimedia/codex-icons` catalogue and usage                                                                                                                                                                                                                                                                                                                                                                                                      |
| [`codex-style-guide`](.agents/skills/codex-style-guide/SKILL.md)             | The whole Codex Style Guide: design principles, accessibility, bidirectionality, visual styles (colour, type, icons, images, illustrations, data viz), layout guidelines (links/buttons, forms, overflow), content guidelines (voice, copy, machine assistance) |

### Real Wikimedia data (portable)

| Skill                                                                        | What it covers                                                                                      |
| ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| [`wiki-apis`](.agents/skills/wiki-apis/SKILL.md)                             | REST API + Action API + etiquette                                                                   |
| [`wiki-signals`](.agents/skills/wiki-signals/SKILL.md)                       | Catalog of signals (inference, analytics, links, curation, attribution, edit suggestions)           |
| [`wiki-snapshot-data`](.agents/skills/wiki-snapshot-data/SKILL.md)           | Snapshotting article HTML and skin CSS — universal pattern                                          |
| [`protowiki-snapshot-data`](.agents/skills/protowiki-snapshot-data/SKILL.md) | ProtoWiki integration: `public/snapshots/`, `src/styles/wiki-skins/`, `ArticleSnapshot` consumption |

Edit Check-style suggestion overlays are split between two skills: see
[`wiki-signals` → `edit-suggestions.md`](.agents/skills/wiki-signals/edit-suggestions.md)
for simulating the stream and
[`protowiki-components` → `edit-suggestions.md`](.agents/skills/protowiki-components/references/edit-suggestions.md)
for rendering suggestions beside your editing surface.
[`wiki-signals/references/`](.agents/skills/wiki-signals/references/README.md)
mirrors [FakeMediaWiki `wiki-signals`](https://github.com/TodePond/FakeMediaWiki/tree/main/wiki-signals) (carbon-copy Markdown).

## Conventions

- Vue 3 Composition API, `<script setup lang="ts">` by convention
  (`lang="ts"` is optional in any prototype).
- TypeScript is **non-strict** (`strict: false`, `noImplicitAny: false`,
  `allowJs: true`). It's an editor aid, not a build blocker. `npm run build`
  doesn't run `vue-tsc`. Run `npm run type-check` if you want it.
- File-based routing: drop a folder into `src/prototypes/` and the route
  exists. No registration step.
- Plain CSS. No preprocessor. Per-component styles in scoped blocks.
  Skin/theme overrides via `[data-skin]` / `[data-theme]` selectors.
- Codex first. If a Codex component / token / icon exists, use it.
- Data fetching uses native `fetch` with `AbortController` for debouncing.
- **Hand-authored article pages** (no `ArticleLive` / `ArticleSnapshot`): prefer **`ChromeWrapper` → `ArticleCustom`** (default slot = parser body); or compose **`ChromeWrapper` → `ArticleWrapper` → `ArticleRenderer`** when you need finer control. Put markup in the renderer slot; use **`section.hand-authored-lead`** when the lead includes an infobox so mobile matches enwiki order. See [`protowiki-components` → `article.md`](.agents/skills/protowiki-components/references/article.md) and **`src/prototypes/template-article-custom/`**.

## What this repo is not

- It's not a real wiki — there's no MediaWiki backend. For that, look
  at FakeMediaWiki or stand up a real instance.
- It's not a component library to install elsewhere. Components are
  intentionally thin and prototype-quality. Lift them into your own
  repo if useful.
- It's not a Cursor-only experience. Skills are vendor-neutral; any
  agent that reads `.agents/skills/` (or its alternative locations) can
  use them.

If something feels missing, the answer is almost always: write a new
skill, or extend an existing one's `references/`.
