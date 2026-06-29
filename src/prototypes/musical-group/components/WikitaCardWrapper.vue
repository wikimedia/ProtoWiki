<script setup lang="ts">
import { RouterLink, type RouteLocationRaw } from 'vue-router'

interface Props {
  href?: RouteLocationRaw
  externalHref?: string
}

defineProps<Props>()
</script>

<template>
  <a
    v-if="externalHref && !href"
    :href="externalHref"
    class="wikita-card-wrapper wikita-card-wrapper--link"
    target="_blank"
    rel="noopener noreferrer"
  >
    <div class="wikita-card-wrapper__inner">
      <slot />
    </div>
  </a>

  <RouterLink v-else-if="href" v-slot="{ href: linkHref, navigate }" :to="href" custom>
    <a
      :href="linkHref"
      class="wikita-card-wrapper wikita-card-wrapper--link"
      @click="navigate"
    >
      <div class="wikita-card-wrapper__inner">
        <slot />
      </div>
    </a>
  </RouterLink>

  <article v-else class="wikita-card-wrapper">
    <div class="wikita-card-wrapper__inner">
      <slot />
    </div>
  </article>
</template>

<style scoped>
.wikita-card-wrapper {
  box-sizing: border-box;
  display: flex;
  width: 100%;
  margin: 0;
  padding: 0;
  border: 1px solid var(--color-base);
  border-radius: 4px;
  background-color: var(--background-color-base);
  color: var(--color-base);
  font: inherit;
  text-align: start;
  text-decoration: none;
}

.wikita-card-wrapper--link {
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.wikita-card-wrapper--link:hover,
.wikita-card-wrapper--link:focus,
.wikita-card-wrapper--link:visited {
  color: var(--color-base);
  text-decoration: none;
}

.wikita-card-wrapper__inner {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  padding: var(--spacing-100);
}
</style>
