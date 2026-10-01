<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { CdxButton, CdxIcon, CdxMenu } from '@wikimedia/codex'
import type { MenuItemData, MenuItemValue } from '@wikimedia/codex'
import {
  cdxIconBookmarkList,
  cdxIconLogOut,
  cdxIconSandbox,
  cdxIconUserAvatar,
  cdxIconUserAvatarOutline,
  cdxIconUserContributions,
  cdxIconUserTalk,
  cdxIconWatchlist,
} from '@wikimedia/codex-icons'

import { useConfig } from '@/composables/useConfig'
import { t } from '@/i18n'

/**
 * Minerva's avatar button with the user menu hanging off it. The real Minerva
 * avatar opens a whole page; on a prototype phone screen the rows read better
 * dropping from the bar, so it toggles a Codex menu instead. Rows are inert
 * affordances like the rest of the chrome.
 *
 * Place it in `MinervaChromeHeader`'s `right` as a `component` item.
 */
interface Props {
  /** First row; trimmed, and the mock user's display name stands in when empty. */
  username?: string
}

const props = withDefaults(defineProps<Props>(), {
  username: undefined,
})

const { displayName } = useConfig()

const open = ref(false)
const menu = ref<InstanceType<typeof CdxMenu> | null>(null)
const trigger = ref<InstanceType<typeof CdxButton> | null>(null)
const selection = ref<MenuItemValue | null>(null)

const menuItems = computed((): MenuItemData[] => [
  {
    value: 'user-page',
    label: (props.username ?? '').trim() || displayName.value,
    icon: cdxIconUserAvatar,
  },
  { value: 'talk', label: t('chrome.talk'), icon: cdxIconUserTalk },
  { value: 'sandbox', label: t('chrome.sandbox'), icon: cdxIconSandbox },
  { value: 'saved', label: t('chrome.saved'), icon: cdxIconBookmarkList },
  { value: 'watchlist', label: t('chrome.watchlist'), icon: cdxIconWatchlist },
  { value: 'contributions', label: t('chrome.contributions'), icon: cdxIconUserContributions },
  { value: 'log-out', label: t('chrome.logOut'), icon: cdxIconLogOut },
])

/** Mock rows: clear the pick so no row keeps the selected (blue) treatment. */
watch(selection, (value) => {
  if (value !== null) selection.value = null
})

/** Menu rows are `<li>`s, so arrow/Enter/Escape only work if the focused
    trigger hands its keystrokes to the menu — what CdxMenuButton does too. */
function onKeydown(event: KeyboardEvent) {
  if (event.key === ' ') return
  menu.value?.delegateKeyNavigation(event)
}

function onDocumentPointerDown(event: PointerEvent) {
  const target = event.target as Node | null
  if (!target) return
  if (menu.value?.getRootElement()?.contains(target)) return
  if (trigger.value?.$el?.contains(target)) return
  open.value = false
}

/*
 * Codex menu items swallow `mousedown`, so a tap on a row never blurs the
 * trigger — which is why closing on an outside tap needs its own listener
 * rather than the trigger's `blur` (Safari doesn't focus buttons on click).
 */
watch(open, (isOpen) => {
  if (isOpen) {
    document.addEventListener('pointerdown', onDocumentPointerDown)
  } else {
    document.removeEventListener('pointerdown', onDocumentPointerDown)
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onDocumentPointerDown)
})
</script>

<template>
  <!-- Positioning context: the menu hangs 4px under the avatar, flush with its trailing edge. -->
  <span class="minerva-user-menu">
    <CdxButton
      ref="trigger"
      weight="quiet"
      size="large"
      :aria-label="t('chrome.userMenu')"
      aria-haspopup="menu"
      :aria-expanded="open"
      @click="open = !open"
      @keydown="onKeydown"
    >
      <CdxIcon :icon="cdxIconUserAvatarOutline" size="medium" />
    </CdxButton>
    <CdxMenu
      ref="menu"
      v-model:selected="selection"
      v-model:expanded="open"
      class="minerva-user-menu__menu"
      :menu-items="menuItems"
      role="menu"
      :aria-label="t('chrome.userMenu')"
    />
  </span>
</template>

<style scoped>
.minerva-user-menu {
  position: relative;
  display: inline-flex;
}
</style>

<!--
  CdxMenu's root element doesn't pick up the scope attribute, so these rules
  can't live in the scoped block above. The class is component-specific, so the
  reach is the same in practice.
-->
<style>
/*
 * CdxMenu places itself at `left: 0` and the full width of its container, so
 * both are replaced; `inset-inline-end` keeps it flush with the avatar and
 * mirrors to the left in RTL chrome.
 */
.minerva-user-menu__menu.cdx-menu {
  top: 100%;
  left: auto;
  inset-inline-end: 0;
  width: max-content;
  min-width: 13rem;
  max-width: calc(100vw - var(--spacing-100, 16px) * 2);
  margin-top: var(--spacing-25, 4px);
}

/* Thumb-sized rows (44px), against Codex's denser 38px default. */
.minerva-user-menu__menu .cdx-menu-item {
  padding: var(--spacing-75, 12px) var(--spacing-100, 16px);
}

/*
 * Drawn in one subtle grey — the same `color-subtle` as the bar's icons —
 * rather than Codex's `color-base` rows; the labels carry the emphasis instead.
 */
.minerva-user-menu__menu .cdx-menu-item--enabled,
.minerva-user-menu__menu .cdx-menu-item--enabled .cdx-menu-item__content {
  color: var(--color-subtle, #54595d);
}

.minerva-user-menu__menu .cdx-menu-item__icon.cdx-icon {
  margin-inline-end: var(--spacing-75, 12px);
  color: var(--color-subtle, #54595d);
}

.minerva-user-menu__menu .cdx-menu-item__text__label {
  font-weight: var(--font-weight-semi-bold, 600);
}
</style>
