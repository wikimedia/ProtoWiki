<script setup lang="ts">
withDefaults(
  defineProps<{
    message?: string
    /** Reserve one card’s height so stacked seed modules don’t sit tight. */
    reserveCardHeight?: boolean
  }>(),
  {
    message: 'Nothing saved yet.',
    reserveCardHeight: false,
  },
)
</script>

<template>
  <!--
    Shared seed-empty copy for Saved (home + fullscreen), Daily reads, and Help
    wanted — same markup/CSS so title→empty spacing cannot drift.
  -->
  <p
    class="wikitab-nothing-saved-yet"
    :class="{ 'wikitab-nothing-saved-yet--card-height': reserveCardHeight }"
  >
    {{ message }}
  </p>
</template>

<style scoped>
.wikitab-nothing-saved-yet {
  margin: 0;
  color: var(--color-subtle);
}

.wikitab-nothing-saved-yet--card-height {
  min-height: var(--wikitab-card-height);
}
</style>
