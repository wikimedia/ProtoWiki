#!/usr/bin/env python3
"""Snapshot a Wikipedia article body to a static HTML file.

Usage:
    python3 fetch_page.py "Corsica Studios" -o public/snapshots/corsica-studios.html
    python3 fetch_page.py "Mont Blanc" --lang fr -o public/snapshots/mont-blanc.html
    python3 fetch_page.py "Confidence Man (band)" -o public/snapshots/confidence-man-band.html
    python3 fetch_page.py "Corsica Studios" --revision 1234567890

The output file contains the inner <body>…</body> HTML — copy markup into
`ArticleCustom` or reference it from `public/snapshots/` in ProtoWiki.

The filename stem (e.g. corsica-studios) should match `articleSnapshotSlug()`
in `src/components/article/shared/articleSnapshotSlug.ts` and `-o public/snapshots/<stem>.html`.
"""
import argparse
import re
import sys
import urllib.parse
import urllib.request
from typing import Optional


UA = "ProtoWiki-snapshot/0.1 (https://github.com/<org>/protowiki; <contact>)"


def fetch(title: str, lang: str = "en", revision: Optional[int] = None) -> str:
    slug = urllib.parse.quote(title.replace(" ", "_"), safe="")
    base = f"https://{lang}.wikipedia.org/api/rest_v1/page/html/{slug}"
    url = f"{base}/{revision}" if revision else base
    req = urllib.request.Request(
        url,
        headers={"User-Agent": UA, "Accept": "text/html; charset=utf-8"},
    )
    with urllib.request.urlopen(req, timeout=30) as response:
        return response.read().decode("utf-8")


def extract_body(html: str) -> str:
    match = re.search(r"<body[^>]*>(.*)</body>", html, re.S)
    return match.group(1) if match else html


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("title", help="Article title (case-sensitive, spaces allowed)")
    parser.add_argument("--lang", default="en", help="Wikipedia language code")
    parser.add_argument("--revision", type=int, default=None, help="Pin to a specific revid")
    parser.add_argument(
        "-o", "--output",
        default="-",
        help="Output file (default: stdout)",
    )
    args = parser.parse_args()

    html = extract_body(fetch(args.title, args.lang, args.revision))

    if args.output == "-":
        sys.stdout.write(html)
    else:
        with open(args.output, "w", encoding="utf-8") as f:
            f.write(html)


if __name__ == "__main__":
    main()
