<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { CdxButton, CdxIcon } from '@wikimedia/codex'
import { cdxIconBellOutline, cdxIconTabs, type Icon } from '@wikimedia/codex-icons'

import { DEFAULT_APP_HEADER_TOOLS, type AppHeaderTool } from './appHeaderTools'
import { globalTheme } from '@/theme'
import type { Theme } from '@/theme'

/** Fallback EN stylized W lettermark — override via **`wordmarkSrc`**. */
const WIKIPEDIA_W_LOGO_EN =
  'https://upload.wikimedia.org/wikipedia/commons/5/5a/Wikipedia%27s_W.svg'

const HEADER_TOOL_META: Record<AppHeaderTool, { icon: Icon; ariaLabel: string }> = {
  tabs: { icon: cdxIconTabs, ariaLabel: 'Tabs' },
  notifications: { icon: cdxIconBellOutline, ariaLabel: 'Notifications' },
}

interface Props {
  /** Local theme override. Sets `data-theme` on the root. */
  theme?: Theme
  /** Stylized W lettermark image URL (`#logo` replaces). */
  wordmarkSrc?: string
  /** Subset/order of header tool buttons; **`#actions`** replaces the cluster. */
  headerTools?: AppHeaderTool[]
}

const props = withDefaults(defineProps<Props>(), {
  theme: undefined,
  wordmarkSrc: undefined,
  headerTools: undefined,
})

const emit = defineEmits<{
  toolClick: [tool: AppHeaderTool]
}>()

const effectiveTheme = computed<Theme>(() => props.theme ?? globalTheme.value)
const wordmarkResolved = computed(() => props.wordmarkSrc ?? WIKIPEDIA_W_LOGO_EN)
const effectiveHeaderTools = computed(() =>
  props.headerTools?.length ? props.headerTools : DEFAULT_APP_HEADER_TOOLS,
)

function onToolClick(tool: AppHeaderTool): void {
  emit('toolClick', tool)
}
</script>

<template>
  <header class="app-chrome-header" :data-theme="effectiveTheme">
    <nav class="app-chrome-header__nav" aria-label="App">
      <RouterLink class="app-chrome-header__brand" to="/" aria-label="Visit the main page">
        <slot name="logo">
          <img
            class="app-chrome-header__wordmark"
            :src="wordmarkResolved"
            alt="Wikipedia"
            width="32"
            height="32"
          />
        </slot>
      </RouterLink>

      <div class="app-chrome-header__actions">
        <slot name="actions">
          <CdxButton
            v-for="tool in effectiveHeaderTools"
            :key="tool"
            weight="quiet"
            size="large"
            :aria-label="HEADER_TOOL_META[tool].ariaLabel"
            @click="onToolClick(tool)"
          >
            <CdxIcon :icon="HEADER_TOOL_META[tool].icon" />
          </CdxButton>
        </slot>
      </div>
    </nav>
  </header>
</template>

<style scoped>
.app-chrome-header {
  flex-shrink: 0;
  background-color: var(--background-color-base, #fff);
}

.app-chrome-header__nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 60px;
  padding: var(--spacing-50, 8px) var(--spacing-150, 24px);
}

.app-chrome-header__brand {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  color: inherit;
  text-decoration: none;
}

.app-chrome-header__wordmark {
  display: block;
  width: 32px;
  height: 32px;
}

.app-chrome-header__actions {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: flex-end;
}
</style>
