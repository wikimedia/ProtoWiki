<script setup lang="ts">
import { computed, useSlots } from 'vue'

/**
 * Minimal centred column — FakeMediaWiki “Component” wrapper parity:
 * no Wikipedia chrome, max-width + horizontal padding only.
 *
 * Primary reader-style heading is a `<header>` with `<h1 class="mw-first-heading">`.
 * Pass `heading` for plain text or `#heading` for rich markup inside that `h1`.
 * Optional `#actions` slot renders inside the same `<header>` (e.g. toolbar controls).
 */
interface Props {
  /** BCP-47 language tag on the root (optional). */
  lang?: string
  /** Writing direction on the root (optional). */
  dir?: 'ltr' | 'rtl'
  /**
   * Plain-text page heading — renders inside `<h1 class="mw-first-heading">`.
   * Omit both this and `#heading` when the surface has no primary title.
   */
  heading?: string
}

const props = withDefaults(defineProps<Props>(), {
  lang: undefined,
  dir: undefined,
  heading: undefined,
})

const slots = useSlots()

const showHeading = computed(() => {
  if (slots.heading) return true
  const h = props.heading
  return typeof h === 'string' && h.length > 0
})

</script>

<template>
  <main class="plain-wrapper" :lang="props.lang" :dir="props.dir">
    <h1 v-if="showHeading" class="mw-first-heading">
      <slot name="heading">{{ props.heading }}</slot>
      <div v-if="slots.actions" class="plain-wrapper__header-actions">
        <slot name="actions" />
      </div>
    </h1>
    <slot />
  </main>
</template>

<style scoped>
main {
  box-sizing: border-box;
  max-width: 45rem;
  margin: 0 auto;
  padding: var(--spacing-250) var(--spacing-100);
  background-color: var(--background-color-base);
}

h1 {
  display: flex;
  justify-content: space-between;
}

.plain-wrapper__header-actions {
  font-family: var(--font-family-system-sans);
}
</style>
