<script setup lang="ts">
defineSlots<{
  header(): unknown
  meta?(): unknown
  body?(): unknown
  footer?(): unknown
  thumbnail?(): unknown
}>()
</script>

<template>
  <article class="overview-summary-card">
    <div class="overview-summary-card__header-row">
      <div class="overview-summary-card__lead">
        <slot name="header" />
        <small v-if="$slots.meta" class="overview-summary-card__meta">
          <slot name="meta" />
        </small>
      </div>
      <div v-if="$slots.thumbnail" class="overview-summary-card__thumb-wrap">
        <slot name="thumbnail" />
      </div>
    </div>
    <div v-if="$slots.body" class="overview-summary-card__body">
      <slot name="body" />
    </div>
    <small v-if="$slots.footer" class="overview-summary-card__footer">
      <slot name="footer" />
    </small>
  </article>
</template>

<style scoped>
.overview-summary-card {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-50);
  padding: var(--spacing-100);
  border: 1px solid var(--color-base);
  border-radius: 6px;
  background-color: var(--background-color-base);
}

.overview-summary-card__header-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--spacing-50);
}

.overview-summary-card__lead {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.overview-summary-card__meta {
  display: flex;
  flex-direction: column;
  gap: 0;
  color: var(--color-base);
}

.overview-summary-card__thumb-wrap {
  flex-shrink: 0;
  /* Title row + 6px gap + two meta lines */
  height: calc(var(--line-height-small) * 3 + 6px);
}

.overview-summary-card__thumb-wrap :deep(.overview-summary-card__thumb) {
  display: block;
  width: calc(var(--line-height-small) * 3 + 6px);
  height: 100%;
  object-fit: cover;
  border: 1px solid var(--color-base);
}

.overview-summary-card__body {
  min-width: 0;
}

.overview-summary-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-50);
  color: var(--color-base);
}
</style>
