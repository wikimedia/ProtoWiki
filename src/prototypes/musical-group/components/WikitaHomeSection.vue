<script setup lang="ts">
interface Props {
  title: string
}

defineProps<Props>()
</script>

<template>
  <section class="wikita-home-section">
    <h2 class="wikita-home-section__title">{{ title }}</h2>
    <div class="wikita-home-section__cards">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.wikita-home-section {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-50);
  width: 100%;
}

/* Matches the Codex Heading 3 used for facts like "Musical group since …". */
.wikita-home-section__title {
  margin: 0;
  font-family: var(--font-family-base);
  font-size: var(--font-size-x-large);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-x-large);
  color: var(--color-base);
}

.wikita-home-section__cards {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-50);
}
</style>
