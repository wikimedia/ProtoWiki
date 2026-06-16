# Icon design principles

Source: <https://doc.wikimedia.org/codex/latest/style-guide/icons.html>.

This is the *design* side of icons. For **importing and rendering** an
icon (and finding the right `cdxIcon…` constant), see
[`codex-icons`](../../codex-icons/SKILL.md).

You'll mostly *pick* an existing icon, but when choosing between
candidates — or adapting one (they're CC BY 4.0, so remixing Material /
Noun Project icons is fine) — keep these in mind:

- **Reduce to the essential form.** Fewest details that still read at
  small sizes (a keyboard, not all 100 keys).
- **Universal, not culturally specific.** No "$" for money, no four-leaf
  clover for luck.
- **Avoid text inside the icon** (except language/text-related glyphs).
- **Abstract vs concrete** — pick whichever reads clearest ("?" for
  help, "…" for more; dice for random, a bell for alert).
- **Neutral point of view** — avoid gestures, animals, religion, humour,
  ethnicity, gender.

Visual style: **monochromatic**, **geometric & symmetrical**,
**front-facing**, on a **20×20 dp** canvas, primarily **outlined** with
**sharp corners** and a **~2 dp stroke**; cross-out lines run top-left to
bottom-right. Pixel-fit edges so shapes stay crisp.

**RTL / LTR:** for non-symmetrical icons, decide whether direction
changes meaning before making a mirrored variant (a play triangle needs
no variant; a bullet-list icon does). See
[`bidirectionality.md`](bidirectionality.md).
