<script setup lang="ts">
import { CdxIcon } from '@wikimedia/codex'
import { cdxIconArrowDown, cdxIconLinkExternal } from '@wikimedia/codex-icons'

import type { WikilinkCardData } from './fetchCardData'
import SectionExcerpt from './SectionExcerpt.vue'
import WikilinkSignals from './WikilinkSignals.vue'

/**
 * The link preview's content: image, title, summary (or section excerpt), signals and
 * "Read full article". Shared by the hover card (desktop) and the preview sheet (mobile).
 * The summary's line limit comes from `--wikilink-card-extract-lines` on an ancestor.
 */
const props = defineProps<{
  data: WikilinkCardData
  /** "Read full article" expands in place (down arrow) rather than going off to the article. */
  expandIcon?: boolean
}>()

const emit = defineEmits<{
  /** Image or "Read full article" clicked. */
  open: [title: string, section?: string]
}>()

/** Plain left-clicks open the article here; modifier/middle clicks keep the link to Wikipedia. */
function onOpenClick(event: MouseEvent): void {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
  event.preventDefault()
  emit('open', props.data.title, props.data.section?.anchor)
}
</script>

<template>
  <div class="wikilink-preview" :class="{ 'wikilink-preview--no-image': !data.image }">
    <!-- Same destination as "Read full article", so kept out of the tab order (like the native preview). -->
    <a
      v-if="data.image"
      class="wikilink-card__image-link"
      :href="data.url"
      target="_blank"
      rel="noopener"
      tabindex="-1"
      aria-hidden="true"
      @click="onOpenClick"
    >
      <img class="wikilink-card__image" :src="data.image" alt="" />
    </a>
    <div class="wikilink-card__body">
      <!-- Plain text: the image and "Read full article" are the ways in. -->
      <h2 class="wikilink-card__title">
        {{ data.section ? `${data.title} → ${data.section.heading}` : data.title }}
      </h2>
      <div class="wikilink-card__content">
        <!-- HTML from Wikipedia's REST summary, as the native preview uses (wikilink.js). -->
        <!-- Section links show the linked section's opening instead of the article summary. -->
        <SectionExcerpt
          v-if="data.section"
          :heading="data.section.heading"
          :excerpt="data.section.excerpt"
        />
        <div
          v-else-if="data.extractHtml"
          class="wikilink-card__extract"
          v-html="data.extractHtml"
        />
        <p v-else class="wikilink-card__extract">{{ data.extract }}</p>
        <WikilinkSignals
          :created-at="data.createdAt"
          :edits-this-week="data.editsThisWeek"
          :history-url="data.historyUrl"
        />
        <a
          class="wikilink-card__link"
          :href="data.url"
          target="_blank"
          rel="noopener"
          @click="onOpenClick"
        >
          Read full article
          <CdxIcon :icon="expandIcon ? cdxIconArrowDown : cdxIconLinkExternal" size="small" />
        </a>
      </div>
    </div>
  </div>
</template>

<style scoped>
.wikilink-preview {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-75);
  padding-bottom: var(--spacing-75);
}

/* No image: a little room above the title. */
.wikilink-preview--no-image {
  padding-top: var(--spacing-50);
}

.wikilink-card__image {
  display: block;
  width: 100%;
  /* Shorter than the design's 500 / 373 so the card isn't mostly image. */
  aspect-ratio: 2 / 1;
  object-fit: cover;
}

.wikilink-card__body {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-75);
  padding: 0 var(--spacing-100);
}

.wikilink-card__title {
  margin: 0;
  padding: 0 0 var(--spacing-50);
  border: 0;
  border-bottom: var(--border-width-base) var(--border-style-base) var(--background-color-inverted);
  font-family: var(--font-family-serif);
  font-size: var(--font-size-xx-large);
  font-weight: var(--font-weight-normal);
  line-height: var(--line-height-xx-large);
  color: var(--color-base);
  overflow-wrap: break-word;
}

.wikilink-card__image-link {
  display: block;
}

.wikilink-card__content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-75);
}

.wikilink-card__extract :deep(p) {
  margin: 0;
}

/*
 * Type is one Codex step smaller than the Figma token names: the design file uses a 14px
 * base, Codex here uses 16px. That puts the extract at 14px, like the native preview.
 */
.wikilink-card__extract {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: var(--wikilink-card-extract-lines);
  overflow: hidden;
  margin: 0;
  font-family: var(--font-family-base);
  font-size: var(--font-size-small);
  line-height: var(--line-height-small);
}

.wikilink-card__link {
  display: inline-flex;
  align-items: center;
  align-self: flex-start;
  gap: var(--spacing-25);
  border-radius: var(--border-radius-base);
  font-family: var(--font-family-base);
  font-size: var(--font-size-small);
  line-height: var(--line-height-small);
  color: var(--color-progressive);
  text-decoration: none;
}

/* Codex icons default to the base text colour; follow the link's progressive colour instead. */
.wikilink-card__link .cdx-icon {
  color: inherit;
}

.wikilink-card__link:hover {
  color: var(--color-progressive--hover);
  text-decoration: underline;
}

.wikilink-card__link:active {
  color: var(--color-progressive--active);
}

.wikilink-card__link:focus-visible {
  outline: var(--border-width-thick) var(--border-style-base)
    var(--outline-color-progressive--focus);
}
</style>
