<script setup lang="ts">
import { CdxIcon } from '@wikimedia/codex'
import { cdxIconQuotes } from '@wikimedia/codex-icons'

/**
 * The opening of a linked section — Figma "Frame 4" (Codex Attribution file, node 219:388):
 * a grey rounded box with a quotes icon, "from <section>", then the excerpt.
 */
defineProps<{
  heading: string
  excerpt: string
}>()
</script>

<template>
  <div class="section-excerpt">
    <p class="section-excerpt__source">
      <CdxIcon :icon="cdxIconQuotes" size="small" />
      <span>from <strong>{{ heading }}</strong></span>
    </p>
    <p class="section-excerpt__text">{{ excerpt }}</p>
  </div>
</template>

<style scoped>
.section-excerpt {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-25);
  padding: var(--spacing-50);
  border-radius: 8px;
  background-color: var(--background-color-neutral);
  color: var(--color-base);
}

/*
 * Design text is 14px on 22px in Figma's 14px base, which is one Codex step down here
 * (like the card's summary): small text on small lines.
 */
.section-excerpt__source,
.section-excerpt__text {
  margin: 0;
  font-family: var(--font-family-base);
  font-size: var(--font-size-small);
  line-height: var(--line-height-small);
}

.section-excerpt__source {
  display: flex;
  align-items: center;
  /* Figma: 6px between the icon and "from"; the nearest Codex step. */
  gap: var(--spacing-50);
}

.section-excerpt__source strong {
  font-weight: var(--font-weight-bold);
}

/* Figma draws the quotes icon at 14px, like the card's signal icons. */
.section-excerpt__source .cdx-icon {
  min-width: 14px;
  min-height: 14px;
  width: 14px;
  height: 14px;
}

/* Clamped by the card's fit-to-screen logic, like the summary it replaces. */
.section-excerpt__text {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: var(--wikilink-card-extract-lines, 6);
  overflow: hidden;
}
</style>
