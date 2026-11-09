# Visual editor prototyping

ProtoWiki ships a **Visual Editor prototype** integrated through **`ArticleLive`** or **`ArticleCustom`** (**`editable`**, optional **`startInEditMode`**, optional **`editRoute`** / **`readRoute`** for gallery read↔edit hops) and the implementation in **`src/components/visual-editor/`** (toolbar, suggestion mode, publish flow). Gallery: **`template-visual-editor/`** (edit route; **`readRoute`** back to **`template-article/`**); **`template-article/`** (read route; **`editRoute`** to the VE template); **`example-custom-article/`** (**Custom article** — static Wet Leg body with in-place **`editable`**).

For upstream fidelity experiments before porting UI, Bárbara Martínez Calvo’s repos remain useful references:

| Repo | Role |
| --- | --- |
| [`bmartinezcalvo/wikipedia-article-template`](https://github.com/bmartinezcalvo/wikipedia-article-template) | Article page template — `WikipediaPage.vue` **edit mode**, Vector vs Minerva toolbars, reader/edit transitions. |
| [`bmartinezcalvo/suggestion-mode`](https://github.com/bmartinezcalvo/suggestion-mode) | **[Hosted demo](https://bmartinezcalvo.github.io/suggestion-mode/)** — suggestion-mode interaction and coaching flows. |

Bring lessons or extracted pieces into **`src/prototypes/<your-name>/`** when you integrate with ProtoWiki chrome (`ChromeWrapper`, **`ArticleLive`**, Codex). See also [`edit-suggestions.md`](edit-suggestions.md) for the suggestion payload contract.

ProtoWiki does not ship skills or scripts for vendoring upstream VisualEditor from Gerrit; keep core VE fidelity experiments in those repos (or another fork), then port UI patterns into **`src/components/visual-editor/`** as needed.
