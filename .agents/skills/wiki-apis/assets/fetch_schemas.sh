#!/usr/bin/env bash
# Snapshot Wikimedia REST OpenAPI specs + Action API paraminfo into
# .agents/skills/wiki-apis/assets/snapshots/. Re-run when upstream
# schemas change or you want a fresh copy.
#
# MediaWiki exposes a REST handler at /api/rest_v1/ on each wiki host,
# but different deployments publish different routes — e.g.
# en.wikipedia.org (article APIs), wikimedia.org (metrics / analytics),
# commons.wikimedia.org (minimal surface), www.wikidata.org (entity-aware
# routes). Each has its own ?spec document.
#
# Usage:
#   bash fetch_schemas.sh
#           → writes four REST OpenAPI JSON files + Wikipedia Action paraminfo
#             under assets/snapshots/
#   bash fetch_schemas.sh www.wikidata.org wikidata
#           → writes rest-api-spec.json + action-api-paraminfo.json for that
#             host only, under assets/snapshots/wikidata/ (for wiki-specific
#             Action modules without overwriting the default bundle)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
UA='ProtoWiki-snapshot/0.1 (https://github.com/wikimedia/protowiki; protowiki@wikimedia.org)'

pretty_json() {
  python3 -c 'import sys, json; json.dump(json.load(sys.stdin), sys.stdout, indent=2, sort_keys=True)'
}

fetch_rest_spec_to() {
  local host="$1"
  local out="$2"
  local url="https://${host}/api/rest_v1/?spec"
  curl -sSL --user-agent "$UA" "$url" \
    | pretty_json > "$out"
  echo "      wrote $out ($(wc -c < "$out") bytes)"
}

fetch_action_paraminfo_to() {
  local host="$1"
  local out="$2"

  MODULES='main|query|opensearch|parse|edit|login'
  MODULES+='|query+info|query+extracts|query+pageprops|query+pageimages'
  MODULES+='|query+imageinfo|query+search|query+categorymembers|query+allpages'
  MODULES+='|query+geosearch|query+languagelinks|query+tokens|query+siteinfo'

  local url="https://${host}/w/api.php?action=paraminfo&modules=${MODULES}&format=json&formatversion=2"
  curl -sSL --user-agent "$UA" "$url" \
    | pretty_json > "$out"
  echo "      wrote $out ($(wc -c < "$out") bytes)"
}

if [[ $# -eq 2 ]]; then
  HOST="$1"
  SUBDIR="$2"
  OUT_DIR="$SCRIPT_DIR/snapshots/$SUBDIR"
  mkdir -p "$OUT_DIR"

  REST_OUT="$OUT_DIR/rest-api-spec.json"
  ACTION_OUT="$OUT_DIR/action-api-paraminfo.json"

  echo "[1/2] Fetching REST spec from https://${HOST}/api/rest_v1/?spec"
  fetch_rest_spec_to "$HOST" "$REST_OUT"

  echo "[2/2] Fetching Action API paraminfo from https://${HOST}/w/api.php …"
  fetch_action_paraminfo_to "$HOST" "$ACTION_OUT"

  echo
  echo "Done. Snapshots in $OUT_DIR/"
  exit 0
fi

if [[ $# -gt 0 ]]; then
  echo "Usage: bash fetch_schemas.sh"
  echo "   or: bash fetch_schemas.sh <host> <subdir>"
  exit 1
fi

OUT_DIR="$SCRIPT_DIR/snapshots"
mkdir -p "$OUT_DIR"

# ---- Multiple REST deployments (each publishes OpenAPI at ?spec) ------------

REST_TARGETS=(
  "en.wikipedia.org|rest-api-spec.wikipedia.json"
  "wikimedia.org|rest-api-spec.wikimedia-org.json"
  "commons.wikimedia.org|rest-api-spec.commons.json"
  "www.wikidata.org|rest-api-spec.wikidata.json"
)

TOTAL=$(( ${#REST_TARGETS[@]} + 1 ))
STEP=0

for entry in "${REST_TARGETS[@]}"; do
  STEP=$((STEP + 1))
  HOST_PART="${entry%%|*}"
  FILE_PART="${entry##*|}"
  echo "[$STEP/$TOTAL] Fetching REST spec https://${HOST_PART}/api/rest_v1/?spec"
  fetch_rest_spec_to "$HOST_PART" "$OUT_DIR/$FILE_PART"
done

STEP=$((STEP + 1))
echo "[$STEP/$TOTAL] Fetching Action API paraminfo (en.wikipedia.org / curated modules)"
fetch_action_paraminfo_to "en.wikipedia.org" "$OUT_DIR/action-api-paraminfo.json"

echo
echo "Done. Snapshots in $OUT_DIR/"
