<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'

import { CdxButton, CdxIcon, CdxToggleSwitch } from '@wikimedia/codex'
import { cdxIconDraggableVertical } from '@wikimedia/codex-icons'

import { wikitabModuleHeading, type WikitabModuleId } from './sections'

/**
 * Pointer reordering for Configure module rows, ported from wikita-lite's
 * `WikitaLiteHomeLayoutConfigureList`.
 *
 * The DOM order never changes mid-drag: the dragged row follows the pointer on
 * a transform while its siblings slide out of the way, and the array is spliced
 * once on release.
 */
interface Props {
  order: WikitabModuleId[]
  isHidden: (id: WikitabModuleId) => boolean
}

/** How long a sibling takes to slide into the gap the dragged row leaves. */
const ROW_SHIFT_DURATION_MS = 120

const props = defineProps<Props>()

const emit = defineEmits<{
  show: [id: WikitabModuleId]
  hide: [id: WikitabModuleId]
  reorder: [order: WikitabModuleId[]]
}>()

const listEl = ref<HTMLElement | null>(null)
const localOrder = ref<WikitabModuleId[]>([...props.order])
const draggingIndex = ref<number | null>(null)

watch(
  () => props.order,
  (next) => {
    if (draggingIndex.value !== null) return
    localOrder.value = [...next]
  },
)

function onToggle(id: WikitabModuleId, visible: boolean): void {
  if (visible) emit('show', id)
  else emit('hide', id)
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

    const centerY = rects[from].top + rects[from].height / 2 + dy
    const firstCenterY = rects[0].top + rects[0].height / 2
    target = Math.round((centerY - firstCenterY) / rowStep)
    target = Math.max(0, Math.min(rows.length - 1, target))

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
    row?.querySelector<HTMLElement>('.wikitab-configure-module-list__handle')?.focus()
  })
}

onBeforeUnmount(() => setGrabbingCursor(false))
</script>

<template>
  <ul
    ref="listEl"
    class="wikitab-configure-module-list"
    :class="{ 'wikitab-configure-module-list--dragging': draggingIndex !== null }"
    @contextmenu.capture.prevent="suppressLongPress"
  >
    <li
      v-for="(moduleId, index) in localOrder"
      :key="moduleId"
      class="wikitab-configure-module-list__item"
      :class="{
        'wikitab-configure-module-list__item--dragging': draggingIndex === index,
      }"
      :data-module-id="moduleId"
    >
      <CdxButton
        class="wikitab-configure-module-list__handle"
        weight="quiet"
        aria-label="Drag to reorder"
        @pointerdown="onHandlePointerDown($event, index)"
        @keydown="onHandleKeydown($event, index)"
        @touchstart.prevent="suppressLongPress"
        @contextmenu.prevent="suppressLongPress"
        @selectstart.prevent="suppressLongPress"
      >
        <CdxIcon :icon="cdxIconDraggableVertical" />
      </CdxButton>
      <CdxToggleSwitch
        class="wikitab-configure-module-list__toggle"
        :model-value="!isHidden(moduleId)"
        @update:model-value="onToggle(moduleId, $event)"
      >
        {{ wikitabModuleHeading(moduleId) }}
      </CdxToggleSwitch>
    </li>
  </ul>
</template>

<style scoped>
.wikitab-configure-module-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-100);
  margin: 0;
  padding: 0 0 var(--spacing-400);
  list-style: none;
}

.wikitab-configure-module-list--dragging,
.wikitab-configure-module-list--dragging :deep(*) {
  cursor: grabbing !important;
}

.wikitab-configure-module-list--dragging {
  touch-action: none;
  user-select: none;
}

.wikitab-configure-module-list__item {
  display: flex;
  align-items: center;
  gap: var(--spacing-50);
  box-sizing: border-box;
  margin: 0;
  background-color: var(--wikitab-theme-bg, var(--background-color-base));
}

.wikitab-configure-module-list__item--dragging {
  z-index: 1;
  background-color: transparent;
}

.wikitab-configure-module-list__handle {
  flex-shrink: 0;
  touch-action: none;
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  user-select: none;
}

.wikitab-configure-module-list__handle,
.wikitab-configure-module-list__handle:enabled:hover {
  cursor: grab;
}

.wikitab-configure-module-list__handle :deep(*) {
  pointer-events: none;
  -webkit-touch-callout: none;
  user-select: none;
}

.wikitab-configure-module-list__handle:enabled:active {
  cursor: grabbing;
}

.wikitab-configure-module-list__toggle {
  flex: 1;
  min-width: 0;
}

.wikitab-configure-module-list__toggle :deep(.cdx-toggle-switch) {
  box-sizing: border-box;
  display: flex;
  width: 100%;
  justify-content: space-between;
  align-items: center;
}

.wikitab-configure-module-list__toggle :deep(.cdx-toggle-switch__label) {
  flex: 1 1 auto;
  min-width: min-content;
}

.wikitab-configure-module-list__toggle :deep(.cdx-toggle-switch__switch) {
  flex-shrink: 0;
}

@media (max-width: 767px) {
  .wikitab-configure-module-list {
    padding-inline: var(--spacing-100);
  }
}

@media (min-width: 768px) {
  [data-skin='desktop'] .wikitab-configure-module-list {
    padding-inline: 0;
  }
}
</style>
