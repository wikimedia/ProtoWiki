<script setup lang="ts">
import emptyStateIllustration from './collection-empty-state.svg'
</script>

<template>
  <div class="saved-pages-empty">
    <img
      class="saved-pages-empty__illustration"
      :src="emptyStateIllustration"
      alt=""
      width="156"
      height="156"
    />
    <h3 class="saved-pages-empty__heading">No saved articles</h3>
    <p class="saved-pages-empty__body">
      Use the bookmark icon on any article to save it here for later.
    </p>
  </div>
</template>

<style scoped>
.saved-pages-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-block: var(--spacing-200, 32px) var(--spacing-300, 48px);
  padding-inline: var(--spacing-100, 16px);
  text-align: center;
}

.saved-pages-empty__illustration {
  display: block;
  margin-bottom: var(--spacing-150, 24px);
}

.saved-pages-empty__heading {
  margin: 0 0 var(--spacing-75, 12px);
  max-width: 24rem;
}

.saved-pages-empty__body {
  margin: 0;
  max-width: 22rem;
  color: var(--color-base, #202122);
}
</style>
