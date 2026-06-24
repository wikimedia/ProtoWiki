<script setup lang="ts">
interface Props {
  title: string
}

defineProps<Props>()
</script>

<template>
  <div class="musical-group-title-row">
    <div class="musical-group-title-row__inner">
      <div class="musical-group-title-row__lead">
        <slot name="lead" />
        <h1 class="musical-group-title-row__title">{{ title }}</h1>
      </div>

      <div v-if="$slots.actions" class="musical-group-title-row__actions">
        <slot name="actions" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.musical-group-title-row {
  position: relative;
  padding-inline: var(--spacing-50);
  background-color: var(--background-color-base);
}

.musical-group-title-row::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: var(--spacing-50);
  right: var(--spacing-50);
  height: 1px;
  background-color: var(--color-base);
  transition:
    left 25ms linear,
    right 25ms linear;
}

.musical-group-title-row__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: var(--spacing-50);
}

.musical-group-title-row__lead {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.musical-group-title-row__title {
  margin: 0;
  font-family: var(--font-family-serif);
  font-size: var(--font-size-xxx-large);
  font-weight: var(--font-weight-normal);
  line-height: var(--line-height-xxx-large);
  color: var(--color-base);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.musical-group-title-row__actions {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 12px;
}

@media (prefers-reduced-motion: reduce) {
  .musical-group-title-row::after {
    transition: none;
  }
}
</style>
