---
name: codex-design-principles
description: The Wikimedia / Codex design principles — familiar, useful, accessible, easy, joyful, with a pragmatic note on minimising chrome — and how to apply them when designing an interaction, copy, and layout. Use when making a UX call ("should this be a dialog or inline edit?"), writing UI copy, or sanity-checking a design before building it.
license: MIT
---

# Codex design principles

The full canonical text lives at
<https://doc.wikimedia.org/codex/latest/style-guide/principles.html>. This
skill summarises it and shows how it lands in Wikimedia product work.

> **Familiar. Useful. Accessible. Easy. Joyful.**

Reach for these principles when you're not sure which of two options to
ship. They're intentionally simple, and they encode the values that
make Wikipedia and the broader Wikimedia ecosystem feel coherent.

## 1. Familiar

The interface should feel like Wikipedia, *because it's a Wikipedia
surface*. That means:

- Use the same chrome (Vector 2022 desktop / Minerva mobile) — paint
  the same header, sidebar, and footer rather than inventing a layout.
- Use real Wikipedia article HTML where possible.
- Use Codex tokens, components and icons. Never invent visuals.
- When you must extend, mirror existing patterns (cards on Special
  pages, message boxes, action toolbars).

If a reviewer's first reaction is "what is this?", the work isn't
familiar enough.

## 2. Useful

Show realistic data, realistic edge cases, realistic flows. A surface
that always shows three perfect mock results is decorative rather than
useful. Specifically:

- Use real Wikipedia titles, search results, article content. See
  [`wiki-apis`](../wiki-apis/SKILL.md) and
  [`wiki-snapshot-data`](../wiki-snapshot-data/SKILL.md).
- Surface failure states (empty results, 0 suggestions, network errors).
- Surface "long" states (very long titles, RTL languages, mathematical
  formulas, infoboxes).

## 3. Accessible

Codex components cover keyboard, focus, ARIA roles, contrast and
RTL. *Use them as designed*:

- Don't strip `aria-label`s from buttons that only show an icon.
- Don't replace `<a>` with `<div @click>`.
- Don't hard-code colours that fail in dark mode.
- Don't suppress focus rings.

If your work removes accessibility affordances, it's no longer
demonstrating a Wikimedia design — it's demonstrating something else.

## 4. Easy

A reader's primary job on Wikipedia is to read. An editor's primary
job is to edit. Each new feature should make the primary job easier,
not interrupt it.

Practical heuristics:

- Prefer **inline** affordances over modal flows — e.g., let an article
  enter edit mode in place rather than navigating to a separate route.
- Don't ask before showing. If a UI improves the experience without
  destruction, just show it; gate it on intent only when the cost is
  high (publishing, deleting).
- Use progressive disclosure. Editor toolbars typically show a few
  common actions with secondary ones in an overflow menu — a useful
  pattern to copy.

## 5. Joyful

Wikipedia is a public good. The interface should feel cared for.

- Animations: subtle, fast (100–200ms), purposeful. Codex provides
  `--transition-duration-…` tokens. Use them rather than inventing.
- Micro-interactions: a satisfying focus ring, a clear hover state, a
  cursor that turns into a hand on a link. These are mostly free if you
  use Codex.
- Copy: short, plain, friendly. Avoid shouty exclamation marks and
  jargon. Refer to readers in the second person ("you").

## Minimise chrome (a Wikimedia-specific addition)

The Wikipedia article *is* the product. Anything beyond it competes for
the reader's attention. When in doubt, be more conservative — a
non-feature is better than a noisy one.

## Applying these in a design review

Before you call a piece of work done, walk through this checklist:

- [ ] Does it look like Wikipedia? (chrome, fonts, spacing, tokens)
- [ ] Does it use real or realistic data?
- [ ] Does it work with keyboard only?
- [ ] Does it work in dark mode?
- [ ] Does it work at mobile width?
- [ ] Does the primary user job get easier — or harder?
- [ ] Does any new affordance ride on familiar Wikipedia patterns?
- [ ] Have we resisted adding something just because we could?

## Reference

- Wikimedia Style Guide overview:
  <https://doc.wikimedia.org/codex/latest/style-guide/principles.html>
- Wikimedia content (writing) style guide:
  <https://design.wikimedia.org/style-guide/>

## Inside ProtoWiki

ProtoWiki ships these principles as defaults: `ChromeWrapper`,
`SpecialPageWrapper`, and `PlainWrapper` paint layout shells and site chrome.
`ArticleWrapper`, `ArticleRenderer`, `ArticleLive`, `ArticleSnapshot`, and `ArticleCustom` orchestrate reader shells and parser HTML. Edit UX prototypes belong in forked
upstream demos — see [`references/editors.md`](../protowiki-components/references/editors.md).
