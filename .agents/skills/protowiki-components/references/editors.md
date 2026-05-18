# Visual editor prototyping (outside ProtoWiki)

ProtoWiki does **not** ship a reusable Visual Editor stand-in component. When you need edit chrome, toolbar layout, or suggestion-mode UX that tracks production exploration, **clone and prototype on top of Bárbara Martínez Calvo’s repos** rather than rebuilding that surface inside this repo:

| Repo | Role |
| --- | --- |
| [`bmartinezcalvo/wikipedia-article-template`](https://github.com/bmartinezcalvo/wikipedia-article-template) | Article page template — `WikipediaPage.vue` **edit mode**, Vector vs Minerva toolbars, reader/edit transitions. |
| [`bmartinezcalvo/suggestion-mode`](https://github.com/bmartinezcalvo/suggestion-mode) | **[Hosted demo](https://bmartinezcalvo.github.io/suggestion-mode/)** — suggestion-mode interaction and coaching flows. |

Bring lessons or extracted pieces into `src/prototypes/<your-name>/` when you integrate with ProtoWiki chrome (`ChromeWrapper`, **`ArticleLive`**, Codex).

ProtoWiki does not ship skills or scripts for vendoring upstream VisualEditor; keep edit fidelity experiments in those repos (or another fork), then port UI patterns into this codebase as needed.
