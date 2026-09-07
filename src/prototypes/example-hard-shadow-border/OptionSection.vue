<script setup lang="ts">
defineProps<{
  title: string
  note: string
  verdict?: string
  avoid?: boolean
}>()
</script>

<template>
  <section
    class="option-section"
    :class="{ 'option-section--avoid': avoid }"
  >
    <header class="option-section__header">
      <h2 class="option-section__title">{{ title }}</h2>
      <p v-if="verdict" class="option-section__verdict">{{ verdict }}</p>
    </header>
    <p class="option-section__note">{{ note }}</p>
    <div class="option-section__demo">
      <slot name="demo" />
    </div>
    <div class="option-section__loupe-wrap">
      <p class="option-section__loupe-label">Bottom-right corner (4×)</p>
      <div class="option-section__loupe" aria-hidden="true">
        <div class="option-section__loupe-viewport">
          <div class="option-section__loupe-content">
            <slot name="loupe" />
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.option-section {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-75);
  padding: var(--spacing-150);
  border: 1px solid var(--border-color-subtle);
  border-radius: var(--border-radius-base);
  background-color: var(--background-color-neutral-subtle);
}

.option-section--avoid {
  border-color: var(--border-color-error);
}

.option-section__header {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: var(--spacing-50) var(--spacing-100);
}

.option-section__title {
  margin: 0;
  font-family: var(--font-family-system-sans);
  font-size: var(--font-size-medium);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-medium);
}

.option-section__verdict {
  margin: 0;
  color: var(--color-subtle);
  font-family: var(--font-family-system-sans);
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-normal);
  line-height: var(--line-height-small);
}

.option-section--avoid .option-section__verdict {
  color: var(--color-error);
}

.option-section__note {
  margin: 0;
  color: var(--color-subtle);
  font-family: var(--font-family-system-sans);
  font-size: var(--font-size-small);
  line-height: var(--line-height-small);
}

.option-section__demo {
  padding: var(--spacing-100);
  border-radius: var(--border-radius-base);
  background-color: var(--background-color-base);
}

.option-section__loupe-wrap {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-25);
}

.option-section__loupe-label {
  margin: 0;
  color: var(--color-subtle);
  font-family: var(--font-family-system-sans);
  font-size: var(--font-size-small);
  line-height: var(--line-height-small);
}

.option-section__loupe {
  align-self: flex-start;
  width: 48px;
  height: 48px;
  overflow: hidden;
  border: 1px solid var(--border-color-subtle);
  border-radius: var(--border-radius-base);
  background-color: var(--background-color-base);
}

.option-section__loupe-viewport {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.option-section__loupe-content {
  position: absolute;
  right: 0;
  bottom: 0;
  transform: scale(4);
  transform-origin: bottom right;
}
</style>
