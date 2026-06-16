#!/usr/bin/env bash
# Snapshot the Vector 2022 + Minerva ResourceLoader CSS bundles needed
# to faithfully render .mw-parser-output article bodies.
#
# **ProtoWiki repo:** prefer `npm run snapshot-wiki-skins` from the repo root —
# that script matches module lists here, writes `*.rl.css`, and runs PostCSS
# scoping (`scripts/scope-wiki-skin-css.mjs`).
#
# Usage (standalone copy):
#   bash fetch_skin_css.sh                  # writes to ./src/styles/wiki-skins/
#   bash fetch_skin_css.sh path/to/dir/
#
# Re-run every few months; Wikipedia skin CSS evolves.

set -euo pipefail

OUT_DIR="${1:-src/styles/wiki-skins}"
mkdir -p "$OUT_DIR"

UA='ProtoWiki-snapshot/0.1 (https://github.com/<org>/protowiki; <contact>)'

VECTOR_MODULES='site.styles|skins.vector.styles|ext.cite.styles|mediawiki.skinning.content.parsoid|mediawiki.hlist|mediawiki.ui.button|mediawiki.skinning.interface'
MINERVA_MODULES='site.styles|skins.minerva.base.styles|skins.minerva.styles|ext.cite.styles|mediawiki.skinning.content.parsoid|mediawiki.hlist|mediawiki.skinning.interface'

vector_url="https://en.wikipedia.org/w/load.php?lang=en&modules=$(printf '%s' "$VECTOR_MODULES" | jq -sRr @uri 2>/dev/null || python3 -c 'import sys,urllib.parse;print(urllib.parse.quote(sys.argv[1], safe=""))' "$VECTOR_MODULES")&only=styles&skin=vector-2022"
minerva_url="https://en.wikipedia.org/w/load.php?lang=en&modules=$(printf '%s' "$MINERVA_MODULES" | jq -sRr @uri 2>/dev/null || python3 -c 'import sys,urllib.parse;print(urllib.parse.quote(sys.argv[1], safe=""))' "$MINERVA_MODULES")&only=styles&skin=minerva"

curl -sSL --user-agent "$UA" "$vector_url"  > "$OUT_DIR/vector-2022.css"
curl -sSL --user-agent "$UA" "$minerva_url" > "$OUT_DIR/minerva.css"

echo "Wrote:"
echo "  $OUT_DIR/vector-2022.css ($(wc -c < "$OUT_DIR/vector-2022.css") bytes)"
echo "  $OUT_DIR/minerva.css ($(wc -c < "$OUT_DIR/minerva.css") bytes)"
