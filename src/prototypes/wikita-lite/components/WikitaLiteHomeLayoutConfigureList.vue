<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { CdxButton, CdxIcon, CdxToggleSwitch } from '@wikimedia/codex'
import { cdxIconDraggableVertical } from '@wikimedia/codex-icons'

import { t } from '@/i18n'

import {
  CONFIGURABLE_HOME_MODULE_LABELS,
  type ConfigurableHomeModuleId,
} from '../data/homeLayout'

/**
 * Pointer reordering for the Home layout rows, ported from the tab-bar
 * prototype's `useRowDrag`.
 *
 * The DOM order never changes mid-drag: the dragged row follows the pointer on
 * a transform while its siblings slide out of the way, and the array is spliced
 * once on release. No floating clone of the row, so nothing has to be rebuilt
 * in a non-interactive state.
 */
interface Props {
  order: ConfigurableHomeModuleId[]
  isEnabled: (id: ConfigurableHomeModuleId) => boolean
}

/** How long a sibling takes to slide into the gap the dragged row leaves. */
const ROW_SHIFT_DURATION_MS = 120

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:enabled': [id: ConfigurableHomeModuleId, enabled: boolean]
  reorder: [order: ConfigurableHomeModuleId[]]
}>()

const listEl = ref<HTMLElement | null>(null)
const localOrder = ref<ConfigurableHomeModuleId[]>([...props.order])
const draggingIndex = ref<number | null>(null)

watch(
  () => props.order,
  (next) => {
    if (draggingIndex.value !== null) return
    localOrder.value = [...next]
  },
)

function onToggle(id: ConfigurableHomeModuleId, enabled: boolean): void {
  emit('update:enabled', id, enabled)
}

function setGrabbingCursor(active: boolean): void {
  if (typeof document === 'undefined') return
  document.body.style.cursor = active ? 'grabbing' : ''
}

function suppressLongPress(event: Event): void {
  event.preventDefault()
}

/** Moves the row locally for instant feedback, then reports the new order up. */
function commitMove(from: number, to: number): void {
  if (from === to) return

  const next = [...localOrder.value]
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  localOrder.value = next

  emit('reorder', next)
}

function onHandlePointerDown(event: PointerEvent, index: number): void {
  if (event.button !== 0 || !listEl.value) return

  const rows = Array.from(listEl.value.children) as HTMLElement[]
  if (rows.length < 2 || !rows[index]) return

  event.preventDefault()

  const handle = event.currentTarget as HTMLElement
  try {
    handle.setPointerCapture(event.pointerId)
  } catch {
    // Synthetic or already-released pointers: the listeners below still fire.
  }

  // Measured once: rows keep their layout position for the whole drag.
  const rects = rows.map((row) => row.getBoundingClientRect())
  const rowStep = rects[1].top - rects[0].top
  const from = index
  const startY = event.clientY
  let target = index

  draggingIndex.value = index
  setGrabbingCursor(true)
  rows.forEach((row, i) => {
    if (i !== from) row.style.transition = `transform ${ROW_SHIFT_DURATION_MS}ms ease`
  })

  const onPointerMove = (moveEvent: PointerEvent): void => {
    const dy = moveEvent.clientY - startY
    rows[from].style.transform = `translateY(${dy}px)`

    // Rows whose centre the dragged row has passed give up their slot.
    const centerY = rects[from].top + rects[from].height / 2 + dy
    target = rects.filter((rect, i) => i !== from && rect.top + rect.height / 2 < centerY).length

    rows.forEach((row, i) => {
      if (i === from) return
      let shift = 0
      if (from < i && i <= target) shift = -rowStep
      else if (target <= i && i < from) shift = rowStep
      row.style.transform = shift ? `translateY(${shift}px)` : ''
    })
  }

  const finish = (): void => {
    handle.removeEventListener('pointermove', onPointerMove)
    handle.removeEventListener('pointerup', finish)
    handle.removeEventListener('pointercancel', finish)
    if (handle.hasPointerCapture(event.pointerId)) handle.releasePointerCapture(event.pointerId)

    // Drop the transforms in the same frame the array is spliced, so the row
    // lands in the slot its neighbours already opened up.
    rows.forEach((row) => {
      row.style.transform = ''
      row.style.transition = ''
    })
    draggingIndex.value = null
    setGrabbingCursor(false)

    commitMove(from, target)
  }

  handle.addEventListener('pointermove', onPointerMove)
  handle.addEventListener('pointerup', finish)
  handle.addEventListener('pointercancel', finish)
}

