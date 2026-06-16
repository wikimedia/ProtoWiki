#!/usr/bin/env bash
# Fetch Vector 2022 + Minerva ResourceLoader bundles (English Wikipedia),
# then scope selectors for ProtoWiki [data-skin] — see scripts/scope-wiki-skin-css.mjs.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT_DIR="${1:-$ROOT/src/styles/wiki-skins}"
mkdir -p "$OUT_DIR"

# shellcheck source=api-user-agent.sh
source "$(dirname "$0")/api-user-agent.sh"
UA="$PROTOWIKI_API_USER_AGENT"

VECTOR_MODULES='site.styles|skins.vector.styles|ext.cite.styles|mediawiki.skinning.content.parsoid|mediawiki.hlist|mediawiki.ui.button|mediawiki.skinning.interface'
MINERVA_MODULES='site.styles|skins.minerva.base.styles|skins.minerva.styles|ext.cite.styles|mediawiki.skinning.content.parsoid|mediawiki.hlist|mediawiki.skinning.interface'

encode_modules() {
  if command -v jq >/dev/null 2>&1; then
    printf '%s' "$1" | jq -sRr @uri
  else
    python3 -c 'import sys,urllib.parse;print(urllib.parse.quote(sys.argv[1], safe=""))' "$1"
  fi
}

vector_url="https://en.wikipedia.org/w/load.php?lang=en&modules=$(encode_modules "$VECTOR_MODULES")&only=styles&skin=vector-2022"
minerva_url="https://en.wikipedia.org/w/load.php?lang=en&modules=$(encode_modules "$MINERVA_MODULES")&only=styles&skin=minerva"

curl -sSL --max-time 120 --user-agent "$UA" "$vector_url"  > "$OUT_DIR/vector-2022.rl.css"
curl -sSL --max-time 120 --user-agent "$UA" "$minerva_url" > "$OUT_DIR/minerva.rl.css"

echo "Fetched RL bundles to:"
echo "  $OUT_DIR/vector-2022.rl.css ($(wc -c < "$OUT_DIR/vector-2022.rl.css") bytes)"
echo "  $OUT_DIR/minerva.rl.css ($(wc -c < "$OUT_DIR/minerva.rl.css") bytes)"

cd "$ROOT"
node scripts/scope-wiki-skin-css.mjs
