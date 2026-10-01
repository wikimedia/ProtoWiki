<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { CdxButton, CdxIcon, CdxToggleSwitch, CdxTooltip } from '@wikimedia/codex'
import * as codexIcons from '@wikimedia/codex-icons'
import type { IconSize } from '@wikimedia/codex'
import { cdxIconSearch } from '@wikimedia/codex-icons'

import { iconSizeEntries, iconsSubTabs } from '../lib/component-tabs'
import PlaygroundSection from '../playground/PlaygroundSection.vue'
import PlaygroundSubTabs from '../playground/PlaygroundSubTabs.vue'
import TokenDeprecatedLabel from '../playground/TokenDeprecatedLabel.vue'

const vTooltip = CdxTooltip

type TooltipInstance = {
  show: () => void
  hide: () => void
  remove: () => void
  removeEventListeners: () => void
  tooltipElement?: HTMLElement
}

type TooltipHost = HTMLElement & {
  tooltip?: TooltipInstance
}

const iconsOnly = ref(false)
const pinnedIconName = ref<string | null>(null)
const buttonHosts = new Map<string, TooltipHost>()
let pinnedEscapeHandler: ((event: KeyboardEvent) => void) | null = null
let pinnedInteractionCleanup: (() => void) | null = null
let pinnedOutsidePointerHandler: ((event: PointerEvent) => void) | null = null

const iconEntries = computed(() =>
  Object.entries(codexIcons)
    .filter(([name]) => name.startsWith('cdxIcon'))
    .sort(([a], [b]) => a.localeCompare(b)),
)

function setButtonHost(name: string, instance: unknown) {
  const root = (instance as { $el?: unknown })?.$el ?? instance
  if (root instanceof HTMLElement) {
    buttonHosts.set(name, root as TooltipHost)
  } else {
    buttonHosts.delete(name)
  }
}

function isInsidePinnedRegion(name: string, target: EventTarget | null): boolean {
  if (!(target instanceof Node)) return false

  const host = buttonHosts.get(name)
  const tooltipEl = host?.tooltip?.tooltipElement
  if (host?.contains(target)) return true
  if (tooltipEl?.contains(target)) return true
  return false
}

function scheduleDismissUnlessPinnedFocus(name: string, relatedTarget: EventTarget | null) {
  if (pinnedIconName.value !== name) return
  if (isInsidePinnedRegion(name, relatedTarget)) return

  queueMicrotask(() => {
    if (pinnedIconName.value !== name) return
    if (isInsidePinnedRegion(name, document.activeElement)) return
    unpinTooltip(name)
  })
}

function detachPinnedInteractionListeners() {
  pinnedInteractionCleanup?.()
  pinnedInteractionCleanup = null

  if (pinnedOutsidePointerHandler) {
    document.removeEventListener('pointerdown', pinnedOutsidePointerHandler, true)
    pinnedOutsidePointerHandler = null
  }
}

function attachPinnedInteractionListeners(name: string) {
  detachPinnedInteractionListeners()

  const host = buttonHosts.get(name)
  const tooltipEl = host?.tooltip?.tooltipElement
  if (!host || !tooltipEl) return

  tooltipEl.tabIndex = -1

  const onTooltipPointerDown = () => {
    tooltipEl.focus({ preventScroll: true })
  }

  const onHostFocusOut = (event: FocusEvent) => {
    scheduleDismissUnlessPinnedFocus(name, event.relatedTarget)
  }

  const onTooltipFocusOut = (event: FocusEvent) => {
    scheduleDismissUnlessPinnedFocus(name, event.relatedTarget)
  }

  tooltipEl.addEventListener('pointerdown', onTooltipPointerDown)
  host.addEventListener('focusout', onHostFocusOut)
  tooltipEl.addEventListener('focusout', onTooltipFocusOut)

  pinnedOutsidePointerHandler = (event: PointerEvent) => {
    if (pinnedIconName.value !== name) return
    if (isInsidePinnedRegion(name, event.target)) return
    unpinTooltip(name)
  }
  document.addEventListener('pointerdown', pinnedOutsidePointerHandler, true)

  pinnedInteractionCleanup = () => {
    tooltipEl.removeEventListener('pointerdown', onTooltipPointerDown)
    host.removeEventListener('focusout', onHostFocusOut)
    tooltipEl.removeEventListener('focusout', onTooltipFocusOut)
    tooltipEl.removeAttribute('tabindex')
  }
}

function detachPinnedEscapeListener() {
  if (!pinnedEscapeHandler) return
  document.removeEventListener('keyup', pinnedEscapeHandler)
  pinnedEscapeHandler = null
}

function attachPinnedEscapeListener(name: string) {
  detachPinnedEscapeListener()
  pinnedEscapeHandler = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && pinnedIconName.value === name) {
      unpinTooltip(name)
    }
  }
  document.addEventListener('keyup', pinnedEscapeHandler)
}

