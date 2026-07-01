<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, type RouteLocationRaw } from 'vue-router'

interface Props {
  href?: RouteLocationRaw
  externalHref?: string
  allowNestedInteractive?: boolean
  coverLinkLabelledBy?: string
  /** When true (default), use `--border-color-muted` instead of `--color-base`. */
  subtleBorder?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  href: undefined,
  externalHref: undefined,
  allowNestedInteractive: false,
  coverLinkLabelledBy: undefined,
  subtleBorder: true,
})

const wrapperClass = computed(() => ({
  'wikita-card-wrapper--subtle-border': props.subtleBorder,
}))

const useCoverLink = computed(
  () =>
    props.allowNestedInteractive && Boolean(props.href || props.externalHref),
)
</script>

<template>
  <article
    v-if="useCoverLink"
    class="wikita-card-wrapper wikita-card-wrapper--link wikita-card-wrapper--with-cover"
    :class="wrapperClass"
  >
    <a
      v-if="externalHref && !href"
      :href="externalHref"
      class="wikita-card-wrapper__cover-link"
      :aria-labelledby="coverLinkLabelledBy"
      target="_blank"
      rel="noopener noreferrer"
    />

    <RouterLink
      v-else-if="href"
      v-slot="{ href: linkHref, navigate }"
      :to="href"
      custom
    >
      <a
        :href="linkHref"
        class="wikita-card-wrapper__cover-link"
        :aria-labelledby="coverLinkLabelledBy"
        @click="navigate"
      />
    </RouterLink>

    <div class="wikita-card-wrapper__inner wikita-card-wrapper__inner--with-cover">
      <slot />
    </div>
  </article>

  <a
    v-else-if="externalHref && !href"
    :href="externalHref"
    class="wikita-card-wrapper wikita-card-wrapper--link"
    :class="wrapperClass"
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
      :class="wrapperClass"
      @click="navigate"
    >
      <div class="wikita-card-wrapper__inner">
        <slot />
      </div>
    </a>
  </RouterLink>

  <article v-else class="wikita-card-wrapper" :class="wrapperClass">
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

.wikita-card-wrapper--subtle-border {
  border-color: var(--border-color-muted);
}

.wikita-card-wrapper--link {
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.wikita-card-wrapper--link:not(.wikita-card-wrapper--with-cover):hover,
.wikita-card-wrapper--link:not(.wikita-card-wrapper--with-cover):focus-visible,
.wikita-card-wrapper--with-cover:has(.wikita-card-wrapper__cover-link:hover),
.wikita-card-wrapper--with-cover:has(.wikita-card-wrapper__cover-link:focus-visible) {
  background-color: var(--background-color-interactive-subtle);
}

.wikita-card-wrapper--link:hover,
.wikita-card-wrapper--link:focus,
.wikita-card-wrapper--link:visited {
  color: var(--color-base);
  text-decoration: none;
}

.wikita-card-wrapper--with-cover {
  position: relative;
}

.wikita-card-wrapper__cover-link {
  position: absolute;
  inset: 0;
  z-index: 0;
  border-radius: inherit;
  color: inherit;
  text-decoration: none;
}

.wikita-card-wrapper__cover-link:focus-visible {
  outline: 2px solid var(--color-progressive);
  outline-offset: 2px;
}

.wikita-card-wrapper__inner {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  padding: var(--spacing-100);
}

.wikita-card-wrapper__inner--with-cover {
  position: relative;
  z-index: 1;
  pointer-events: none;
}
</style>
