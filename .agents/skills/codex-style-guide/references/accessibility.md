# Accessibility

Source: <https://doc.wikimedia.org/codex/latest/style-guide/accessibility.html>

Aim for **WCAG 2.x level AA** across the whole interface. Most of this
is free if you use Codex components as designed — but you can still
break it, so check.

## Colour

- **Never use colour as the only means** of conveying information or
  requesting an action. Pair colour with text, an icon, or a shape.
- Text-to-background contrast must meet **4.5:1** for standard text and
  **3:1** for large text. The palette guarantees these ratios against
  pure white / black surfaces — any *other* combination is on you to
  check (e.g. with the WebAIM contrast checker).

## Typography — legible and zoomable

- Respect minimum font sizes; set type in **relative units (`rem`/`em`)**
  so browser zoom and user preferences scale it.
- Don't lock text into fixed `px` heights that clip when zoomed.

## Touch and keyboard

- Support touch, pointer, *and* keyboard. Keep minimum touch-target
  sizes for fingers and for motor-impaired pointer use.
- Keep the strong **focus outline** — it's how keyboard users navigate.
  Don't `outline: none` without an equivalent.

## Icons and images — text alternatives

- Icon-only buttons need an accessible name (SVG `title` or a
  screen-reader-only text node / `aria-label`).
- Images need `alt`. Decorative-only elements may be marked as such.
- Codex's icon collections already carry `title` attributes.

## Markup — follow standards

- Use **semantic HTML** and the WAI-ARIA Authoring Practices so
  assistive tech identifies components correctly.
- Semantic markup also improves machine readability (search, voice).

## Scope note

Codex focuses on **visual** and **motor** impairment needs at the UI
level. Hearing and cognitive needs are largely a *content* concern
(e.g. Simple English Wikipedia for cognitive accessibility), not
something the component layer solves.