/** ArrowUp / ArrowDown move the row one slot, keeping focus on its handle. */
function onHandleKeydown(event: KeyboardEvent, index: number): void {
  const delta = event.key === 'ArrowUp' ? -1 : event.key === 'ArrowDown' ? 1 : 0
  if (!delta) return

  const to = index + delta
  if (to < 0 || to >= localOrder.value.length) return

  event.preventDefault()
  commitMove(index, to)
  void nextTick(() => {
    const row = listEl.value?.children[to]
    row?.querySelector<HTMLElement>('.wikita-lite-home-layout-configure-list__handle')?.focus()
  })
}

onBeforeUnmount(() => setGrabbingCursor(false))
</script>

<template>
  <ul
    ref="listEl"
    class="wikita-lite-home-layout-configure-list"
    :class="{ 'wikita-lite-home-layout-configure-list--dragging': draggingIndex !== null }"
    @contextmenu.capture.prevent="suppressLongPress"
  >
    <li
      v-for="(moduleId, index) in localOrder"
      :key="moduleId"
      class="wikita-lite-home-layout-configure-list__item"
      :class="{
        'wikita-lite-home-layout-configure-list__item--dragging': draggingIndex === index,
      }"
      :data-module-id="moduleId"
    >
      <CdxButton
        class="wikita-lite-home-layout-configure-list__handle"
        weight="quiet"
        :aria-label="t('components.dragToReorder')"
        @pointerdown="onHandlePointerDown($event, index)"
        @keydown="onHandleKeydown($event, index)"
        @touchstart.prevent="suppressLongPress"
        @contextmenu.prevent="suppressLongPress"
        @selectstart.prevent="suppressLongPress"
      >
        <CdxIcon :icon="cdxIconDraggableVertical" />
      </CdxButton>
      <CdxToggleSwitch
        class="wikita-lite-home-layout-configure-list__toggle"
        :model-value="isEnabled(moduleId)"
        align-switch
        @update:model-value="onToggle(moduleId, $event)"
      >
        {{ CONFIGURABLE_HOME_MODULE_LABELS[moduleId] }}
      </CdxToggleSwitch>
    </li>
  </ul>
</template>

<style scoped>
.wikita-lite-home-layout-configure-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-50, 8px);
  margin: 0;
  padding: 0;
  list-style: none;
}

.wikita-lite-home-layout-configure-list--dragging,
.wikita-lite-home-layout-configure-list--dragging :deep(*) {
  cursor: grabbing !important;
}

.wikita-lite-home-layout-configure-list--dragging {
  touch-action: none;
  user-select: none;
}

/* Rows are opaque so the dragged row can pass over them; z-index applies to
   flex items without positioning, so the dragged one rides on top. */
.wikita-lite-home-layout-configure-list__item {
  display: flex;
  align-items: center;
  gap: var(--spacing-50, 8px);
  box-sizing: border-box;
  background-color: var(--background-color-base, #fff);
}

.wikita-lite-home-layout-configure-list__item--dragging {
  z-index: 1;
  background-color: transparent;
}

/* Codex owns the 32px icon-only frame and the quiet hover/active fills; these
   are the drag affordances on top. The `:hover` selector is needed because
   Codex's own `.cdx-button:enabled:hover` sets `cursor: pointer`. */
.wikita-lite-home-layout-configure-list__handle {
  flex-shrink: 0;
  touch-action: none;
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  user-select: none;
}

.wikita-lite-home-layout-configure-list__handle,
.wikita-lite-home-layout-configure-list__handle:enabled:hover {
  cursor: grab;
}

/* Keep hits on the handle surface, not the icon SVG (avoids browser long-press menus). */
.wikita-lite-home-layout-configure-list__handle :deep(*) {
  pointer-events: none;
  -webkit-touch-callout: none;
  user-select: none;
}

.wikita-lite-home-layout-configure-list__handle:enabled:active {
  cursor: grabbing;
}

.wikita-lite-home-layout-configure-list__toggle {
  flex: 1;
  min-width: 0;
}

.wikita-lite-home-layout-configure-list__toggle :deep(.cdx-toggle-switch) {
  width: 100%;
}
</style>
