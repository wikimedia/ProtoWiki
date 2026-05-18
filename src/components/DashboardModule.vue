<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import type { RouteLocationRaw } from 'vue-router'
import { CdxButton, CdxIcon } from '@wikimedia/codex'
import { cdxIconArrowNext } from '@wikimedia/codex-icons'

interface Props {
  /** Shown as the module heading row. */
  title?: string
  /**
   * Navigation target — tappable link card (title row, arrow, body, optional blue CTA).
   * Any Vue Router **`RouteLocationRaw`** (paths, named routes, queries, or **`https://…`** strings).
   */
  to?: RouteLocationRaw
  /**
   * Label for the bottom **`.mobile-card__button`** strip when **`to`** is set.
   * **`null`** hides the strip entirely (link behaviour unchanged).
   * **`''`** keeps the strip for a custom **`#cta`** slot without default button text.
   */
  cta?: string | null
}

const props = withDefaults(defineProps<Props>(), {
  title: undefined,
  to: undefined,
  cta: '',
})

/** Resolves **`to`** for **`RouterLink`**; plain **string** targets are trimmed (whitespace-only → no link card). */
const linkCard = computed((): { to: RouteLocationRaw } | null => {
  const to = props.to
  if (to == null) return null
  if (typeof to === 'string') {
    const t = to.trim()
    if (!t.length) return null
    return { to: t }
  }
  if (typeof to === 'object') {
    return { to }
  }
  return null
})

function trimmedTitle(): string {
  const t = props.title
  if (t == null) return ''
  return String(t).trim()
}
</script>

<template>
  <RouterLink
    v-if="linkCard"
    :to="linkCard.to"
    class="mobile-card mobile-card--link dashboard-module dashboard-slot"
  >
    <div v-if="trimmedTitle()" class="mobile-card__header">
      <span class="mobile-card__title">{{ trimmedTitle() }}</span>
      <CdxButton weight="quiet" :icon-only="true" aria-label="Open" tabindex="-1">
        <CdxIcon :icon="cdxIconArrowNext" />
      </CdxButton>
    </div>
    <div class="mobile-card__content mobile-card__content--preview dashboard-module__body">
      <slot />
    </div>
    <slot v-if="props.cta !== null" name="cta">
      <span v-if="props.cta?.trim()" class="mobile-card__button">{{ props.cta }}</span>
    </slot>
  </RouterLink>

  <section v-else class="sidebar-card dashboard-module dashboard-slot">
    <div v-if="trimmedTitle()" class="sidebar-card__title">
      {{ trimmedTitle() }}
    </div>
    <div class="dashboard-module__body">
      <slot />
    </div>
  </section>
</template>

<style>
/* Module cards: sidebar + mobile link variants */
.mobile-card {
  border: 1px solid var(--border-color-subtle, #a2a9b1);
  border-radius: 2px;
  padding: 1rem;
}

.mobile-card--link {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  text-decoration: none;
  color: inherit;
}

.mobile-card--link:visited,
.mobile-card--link:visited:hover {
  text-decoration: none;
  color: inherit;
}

.mobile-card--link:hover,
.mobile-card--link:focus {
  outline: none;
  background-color: var(--background-color-interactive, #eaecf0);
  text-decoration: none;
  color: inherit;
}

.mobile-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.mobile-card__title {
  font-weight: bold;
  font-size: var(--font-size-medium);
}

.mobile-card__content {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  line-height: var(--line-height-medium);
  font-size: var(--font-size-medium);
}

.mobile-card__content--stacked {
  flex-direction: column;
  gap: 0.5rem;
}

.mobile-card:not(.mobile-card--link) .mobile-card__content {
  margin-top: 0.75rem;
}

.mobile-card__content-icon {
  color: var(--color-base--subtle, #54595d);
  flex-shrink: 0;
  margin-top: 0.1em;
}

.mobile-card__content-text {
  flex: 1;
  min-width: 0;
  color: var(--color-base, #202122);
}

.mobile-card__content--preview {
  flex-direction: column;
  align-items: stretch;
  gap: 0;
  line-height: 1.4;
}

.mobile-card__stat-icon {
  color: var(--color-base--subtle, #54595d);
  flex-shrink: 0;
}

.mobile-card__stat {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  column-gap: var(--spacing-50, 8px);
  row-gap: var(--spacing-25, 4px);
  min-width: 0;
}

.mobile-card__stat-link {
  color: var(--color-progressive, #36c);
  font-weight: 700;
  text-decoration: none;
}

.mobile-card__stat-link:hover {
  text-decoration: underline;
}

.mobile-card__stat-value {
  font-weight: 700;
}

.mobile-card__button {
  display: block;
  align-self: stretch;
  width: 100%;
  margin-top: 0.25rem;
  padding: 0.25rem 1rem;
  background-color: var(--background-color-progressive, #36c);
  color: var(--color-inverted, #fff);
  font-size: var(--font-size-small);
  font-weight: 700;
  text-align: center;
  border-radius: 2px;
  border: none;
  cursor: pointer;
  box-sizing: border-box;
}

.sidebar-card {
  border: 1px solid var(--border-color-subtle, #a2a9b1);
  border-radius: 2px;
  padding: 1rem;
}

.sidebar-card__title {
  margin: 0 0 var(--spacing-75) 0;
  padding: 0;
  font-weight: var(--font-weight-bold);
  font-size: var(--font-size-medium);
}

.sidebar-card .cdx-label {
  font-size: 14px;
}

.dashboard-module__body {
  min-width: 0;
}

</style>
