<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router'

const route = useRoute()

const wordmarkSrc = `${import.meta.env.BASE_URL}images/wikitab-wordmark.svg`
</script>

<template>
  <RouterLink class="wikitab-wordmark__link" :to="{ path: route.path, query: {} }">
    <img
      class="wikitab-wordmark__img"
      :src="wordmarkSrc"
      alt="Wikitab"
      width="108"
      height="46"
      decoding="async"
    />
  </RouterLink>
</template>

<style scoped>
.wikitab-wordmark__link {
  display: block;
  color: inherit;
  text-decoration: none;
}

.wikitab-wordmark__link:hover,
.wikitab-wordmark__link:focus-visible {
  text-decoration: none;
  opacity: 0.85;
}

.wikitab-wordmark__img {
  --wikitab-wordmark-height: 48px;
  display: block;
  height: var(--wikitab-wordmark-height);
  width: auto;
  min-width: calc(var(--wikitab-wordmark-height) * 108 / 46);
}
</style>
