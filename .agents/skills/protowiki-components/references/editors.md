# Visual editor prototyping (outside ProtoWiki)

ProtoWiki does **not** ship a reusable Visual Editor stand-in component. When you need edit chrome, toolbar layout, or suggestion-mode UX that tracks production exploration, **clone and prototype on top of Bárbara Martínez Calvo’s repos** rather than rebuilding that surface inside this repo:

| Repo | Role |
| --- | --- |
| [`bmartinezcalvo/wikipedia-article-template`](https://github.com/bmartinezcalvo/wikipedia-article-template) | Article page template — `WikipediaPage.vue` **edit mode**, Vector vs Minerva toolbars, reader/edit transitions. |
| [`bmartinezcalvo/suggestion-mode`](https://github.com/bmartinezcalvo/suggestion-mode) | **[Hosted demo](https://bmartinezcalvo.github.io/suggestion-mode/)** — suggestion-mode interaction and coaching flows. |

Bring lessons or extracted pieces into `src/prototypes/<your-name>/` when you integrate with ProtoWiki chrome (`ChromeWrapper`, **`ArticleLive`**, Codex).

ProtoWiki does not ship skills or scripts for vendoring upstream VisualEditor; keep edit fidelity experiments in those repos (or another fork), then port UI patterns into this codebase as needed.

## Inside ProtoWiki

**Gallery template:** [`src/prototypes/template-visual-editor/`](../../../../src/prototypes/template-visual-editor/) — integrated read/edit demo:

- **Read:** [`ChromeWrapper`](../../../../src/components/chrome/ChromeWrapper.vue) → [`ArticleCustom`](../../../../src/components/article/ArticleCustom.vue) (Audre Lorde fixture) with desktop TOC/tools sidebars.
- **Edit:** co-located VE toolbar, editable surface, and suggestion-mode UI (desktop sidebar + Minerva bottom sheet), wired to global web skin (`?skin=`, Appearance settings, viewport) — no in-page skin picker.
- **Upstream lineage:** extracted from [suggestion-mode](https://github.com/bmartinezcalvo/suggestion-mode) (Bárbara Martínez Calvo); styles in `visual-editor.css`.

Copy the folder for new prototypes; fork Barbara’s repos when you need upstream fidelity before porting.
