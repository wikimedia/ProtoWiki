<script setup lang="ts">
/**
 * Essential attribution for the quiz sentence (Wikimedia Attribution Framework,
 * "Games & rich media" scenario), in this hierarchy:
 *
 *   Content adapted from            ← modification disclaimer
 *   <Article name>                  ← title, linked (keeps `wprov`) — the focus
 *   from <Wiki> by Wikipedia contributors · CC BY-SA 4.0
 *                                   ← source + credit (history link) + license,
 *                                     one small subtle line
 *
 * The source is named in text, so no brand mark is needed.
 *
 * Values come from the Attribution API; until it answers (or if it fails) the
 * same fields are filled from known French Wikipedia defaults, so the required
 * signals are never missing.
 */
import { computed } from 'vue'

import type { AttributionSignals } from '@/components/attribution/types'

const props = defineProps<{
  title: string
  host: string
  signals: AttributionSignals | null
}>()

const FALLBACK_LICENSE = { short: 'CC BY-SA 4.0', url: 'https://creativecommons.org/licenses/by-sa/4.0/deed.fr' }

/**
 * The API sends a `short` name ("CC BY-SA 4.0") but the shared parser in
 * `@/components/attribution` keeps only title + url, so derive it from a
 * Creative Commons URL: …/licenses/by-sa/4.0/… → "CC BY-SA 4.0".
 */
function shortLicenseName(url: string | undefined): string | undefined {
  const match = url?.match(/creativecommons\.org\/licenses\/([a-z-]+)\/([\d.]+)/)
  return match ? `CC ${match[1].toUpperCase()} ${match[2]}` : undefined
}

const attribution = computed(() => {
  const essential = props.signals?.essential
  const encoded = encodeURIComponent(props.title.replace(/ /g, '_'))
  const license = essential?.license as { title: string; url: string; short?: string } | undefined
  return {
    source: essential?.source_wiki?.site_name ?? 'Wikipédia en français',
    sourceLink: `https://${props.host}/?wprov=afsw1`,
    title: essential?.title ?? props.title,
    link: essential?.link ?? `https://${props.host}/w/index.php?title=${encoded}&wprov=afsw1`,
    // Article text has no single author: credit its contributors via the history.
    history: `https://${props.host}/w/index.php?title=${encoded}&action=history`,
    licenseName: license?.short ?? shortLicenseName(license?.url) ?? license?.title ?? FALLBACK_LICENSE.short,
    licenseUrl: license?.url ?? FALLBACK_LICENSE.url,
  }
})
</script>

<template>
  <div class="source-attribution">
    <p class="source-attribution__lead">Content adapted from</p>
    <a class="source-attribution__title" :href="attribution.link" target="_blank" rel="noopener" lang="fr">{{
      attribution.title
    }}</a>
    <p class="source-attribution__meta">
      from
      <a class="source-attribution__source" :href="attribution.sourceLink" target="_blank" rel="noopener">{{
        attribution.source
      }}</a>
      by
      <a class="source-attribution__credit" :href="attribution.history" target="_blank" rel="noopener"
        >Wikipedia contributors</a
      >
      ·
      <a class="source-attribution__license" :href="attribution.licenseUrl" target="_blank" rel="noopener license">{{
        attribution.licenseName
      }}</a>
    </p>
  </div>
</template>

<style scoped>
.source-attribution {
  display: flex;
  flex-direction: column;
  margin-top: var(--spacing-50);
  font-family: var(--font-family-base);
  font-size: var(--font-size-medium);
  font-weight: var(--font-weight-normal);
  line-height: var(--line-height-medium);
  color: var(--color-base);
}

.source-attribution p {
  margin: 0;
}

.source-attribution__title {
  font-size: var(--font-size-x-large);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-x-large);
  overflow-wrap: anywhere;
}

/* Source, credit and license links read as plain text (underline on hover) —
   the article title is the one blue link. */
.source-attribution__source {
  color: inherit;
}

.source-attribution__source:hover {
  text-decoration: underline;
}

/* Credit links to the page history but reads as plain text, as in the sketch. */
.source-attribution__credit {
  color: inherit;
}

.source-attribution__credit:hover {
  text-decoration: underline;
}

/* Source, credit and license share one quiet line under the title. */
.source-attribution__meta {
  margin-top: var(--spacing-25);
  font-size: var(--font-size-small);
  line-height: var(--line-height-small);
  color: var(--color-subtle);
}

.source-attribution__license {
  color: inherit;
}

.source-attribution__license:hover {
  text-decoration: underline;
}
</style>
