<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, type RouteLocationRaw } from 'vue-router'

import { useWikitaUiSkin, type WikitaUiSkin } from '../composables/useWikitaUiSkin'

interface Props {
  href?: RouteLocationRaw
  externalHref?: string
  allowNestedInteractive?: boolean
  coverLinkLabelledBy?: string
  /** When true (default), use `--border-color-muted` instead of `--color-base`. */
  subtleBorder?: boolean
  /** Hover/focus background for non-link cards (e.g. list picker). */
  interactive?: boolean
  skin?: WikitaUiSkin
}

const props = withDefaults(defineProps<Props>(), {
  href: undefined,
  externalHref: undefined,
  allowNestedInteractive: false,
  coverLinkLabelledBy: undefined,
  subtleBorder: true,
  interactive: false,
  skin: undefined,
})

const effectiveSkin = useWikitaUiSkin(() => props.skin)

const wikitaWrapperClass = computed(() => ({
  'wikita-card-wrapper--subtle-border': props.subtleBorder,
  'wikita-card-wrapper--interactive': props.interactive,
}))

const wikipediaWrapperClass = computed(() => ({
  'wikita-card-wrapper-wikipedia--subtle-border': props.subtleBorder,
  'wikita-card-wrapper-wikipedia--interactive': props.interactive,
}))

const useCoverLink = computed(
  () =>
    props.allowNestedInteractive && Boolean(props.href || props.externalHref),
)
</script>

<template>
  <template v-if="effectiveSkin === 'wikipedia'">
    <article
      v-if="useCoverLink"
      class="wikita-card-wrapper-wikipedia wikita-card-wrapper-wikipedia--link wikita-card-wrapper-wikipedia--with-cover"
      :class="wikipediaWrapperClass"
    >
      <a
        v-if="externalHref && !href"
        :href="externalHref"
        class="wikita-card-wrapper-wikipedia__cover-link"
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
          class="wikita-card-wrapper-wikipedia__cover-link"
          :aria-labelledby="coverLinkLabelledBy"
          @click="navigate"
        />
      </RouterLink>

      <div class="wikita-card-wrapper-wikipedia__inner wikita-card-wrapper-wikipedia__inner--with-cover">
        <slot />
      </div>
    </article>

    <a
      v-else-if="externalHref && !href"
      :href="externalHref"
      class="wikita-card-wrapper-wikipedia wikita-card-wrapper-wikipedia--link"
      :class="wikipediaWrapperClass"
      target="_blank"
      rel="noopener noreferrer"
    >
      <div class="wikita-card-wrapper-wikipedia__inner">
        <slot />
      </div>
    </a>

    <RouterLink v-else-if="href" v-slot="{ href: linkHref, navigate }" :to="href" custom>
      <a
        :href="linkHref"
        class="wikita-card-wrapper-wikipedia wikita-card-wrapper-wikipedia--link"
        :class="wikipediaWrapperClass"
        @click="navigate"
      >
        <div class="wikita-card-wrapper-wikipedia__inner">
          <slot />
        </div>
      </a>
    </RouterLink>

    <article v-else class="wikita-card-wrapper-wikipedia" :class="wikipediaWrapperClass">
      <div class="wikita-card-wrapper-wikipedia__inner">
        <slot />
      </div>
    </article>
  </template>

  <template v-else>
    <article
      v-if="useCoverLink"
      class="wikita-card-wrapper wikita-card-wrapper--link wikita-card-wrapper--with-cover"
      :class="wikitaWrapperClass"
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
      :class="wikitaWrapperClass"
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
        :class="wikitaWrapperClass"
        @click="navigate"
      >
        <div class="wikita-card-wrapper__inner">
          <slot />
        </div>
      </a>
    </RouterLink>

    <article v-else class="wikita-card-wrapper" :class="wikitaWrapperClass">
      <div class="wikita-card-wrapper__inner">
        <slot />
      </div>
    </article>
  </template>
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

.wikita-card-wrapper--interactive:hover,
.wikita-card-wrapper--interactive:has(:focus-visible) {
  background-color: var(--background-color-interactive-subtle);
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

.wikita-card-wrapper-wikipedia {
  box-sizing: border-box;
  display: flex;
  width: 100%;
  margin: 0;
  padding: 0;
  border: 1px solid var(--border-color-base);
  border-radius: var(--border-radius-base);
  background-color: var(--background-color-base);
  color: var(--color-base);
  font: inherit;
  text-align: start;
  text-decoration: none;
}

.wikita-card-wrapper-wikipedia--subtle-border {
  border-color: var(--border-color-base);
}

.wikita-card-wrapper-wikipedia--link {
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.wikita-card-wrapper-wikipedia--interactive:hover,
.wikita-card-wrapper-wikipedia--interactive:has(:focus-visible),
.wikita-card-wrapper-wikipedia--link:not(.wikita-card-wrapper-wikipedia--with-cover):hover,
.wikita-card-wrapper-wikipedia--link:not(.wikita-card-wrapper-wikipedia--with-cover):focus-visible,
.wikita-card-wrapper-wikipedia--with-cover:has(.wikita-card-wrapper-wikipedia__cover-link:hover),
.wikita-card-wrapper-wikipedia--with-cover:has(.wikita-card-wrapper-wikipedia__cover-link:focus-visible) {
  background-color: var(--background-color-interactive-subtle);
}

.wikita-card-wrapper-wikipedia--link:hover,
.wikita-card-wrapper-wikipedia--link:focus,
.wikita-card-wrapper-wikipedia--link:visited {
  color: var(--color-base);
  text-decoration: none;
}

.wikita-card-wrapper-wikipedia--with-cover {
  position: relative;
}

.wikita-card-wrapper-wikipedia__cover-link {
  position: absolute;
  inset: 0;
  z-index: 0;
  border-radius: inherit;
  color: inherit;
  text-decoration: none;
}

.wikita-card-wrapper-wikipedia__cover-link:focus-visible {
  outline: 2px solid var(--color-progressive);
  outline-offset: 2px;
}

.wikita-card-wrapper-wikipedia__inner {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  padding: var(--spacing-100);
}

.wikita-card-wrapper-wikipedia__inner--with-cover {
  position: relative;
  z-index: 1;
  pointer-events: none;
}
</style>
