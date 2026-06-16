---
name: codex-style-guide
description: The Wikimedia / Codex Style Guide — the design-decision companion to the Codex toolkit. Covers the four design principles (Design with Others, For Curious Humans, Trustworthy, Content First), accessibility, bidirectionality, visual styles (colour usage, typography/readability, icon design, images, illustrations, data visualization), layout guidelines (links vs buttons, forms, content overflow), and content guidelines (voice & tone, writing for copy, machine assistance). Use when making a UX call ("dialog or inline edit?"), choosing colours/type/imagery, laying out a form, writing UI copy, labelling AI-assisted output, or sanity-checking a design.
license: MIT
---

# Codex style guide

This is the **design** half of Codex — *what to design and why*. The
**toolkit** half — *what's available and how to call it* — lives in
[`codex-tokens`](../codex-tokens/SKILL.md),
[`codex-components`](../codex-components/SKILL.md), and
[`codex-icons`](../codex-icons/SKILL.md);
[`codex-usage`](../codex-usage/SKILL.md) is the practical entry point
that ties them together.

It mirrors the four areas of the upstream Style Guide: **Design
Principles**, **Visual Styles**, **Layout Guidelines**, and **Content
Guidelines**. Canonical:
<https://doc.wikimedia.org/codex/latest/style-guide/design-principles-overview.html>.

Everything descends from the **Statement of Purpose**: _"we design with
and for curious humans who rely on trustworthy content."_
(<https://doc.wikimedia.org/codex/latest/style-guide/statement-of-purpose.html>)

## The four design principles

Reach for these when you're unsure which of two options to ship.

### 1. Design with Others

Collaborate openly; include ideas and perspectives beyond your own.

- Is this design the outcome of collaboration?
- Did we listen to and learn from people with different backgrounds?
- Have we learned from the target audience that their needs are met?

### 2. For Curious Humans

Welcome a universal audience and remove barriers to knowledge.

- Is this design accessible, inclusive, and equitable?
- Does it allow for adaptability based on the person's preferences?
- Is there opportunity for wonder in the experience?

Practical heuristics:

- A reader's primary job is to **read**; an editor's is to **edit**.
  Each feature should make the primary job easier, not interrupt it.
- Prefer **inline** affordances over modal flows where reasonable.
- Use **progressive disclosure** — a few common actions up front,
  secondary ones in an overflow menu.

### 3. Trustworthy

Enable sharing and understanding of trustworthy knowledge while
protecting privacy.

- Are we minimizing the data we collect (in the design _and_ the
  process to create it)?
- Are we communicating information explicitly and honestly?
- Does it help users confidently access and share well-sourced,
  reliable knowledge?

Show provenance for machine-assisted output rather than hiding it — see
[`references/machine-assistance.md`](references/machine-assistance.md).

### 4. Content First

Keep content at the centre; facilitate its comprehension and use.

- Is this prioritizing the most contextually important information?
- Is the content presented in a way that supports clear understanding?
- Does it make it easy to learn from, improve, and share content?

Corollary: **minimise chrome.** The content _is_ the product — anything
beyond it competes for attention. When in doubt, be conservative; a
non-feature beats a noisy one.

## Accessibility & bidirectionality

- **Accessibility** — aim for WCAG AA: never colour-alone, 4.5:1 / 3:1
  contrast, keep focus rings, text alternatives, semantic markup. Detail:
  [`references/accessibility.md`](references/accessibility.md).
- **Bidirectionality** — mirror layout/navigation/directional icons for
  RTL; don't mirror URLs, numerals, time, check marks, media, or images.
  Per-element rules:
  [`references/bidirectionality.md`](references/bidirectionality.md).

## Visual styles

- **Colour usage** — what colours mean, never-colour-alone, contrast:
  [`references/colors.md`](references/colors.md).
- **Typography** — every piece of text uses one of the **9 canonical
  styles**; that rule has its own skill,
  [`codex-typography`](../codex-typography/SKILL.md). Residual readability
  (line length, dynamic text):
  [`references/typography.md`](references/typography.md).
- **Icon design** — reduce to essential, universal, neutral, geometric,
  20 dp, RTL: [`references/icons.md`](references/icons.md).
- **Images** — editorial selection:
  [`references/images.md`](references/images.md).
- **Illustrations** — empty states / onboarding, stroke & colour rules:
  [`references/illustrations.md`](references/illustrations.md).
- **Data visualization** — chart anatomy, choosing a chart, palettes,
  a11y symbols:
  [`references/data-visualization.md`](references/data-visualization.md).

## Layout guidelines

- **Links vs buttons** + button hierarchy/order/spacing:
  [`references/links-and-buttons.md`](references/links-and-buttons.md).
- **Constructing forms** — usability, layout, fieldsets/modules,
  validation, spacing, readonly vs disabled:
  [`references/constructing-forms.md`](references/constructing-forms.md).
- **Content overflow** — wrap / ellipsis+tooltip / fade-for-scroll:
  [`references/content-overflow.md`](references/content-overflow.md).

## Content guidelines

How the words in the UI should read, and how to disclose machine output.

- **Voice & tone** — neutral POV, second person ("your", not "my"), tone
  that shifts with the task:
  [`references/voice-and-tone.md`](references/voice-and-tone.md).
- **Writing for copy** — needed / relevant / clear / concise /
  consistent / accessible / translatable, plus word-choice traps:
  [`references/writing-for-copy.md`](references/writing-for-copy.md).
- **Machine assistance** — center the human, give just enough info,
  choose a disclosure level, label generated output:
  [`references/machine-assistance.md`](references/machine-assistance.md).

## Applying these in a design review

Before you call a piece of work done, walk through this checklist:

- [ ] Does it prioritise the content over its own chrome?
- [ ] Does it use real or realistic data, including failure and "long"
      states (long titles, RTL, formulas, infoboxes)?
- [ ] Does it work with keyboard only, and meet AA contrast?
- [ ] Does it work in dark mode and at mobile width?
- [ ] Does it mirror correctly for RTL?
- [ ] Does the primary user job get easier — or harder?
- [ ] Is any machine-assisted output disclosed honestly?
- [ ] Is the copy neutral, concise, and translatable?
- [ ] Have we resisted adding something just because we could?

## Upstream sources

- Style Guide overview:
  <https://doc.wikimedia.org/codex/latest/style-guide/design-principles-overview.html>
- Statement of Purpose:
  <https://doc.wikimedia.org/codex/latest/style-guide/statement-of-purpose.html>
- Additional content resources:
  <https://doc.wikimedia.org/codex/latest/style-guide/additional-resources.html>