function removeTooltip(name: string) {
  const host = buttonHosts.get(name)
  if (!host?.tooltip) return
  host.tooltip.remove()
  delete host.tooltip
}

function unpinTooltip(name: string) {
  detachPinnedEscapeListener()
  detachPinnedInteractionListeners()
  removeTooltip(name)
  if (pinnedIconName.value === name) {
    pinnedIconName.value = null
  }
}

async function pinTooltip(name: string) {
  if (pinnedIconName.value && pinnedIconName.value !== name) {
    unpinTooltip(pinnedIconName.value)
  }

  pinnedIconName.value = name
  await nextTick()

  const tooltip = buttonHosts.get(name)?.tooltip
  if (!tooltip) return

  // Disable Codex hover/focus hide behaviour; dismiss is handled below.
  tooltip.removeEventListeners()
  tooltip.show()
  attachPinnedInteractionListeners(name)
  attachPinnedEscapeListener(name)
}

async function onIconButtonClick(name: string) {
  if (pinnedIconName.value === name) return
  await pinTooltip(name)
}

function onIconButtonMouseEnter(name: string, event: Event) {
  if (pinnedIconName.value === name) return
  ;(event.currentTarget as TooltipHost).tooltip?.hide()
}

watch(iconsOnly, (only) => {
  if (!only && pinnedIconName.value) {
    unpinTooltip(pinnedIconName.value)
  }
})
</script>

<template>
  <PlaygroundSubTabs
    main-tab-id="icons"
    :items="iconsSubTabs"
    default-active="size"
    ariaLabel="Icons"
  >
    <template #default="{ id }">
      <PlaygroundSection v-if="id === 'size'">
        <div class="icon-size-list">
          <div
            v-for="entry in iconSizeEntries"
            :key="entry.id"
            class="icon-size-list__item"
            :class="{ 'icon-size-list__item--deprecated': entry.deprecated }"
          >
            <CdxIcon :icon="cdxIconSearch" :size="entry.id as IconSize" />
            <code class="icon-size-list__label">{{ entry.id }}</code>
            <TokenDeprecatedLabel v-if="entry.deprecated" />
          </div>
        </div>
      </PlaygroundSection>

      <PlaygroundSection v-else-if="id === 'type'">
        <CdxToggleSwitch v-model="iconsOnly" class="icon-catalogue__toggle">
          Icons only
        </CdxToggleSwitch>
        <div
          class="icon-catalogue"
          :class="{ 'icon-catalogue--icons-only': iconsOnly }"
        >
          <div v-for="[name, icon] in iconEntries" :key="name" class="icon-catalogue__item">
            <template v-if="!iconsOnly">
              <span class="icon-catalogue__icon-wrap">
                <CdxIcon :icon="icon" />
              </span>
              <code class="icon-catalogue__name">{{ name }}</code>
            </template>
            <CdxButton
              v-else
              :ref="(instance) => setButtonHost(name, instance)"
              v-tooltip="pinnedIconName === name ? name : null"
              weight="quiet"
              :aria-label="name"
              @click="onIconButtonClick(name)"
              @mouseenter="onIconButtonMouseEnter(name, $event)"
            >
              <CdxIcon :icon="icon" aria-hidden="true" />
            </CdxButton>
          </div>
        </div>
      </PlaygroundSection>
    </template>
  </PlaygroundSubTabs>
</template>

<style scoped>
.icon-size-list {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--spacing-75);
}

.icon-size-list__item {
  display: flex;
  align-items: center;
  gap: var(--spacing-75);
}

.icon-size-list__label {
  font-family: var(--font-family-monospace);
  font-size: var(--font-size-small);
  line-height: var(--line-height-small);
  color: var(--color-subtle);
}

.icon-size-list__item--deprecated {
  opacity: 0.7;
}

.icon-catalogue__toggle {
  margin-bottom: var(--spacing-100);
}

.icon-catalogue {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(17.5rem, 1fr));
  column-gap: var(--spacing-100);
  row-gap: var(--spacing-35);
}

.icon-catalogue--icons-only {
  grid-template-columns: repeat(auto-fill, minmax(2.75rem, 1fr));
  column-gap: var(--spacing-50);
  row-gap: var(--spacing-50);
}

.icon-catalogue__item {
  display: flex;
  align-items: center;
  gap: var(--spacing-75);
  min-width: 0;
}

.icon-catalogue--icons-only .icon-catalogue__item {
  justify-content: center;
}

.icon-catalogue--icons-only :deep(.cdx-tooltip) {
  user-select: text;
}

.icon-catalogue__icon-wrap {
  display: inline-flex;
  flex-shrink: 0;
}

.icon-catalogue__name {
  font-family: var(--font-family-monospace);
  font-size: var(--font-size-small);
  line-height: var(--line-height-small);
  color: var(--color-subtle);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
