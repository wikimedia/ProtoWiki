# Data visualization — colour palettes & symbols

Source:
<https://doc.wikimedia.org/codex/latest/style-guide/data-visualization.html>.
These palettes work in both light and dark modes. Hex values are the raw
Codex palette (see [`codex-tokens`](../../codex-tokens/SKILL.md) for the
token system).

## Categorical

Distinct, unrelated categories (countries, days of the week). Use **in
order**; for three categories use the first three.

1. `blue600` `#4b77d6`
2. `yellow300` `#edb537`
3. `red400` `#fd7865`
4. `green300` `#80cdb3`
5. `lime500` `#259948`
6. `blue300` `#a6bbf5`
7. `purple500` `#8d7ebd`
8. `pink300` `#d9b4cd`
9. `yellow500` `#ab7f2a`
10. `gray400` `#a2a9b1`

## Sequential

Ordered data (ranking). One hue, increasing intensity; the exact stops
change with how many series you show. Example in blue (any palette hue
works the same way):

- **1:** `blue600`
- **2:** `blue600`, `blue400`
- **3:** `blue600`, `blue400`, `blue200`
- **4:** `blue800`, `blue600`, `blue400`, `blue200`
- **5:** `blue800`, `blue600`, `blue500`, `blue400`, `blue200`
- **6:** `blue800`, `blue700`, `blue600`, `blue500`, `blue400`, `blue200`
- **7:** add `blue300` (between 400 and 200)
- **8:** `blue900` … `blue200`
- **9:** add `blue100`
- **10:** `blue1000` … `blue100`

## Divergent

Data with a meaningful midpoint (temperature). Two contrasting colours
meeting at a neutral middle; pull from the spectrum as needed. Blue→Red:

1. `blue600` `#4b77d6`
2. `blue500` `#6485d1`
3. `blue400` `#88a3e8`
4. `green300` `#80cdb3`
5. `lime200` `#b9debc`
6. `yellow200` `#ffcf4f`
7. `orange300` `#ffa758`
8. `red400` `#fd7865`
9. `red500` `#f54739`
10. `red600` `#d74032`

## Accessibility symbols

Use in this order (chosen for shape contrast at small sizes), as line/
plot nodes or as bar/pie fill patterns, so series don't rely on colour:

circle · cross · triangle · square · wishbone · diamond · asterisk ·
moon · caret · twinkle
