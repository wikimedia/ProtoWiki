<script setup lang="ts">
import { computed, provide, ref, watch } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import { RouterLink, useRouter } from 'vue-router'

import { CdxButton, CdxIcon, CdxMenuButton } from '@wikimedia/codex'
import type { MenuItemValue } from '@wikimedia/codex'
import { cdxIconCheck, cdxIconConfigure, cdxIconEllipsis, cdxIconNext, cdxIconPushPin } from '@wikimedia/codex-icons'

import { useWikitaLiteCardBordersSingleton } from '../composables/useWikitaLiteCardBorders'
import { useWikitaLiteDismissedModulesSingleton } from '../composables/useWikitaLiteDismissedModules'
import { useWikitaLiteModuleMenuModeSingleton } from '../composables/useWikitaLiteModuleMenuMode'
import { useWikitaLitePinnedModulesSingleton } from '../composables/useWikitaLitePinnedModules'
import { useWikitaLitePreserveScroll } from '../composables/useWikitaLitePreserveScroll'
import { useWikitaLiteView } from '../composables/useWikitaLiteView'
import { isOverflowModuleId, type WikitaLiteModuleId } from '../data/homeModuleIds'
import { HELP_WANTED_CONFIGURE_PAGE } from '../routes'
import { WIKITA_LITE_CARD_SEPARATION, type WikitaLiteCardSeparation } from '../wikita-lite-card'

interface Props {
  title: string
  to?: RouteLocationRaw
  standalone?: boolean
  cardSeparation?: WikitaLiteCardSeparation
  moduleId?: WikitaLiteModuleId
}

const props = withDefaults(defineProps<Props>(), {
  to: undefined,
  standalone: false,
  cardSeparation: 'outline',
  moduleId: undefined,
})

const { hideCardBorders } = useWikitaLiteCardBordersSingleton()
const { useModuleMenuMode } = useWikitaLiteModuleMenuModeSingleton()
const { isPinned, togglePin } = useWikitaLitePinnedModulesSingleton()
const { dismiss } = useWikitaLiteDismissedModulesSingleton()
const { activeView } = useWikitaLiteView()
const { captureScroll, restoreScroll, preserveScrollFor } = useWikitaLitePreserveScroll()
const router = useRouter()

const menuSelected = ref<MenuItemValue | null>(null)

const effectiveCardSeparation = computed((): WikitaLiteCardSeparation =>
  hideCardBorders.value ? 'borderless' : props.cardSeparation,
)

const showOverflowMenu = computed(
  () =>
    useModuleMenuMode.value &&
    !props.standalone &&
    props.moduleId !== undefined &&
    isOverflowModuleId(props.moduleId),
)

const moduleIsPinned = computed(
  () => props.moduleId !== undefined && isPinned(props.moduleId),
)

const showPinButton = computed(() => activeView.value === 'edit')

const pinMenuLabel = computed(() => {
  if (!props.moduleId) return ''
  return isPinned(props.moduleId) ? 'Unpin from top' : 'Pin to top'
})

const overflowMenuItems = computed(() => {
  if (!props.moduleId) return []

  const items = []

  if (props.moduleId === 'suggestedEdits') {
    items.push({
      value: 'configure',
      label: 'Configure',
      icon: cdxIconConfigure,
    })
  }

  items.push({
    value: 'pin',
    label: pinMenuLabel.value,
    icon: cdxIconPushPin,
  })

  items.push({
    value: 'dismiss',
    label: 'Dismiss',
    icon: cdxIconCheck,
  })

  return items
})

watch(menuSelected, (value) => {
  if (value === 'pin' && props.moduleId) {
    preserveScrollFor(() => {
      togglePin(props.moduleId!)
      menuSelected.value = null
    })
    return
  }

  if (value === 'dismiss' && props.moduleId) {
    preserveScrollFor(() => {
      dismiss(props.moduleId!)
      menuSelected.value = null
    })
    return
  }

  if (value === 'configure' && props.moduleId === 'suggestedEdits') {
    menuSelected.value = null
    router.push(HELP_WANTED_CONFIGURE_PAGE)
  }
})

function onOverflowPointerDown(): void {
  captureScroll()
}

function onOverflowPointerUp(): void {
  restoreScroll()
}

function onUnpin(): void {
  if (props.moduleId) {
    togglePin(props.moduleId)
  }
}

provide(WIKITA_LITE_CARD_SEPARATION, effectiveCardSeparation)
</script>

<template>
  <section
    class="wikita-lite-module"
    :class="{ 'wikita-lite-module--standalone': standalone }"
  >
    <div v-if="showOverflowMenu" class="wikita-lite-module__header">
      <div class="wikita-lite-module__title-group">
        <h3 class="wikita-lite-module__title">
          {{ title }}
        </h3>
        <CdxButton
          v-if="moduleIsPinned && showPinButton"
          weight="quiet"
          class="wikita-lite-module__pin-button"
          aria-label="Unpin from top"
          @click="onUnpin"
        >
          <CdxIcon :icon="cdxIconPushPin" />
        </CdxButton>
      </div>
      <div
        class="wikita-lite-module__overflow-button-wrap"
        @pointerdown="onOverflowPointerDown"
        @pointerup="onOverflowPointerUp"
        @pointercancel="onOverflowPointerUp"
      >
        <CdxMenuButton
          v-model:selected="menuSelected"
          class="wikita-lite-module__overflow-button"
          :menu-items="overflowMenuItems"
          weight="quiet"
          size="medium"
          aria-label="Module actions"
        >
          <CdxIcon :icon="cdxIconEllipsis" />
        </CdxMenuButton>
      </div>
    </div>

    <RouterLink
      v-else-if="to && !standalone"
      :to="to"
      class="wikita-lite-module__title-link"
    >
      <h3 class="wikita-lite-module__title">{{ title }}</h3>
      <CdxButton weight="quiet" class="wikita-lite-module__arrow-button" :aria-hidden="true" tabindex="-1">
        <CdxIcon :icon="cdxIconNext" />
      </CdxButton>
    </RouterLink>

    <h3 v-else class="wikita-lite-module__title wikita-lite-module__title--static">
      {{ title }}
    </h3>

    <div class="wikita-lite-module__cards">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.wikita-lite-module {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-50, 8px);
  width: 100%;
}

.wikita-lite-module__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-50, 8px);
  width: 100%;
  min-height: 32px;
}

.wikita-lite-module__title-link,
.wikita-lite-module__title-group {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-25, 4px);
  min-width: 0;
}

.wikita-lite-module__title-link {
  padding: 0;
  color: inherit;
  text-decoration: none;
}

.wikita-lite-module__title-group {
  flex: 1;
}

.wikita-lite-module__title {
  margin: 0;
}

.wikita-lite-module__title--static {
  padding: 0;
}

.wikita-lite-module__overflow-button-wrap {
  flex-shrink: 0;
}

.wikita-lite-module__overflow-button {
  flex-shrink: 0;
}

.wikita-lite-module__arrow-button {
  flex-shrink: 0;
  pointer-events: none;
}

.wikita-lite-module__pin-button {
  flex-shrink: 0;
}

.wikita-lite-module__cards {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-50, 8px);
  padding: 0;
}

.wikita-lite-module--standalone .wikita-lite-module__cards {
  padding: 0;
}
</style>
