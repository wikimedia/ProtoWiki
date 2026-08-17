<script setup lang="ts">
/**
 * Renders a REST `page/mobile-html` document in an iframe — the same way the
 * Wikipedia apps render it in a WebView.
 *
 * The iframe is the whole point, not an implementation detail. PCS ships its
 * stylesheets rooted at `html` / `body`, sized by viewport media queries, and
 * boots itself from inline scripts. Inlining that markup into the host page
 * instead means none of it works: the `body`-rooted rules never match, the media
 * queries measure the desktop window rather than the phone column, and PCS's
 * `html` / `body` / bare-element rules leak out and restyle all of ProtoWiki.
 * A same-origin iframe gives PCS a real document at phone width, so it lays
 * itself out correctly and its CSS stays contained — no override layer needed.
 */
import { computed, ref, watch } from 'vue'

import type { Theme } from '@/theme'

interface Props {
  /** Complete mobile-html document from `prepareMobileArticleDocument()`. */
  html: string
  title?: string
  theme?: Theme
  /** Overrides the direction mobile-html already sets for its source wiki. */
  dir?: 'ltr' | 'rtl'
  articleKey?: string
}

const props = withDefaults(defineProps<Props>(), {
  title: undefined,
  theme: undefined,
  dir: undefined,
  articleKey: undefined,
})

const emit = defineEmits<{
  /** The `#pcs` root inside the iframe document, for app-specific polish. */
  parserReady: [root: HTMLElement]
}>()

const frameRef = ref<HTMLIFrameElement | null>(null)

const frameTitle = computed(() => props.title ?? 'Article')

/**
 * PCS reads the theme from a class on `<html>`; `prefers-color-scheme` would
 * otherwise follow the OS rather than ProtoWiki's own theme toggle.
 */
const PCS_THEME_CLASSES = ['skin-theme-clientpref-day', 'skin-theme-clientpref-night'] as const

function applyHostPreferences(): void {
  const root = frameRef.value?.contentDocument?.documentElement
  if (!root) return
  root.classList.remove(...PCS_THEME_CLASSES)
  root.classList.add(
    props.theme === 'dark' ? 'skin-theme-clientpref-night' : 'skin-theme-clientpref-day',
  )
  if (props.dir) root.dir = props.dir
}

function onFrameLoad(): void {
  applyHostPreferences()
  const root = frameRef.value?.contentDocument?.querySelector<HTMLElement>('#pcs')
  if (root) emit('parserReady', root)
}

watch(() => [props.theme, props.dir], applyHostPreferences)
</script>

<template>
  <!--
    `srcdoc` keeps the frame same-origin, so `contentDocument` stays readable for
    `parserReady`. `:key` forces a fresh document per article — reassigning
    `srcdoc` alone would leave the previous PCS instance running.
  -->
  <iframe
    ref="frameRef"
    :key="articleKey ?? html.length"
    class="app-article-pcs-frame"
    :srcdoc="html"
    :title="frameTitle"
    referrerpolicy="no-referrer"
    @load="onFrameLoad"
  />
</template>

<style scoped>
.app-article-pcs-frame {
  display: block;
  width: 100%;
  height: 100%;
  border: 0;
  background-color: var(--background-color-base, #fff);
}
</style>
