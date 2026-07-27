<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'

import { CdxButton, CdxDialog, CdxIcon } from '@wikimedia/codex'
import { cdxIconClose } from '@wikimedia/codex-icons'

import { useListCardThumbnails } from '../composables/useListCardThumbnails'
import { useWikitaSaveFeedback } from '../composables/useWikitaSaveFeedback'
import { useWikitaUiSkin, type WikitaUiSkin } from '../composables/useWikitaUiSkin'
import { formatListItemCount, listUserLists, type UserList } from '../data/lists'
import WikitaButton from './WikitaButton.vue'
import WikitaCardItem from './WikitaCardItem.vue'

const props = withDefaults(
  defineProps<{
    skin?: WikitaUiSkin
  }>(),
  { skin: undefined },
)

const effectiveSkin = useWikitaUiSkin(() => props.skin)

const {
  listsSheetOpen,
  listsVersion,
  closeListsSheet,
  addToList,
  createListAndAdd,
} = useWikitaSaveFeedback()

const lists = ref<UserList[]>(listUserLists())

function refreshLists(): void {
  lists.value = listUserLists()
}

watch(listsVersion, refreshLists)

watch(listsSheetOpen, (open) => {
  if (open) refreshLists()
})

const { listCards } = useListCardThumbnails(lists, {
  active: listsSheetOpen,
})

function onBackdropClick(): void {
  closeListsSheet()
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') closeListsSheet()
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <CdxDialog
    v-if="effectiveSkin === 'wikipedia'"
    :open="listsSheetOpen"
    title="Add to list"
    class="wikita-lists-dialog"
    dismissable
    @update:open="(open) => { if (!open) closeListsSheet() }"
  >
    <div class="wikita-lists-sheet__body">
      <WikitaCardItem
        v-for="{ list, thumbnailUrl } in listCards"
        :key="list.id"
        interactive
        :show-type="false"
        :show-snippet="false"
        :show-info="false"
        :title="list.name"
        :body="formatListItemCount(list.itemIds.length)"
        :thumbnail-url="thumbnailUrl"
        :thumbnail-alt="list.name"
        @click="addToList(list.id)"
      />

      <CdxButton class="wikita-lists-sheet__create" @click="createListAndAdd">
        Create new list
      </CdxButton>
    </div>
  </CdxDialog>

  <div
    v-else-if="listsSheetOpen"
    class="wikita-lists-sheet"
    role="presentation"
    @click.self="onBackdropClick"
  >
    <div
      class="wikita-lists-sheet__panel"
      role="dialog"
      aria-modal="true"
      aria-labelledby="wikita-lists-sheet-title"
      @click.stop
    >
      <header class="wikita-lists-sheet__header">
        <h3 id="wikita-lists-sheet-title" class="wikita-lists-sheet__title">
          Add to list
        </h3>
        <CdxButton
          weight="quiet"
          class="wikita-lists-sheet__close"
          aria-label="Close"
          @click="closeListsSheet"
        >
          <CdxIcon :icon="cdxIconClose" />
        </CdxButton>
      </header>

      <div class="wikita-lists-sheet__body">
        <WikitaCardItem
          v-for="{ list, thumbnailUrl } in listCards"
          :key="list.id"
          interactive
          :show-type="false"
          :show-snippet="false"
          :show-info="false"
          :title="list.name"
          :body="formatListItemCount(list.itemIds.length)"
          :thumbnail-url="thumbnailUrl"
          :thumbnail-alt="list.name"
          @click="addToList(list.id)"
        />

        <WikitaButton
          variant="outlined"
          class="wikita-lists-sheet__create"
          @click="createListAndAdd"
        >
          Create new list
        </WikitaButton>
      </div>
    </div>
  </div>
</template>

<style scoped>
.wikita-lists-sheet {
  position: absolute;
  inset: 0;
  z-index: calc(var(--z-index-toast-notification, 900) + 1);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  pointer-events: auto;
  background-color: var(--background-color-backdrop-light, rgba(255, 255, 255, 0.65));
}

.wikita-lists-sheet__panel {
  box-sizing: border-box;
  width: 100%;
  max-width: 412px;
  max-height: min(80dvh, 568px);
  padding: var(--spacing-100);
  border-top: 1px solid var(--border-color-base);
  border-radius: var(--border-radius-base) var(--border-radius-base) 0 0;
  background-color: var(--background-color-base);
  box-shadow:
    0 4px 4px var(--box-shadow-color-medium, rgba(0, 0, 0, 0.06)),
    0 0 8px var(--box-shadow-color-medium, rgba(0, 0, 0, 0.06));
  overflow-y: auto;
}

.wikita-lists-sheet__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-50);
  padding-bottom: var(--spacing-50);
}

.wikita-lists-sheet__title {
  flex: 1 1 auto;
  min-width: 0;
  margin: 0;
  color: var(--color-base);
}

.wikita-lists-sheet__close {
  flex-shrink: 0;
}

.wikita-lists-sheet__body {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-75);
}

.wikita-lists-sheet__create {
  width: 100%;
}
</style>

<!-- Wikipedia lists dialog teleported inside overlay root -->
<style>
#wikita-overlay-root .wikita-lists-dialog.cdx-dialog {
  pointer-events: auto;
}
</style>
