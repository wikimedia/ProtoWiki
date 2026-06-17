<script setup lang="ts">
interface Props {
  id?: string
  title: string
}

withDefaults(defineProps<Props>(), {
  id: undefined,
})
</script>

<template>
  <section :id="id" class="playground-section">
    <h4 class="playground-section__title">
      {{ title }}
    </h4>
    <slot />
  </section>
</template>

<style scoped>
.playground-section {
  /* display: flex; */
  /* flex-direction: column; */
  /* gap: var(--spacing-75); */
}

/* .playground-section__title {
  font-family: var(--font-family-base);
  font-size: var(--font-size-medium);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-medium);
  color: var(--color-base);
} */
</style>
