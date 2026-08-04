<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'

import {
  applyPcsStylesheets,
  ensurePcsScript,
  pcsThemeClass,
  removePcsStylesheets,
  runPcsPageEnd,
  runPcsPageStart,
} from './shared/pcsAssets'
import type { Theme } from '@/theme'

interface Props {
  pcsHtml: string
  stylesheetHrefs: string[]
  lang?: string
  dir?: 'ltr' | 'rtl'
  theme?: Theme
  articleKey?: string
}

const props = withDefaults(defineProps<Props>(), {
  lang: undefined,
  dir: undefined,
  theme: undefined,
  articleKey: undefined,
})

const emit = defineEmits<{
  parserReady: [root: HTMLElement]
  pcsError: [message: string]
}>()

const pcsRootRef = ref<HTMLElement | null>(null)
const initError = ref<string | null>(null)

const themeClass = computed(() => pcsThemeClass(props.theme))

async function initPcs(): Promise<void> {
  if (!props.pcsHtml) return

  initError.value = null
  applyPcsStylesheets(props.stylesheetHrefs)

  try {
    await ensurePcsScript()
    await nextTick()
    runPcsPageStart()
    await runPcsPageEnd()
    await nextTick()
    const root = pcsRootRef.value
    if (root) emit('parserReady', root)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'PCS failed to initialize.'
    initError.value = message
    emit('pcsError', message)
  }
}

watch(
  () => [props.pcsHtml, props.stylesheetHrefs.join('|'), props.articleKey] as const,
  () => {
    void initPcs()
  },
  { immediate: true },
)

onUnmounted(() => {
  removePcsStylesheets()
})
</script>

<template>
  <div class="app-article-pcs-shell">
    <p v-if="initError" class="app-article-pcs-shell__error">{{ initError }}</p>
    <!-- eslint-disable-next-line vue/no-v-html -->
    <div
      :id="'pcs'"
      ref="pcsRootRef"
      :key="articleKey ?? pcsHtml"
      class="app-article-pcs mw-parser-output parsoid-body content skin-minerva skin--responsive"
      :class="themeClass"
      :lang="props.lang"
      :dir="props.dir"
      v-html="pcsHtml"
    />
  </div>
</template>

<style scoped>
.app-article-pcs-shell__error {
  margin: 0 0 var(--spacing-75, 12px);
  color: var(--color-destructive, #d73333);
  font-size: var(--font-size-small, 0.875rem);
}
</style>

<!--
  Wide tables: edge-bleed horizontal scroll (app polish on top of PCS).
-->
<style>
.app-article-live__reader .app-article-pcs .pcs-collapse-table-content,
.app-article-live__reader .app-article-pcs table:not(.infobox) {
  display: block;
  max-width: none;
}

.app-article-live__reader .app-article-pcs .pcs-collapse-table-content {
  margin-inline: calc(-1 * var(--app-article-bleed-inline, var(--spacing-150, 24px)));
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.app-article-live__reader .app-article-pcs .pcs-collapse-table-content > table,
.app-article-live__reader .app-article-pcs .pw-scroll-bleed > table {
  display: table !important;
  width: max-content !important;
  max-width: none !important;
  margin: 0 !important;
}

.app-article-live__reader .app-article-pcs .pw-scroll-bleed {
  margin-inline: calc(-1 * var(--app-article-bleed-inline, var(--spacing-150, 24px)));
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}
</style>
