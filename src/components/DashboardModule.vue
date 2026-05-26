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
  /** Light blue informational tint (**`--background-color-progressive-subtle`**). */
  subtle?: boolean
  /**
   * Static mobile card (no **`RouterLink`**) — stacked title + body like a link card,
   * but tappable controls in the body/header stay interactive.
   */
  mobileCard?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  title: undefined,
  to: undefined,
  cta: '',
  subtle: false,
  mobileCard: false,
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
    :class="{ 'dashboard-module--subtle': props.subtle }"
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

  <section
    v-else-if="props.mobileCard"
    class="mobile-card dashboard-module dashboard-slot"
    :class="{ 'dashboard-module--subtle': props.subtle }"
  >
    <div v-if="trimmedTitle()" class="mobile-card__header">
      <span class="mobile-card__title">{{ trimmedTitle() }}</span>
      <div v-if="$slots['header-actions']" class="mobile-card__header-actions">
        <slot name="header-actions" />
      </div>
    </div>
    <div class="mobile-card__content mobile-card__content--preview dashboard-module__body">
      <slot />
    </div>
  </section>

  <section
    v-else
    class="sidebar-card dashboard-module dashboard-slot"
    :class="{ 'dashboard-module--subtle': props.subtle }"
  >
    <div v-if="trimmedTitle()" class="sidebar-card__header">
      <span class="sidebar-card__title">{{ trimmedTitle() }}</span>
      <div v-if="$slots['header-actions']" class="sidebar-card__header-actions">
        <slot name="header-actions" />
      </div>
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

.mobile-card--link,
.mobile-card:not(.mobile-card--link) {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.mobile-card--link {
  text-decoration: none;
  color: inherit;
  -webkit-tap-highlight-color: transparent;
}

.mobile-card--link:visited,
.mobile-card--link:visited:hover {
  text-decoration: none;
  color: inherit;
}

.mobile-card--link:hover,
.mobile-card--link:focus,
.mobile-card--link:active {
  outline: none;
  text-decoration: none;
  color: inherit;
}

.mobile-card--link:focus-visible {
  outline: 2px solid var(--color-progressive, #36c);
  outline-offset: 2px;
}

.dashboard-module--subtle.mobile-card,
.dashboard-module--subtle.sidebar-card {
  background-color: var(--background-color-progressive-subtle, #e8eeff);
}

@media (hover: hover) and (pointer: fine) {
  .mobile-card--link:hover {
    background-color: var(--background-color-interactive, #eaecf0);
  }

  .dashboard-module--subtle.mobile-card--link:hover {
    background-color: var(--background-color-progressive-subtle--hover, #d9e2ff);
  }
}

.mobile-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.mobile-card__header-actions {
  display: flex;
  flex-shrink: 0;
  align-items: center;
}

.mobile-card__header-actions .cdx-button.cdx-button--icon-only {
  min-width: var(--min-size-interactive-pointer, 32px);
  min-height: var(--min-size-interactive-pointer, 32px);
  width: var(--min-size-interactive-pointer, 32px);
  height: var(--min-size-interactive-pointer, 32px);
  padding: 0;
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
  margin-top: var(--spacing-75, 12px);
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

.sidebar-card__header {
  position: relative;
  display: flex;
  align-items: center;
  box-sizing: border-box;
  min-height: calc(var(--font-size-medium, 1rem) * var(--line-height-medium, 1.375));
  margin: 0 0 var(--spacing-75) 0;
  overflow: visible;
  font-size: var(--font-size-medium);
  line-height: var(--line-height-medium, 1.375);
}

.sidebar-card__title {
  margin: 0;
  padding: 0;
  font-weight: var(--font-weight-bold);
  font-size: inherit;
  line-height: inherit;
}

.sidebar-card__header:has(.sidebar-card__header-actions) .sidebar-card__title {
  padding-right: calc(var(--min-size-interactive-pointer, 32px) + var(--spacing-50, 8px));
}

.sidebar-card__header-actions {
  position: absolute;
  top: 50%;
  right: 0;
  display: flex;
  flex-shrink: 0;
  align-items: center;
  transform: translateY(-50%);
}

/* Full Codex touch target; header height is fixed so this overflows vertically, not layout. */
.sidebar-card__header-actions .cdx-button.cdx-button--icon-only {
  min-width: var(--min-size-interactive-pointer, 32px);
  min-height: var(--min-size-interactive-pointer, 32px);
  width: var(--min-size-interactive-pointer, 32px);
  height: var(--min-size-interactive-pointer, 32px);
  padding: 0;
}

.sidebar-card .cdx-label {
  font-size: 14px;
}

.dashboard-module__body {
  min-width: 0;
}

</style>
