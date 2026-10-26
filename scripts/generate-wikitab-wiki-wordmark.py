#!/usr/bin/env python3
"""Build wikitab Wiki wordmark: tabular W (portal-sized) + portal I/K/I."""
from __future__ import annotations

import re
from pathlib import Path as PathLib

from fontTools.pens.recordingPen import RecordingPen
from fontTools.pens.transformPen import TransformPen
from fontTools.svgLib.path.parser import parse_path as parse_svg_path
from pathops import Path, op, PathOp

ROOT = PathLib(__file__).resolve().parents[1]
PORTAL = ROOT / "src/prototypes/wikitab/assets/wikipedia-portal-wordmark-full.svg"
TABULAR = ROOT / "src/prototypes/wikitab/assets/tabular-wikipedia-wordmark.svg"
OUT = ROOT / "src/prototypes/wikitab/assets/wikipedia-wordmark-wiki.svg"

# Portal “ikipedia” path: I, K, I before P (contours 1–3).
IKI_X0 = 115.0
IKI_X1 = 224.5


def recording_to_d(rec: RecordingPen) -> str:
    out: list[str] = []
    for cmd, args in rec.value:
        if cmd == "moveTo":
            x, y = args[0]
            out.append(f"M{x:g} {y:g}")
        elif cmd == "lineTo":
            x, y = args[0]
            out.append(f"L{x:g} {y:g}")
        elif cmd == "curveTo":
            (x1, y1), (x2, y2), (x3, y3) = args
            out.append(f"C{x1:g} {y1:g} {x2:g} {y2:g} {x3:g} {y3:g}")
        elif cmd == "closePath":
            out.append("Z")
        else:
            raise ValueError(cmd)
    return "".join(out)


def path_to_d(p: Path) -> str:
    rec = RecordingPen()
    p.draw(rec)
    return recording_to_d(rec)


def path_from_d(d: str) -> Path:
    p = Path()
    parse_svg_path(d, p.getPen())
    return p


def rect_path(x0: float, y0: float, x1: float, y1: float) -> Path:
    r = Path()
    r.moveTo(x0, y0)
    r.lineTo(x1, y0)
    r.lineTo(x1, y1)
    r.lineTo(x0, y1)
    r.close()
    return r


def tabular_w_fitted_to_portal(portal_w: Path) -> Path:
    """Portal W’s right leg extends under the first I and reads as V; tabular W does not."""
    tab_paths = re.findall(r'<path d="([^"]+)"', TABULAR.read_text())
    tw = path_from_d(tab_paths[1])
    tb = tw.bounds
    pb = portal_w.bounds
    sx = (pb[2] - pb[0]) / (tb[2] - tb[0])
    sy = (pb[3] - pb[1]) / (tb[3] - tb[1])
    tx = pb[0] - tb[0] * sx
    ty = pb[1] - tb[1] * sy
    rec = RecordingPen()
    tw.draw(TransformPen(rec, (sx, 0, 0, sy, tx, ty)))
    return path_from_d(recording_to_d(rec))


def main() -> None:
    frag = PORTAL.read_text()
    w_d, rest_d = re.findall(r'<path d="([^"]+)"', frag)

    portal_w = path_from_d(w_d)
    w = tabular_w_fitted_to_portal(portal_w)

    rest = path_from_d(rest_d)
    iki = op(rest, rect_path(IKI_X0, -2, IKI_X1, 90), PathOp.INTERSECTION)

    parts = [w, iki]

    xs: list[float] = []
    ys: list[float] = []
    body: list[str] = []
    for p in parts:
        b = p.bounds
        xs.extend([b[0], b[2]])
        ys.extend([b[1], b[3]])
        body.append(f'<path fill="#202122" d="{path_to_d(p)}"/>')

    pad = 1.0
    x0, y0 = min(xs) - pad, min(ys) - pad
    x1, y1 = max(xs) + pad, max(ys) + pad
    vb_w, vb_h = x1 - x0, y1 - y0
    display_h = 32
    display_w = round(vb_w / vb_h * display_h)

    svg = f"""<!-- Wiki: tabular W @ portal size + portal IKI (scripts/generate-wikitab-wiki-wordmark.py). -->
<svg width="{display_w}" height="{display_h}" viewBox="{x0:.2f} {y0:.2f} {vb_w:.2f} {vb_h:.2f}" fill="none" xmlns="http://www.w3.org/2000/svg">
{chr(10).join(body)}
</svg>
"""
    OUT.write_text(svg)
    print(f"Wrote {OUT.relative_to(ROOT)} ({display_w}×{display_h})")


if __name__ == "__main__":
    main()
