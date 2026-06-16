# Illustrations

Source:
<https://doc.wikimedia.org/codex/latest/style-guide/illustrations.html>.

Supporting graphics — **never decorative, never standalone**. Primary
use cases: **empty states, onboarding, and modals** with messaging.

Visual style — monochromatic, vector, filled shapes (not outlines),
slightly rounded (2 dp) corners, elements at **0 or 100% opacity** only,
**no black**, ≤ **3 accent colours**:

| Background | Stroke |
| --- | --- |
| Coloured | **No** outline stroke; inner lines 2 dp |
| White | **2 dp** outline stroke in `color-gray500` |
| Grayscale (empty states) | **2 dp** outline stroke in `color-gray400`, grayscale only |

- Fit within a **200×200 dp** square; keep it balanced.
- Take care mixing **red with green** (colour-blindness) or **red with
  blue** (chromostereopsis).
- Export from the Codex Figma library as SVG; test at the actual size.
