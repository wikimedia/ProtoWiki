<script setup lang="ts">
import { computed, provide, ref, watch } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import { RouterLink } from 'vue-router'

import { CdxButton, CdxIcon, CdxMenuButton } from '@wikimedia/codex'
import type { MenuGroupData, MenuItemData, MenuItemValue } from '@wikimedia/codex'
import { cdxIconConfigure, cdxIconEllipsis, cdxIconNext, cdxIconPushPin } from '@wikimedia/codex-icons'

import { t } from '@/i18n'

import { useWikitaLiteCardBordersSingleton } from '../composables/useWikitaLiteCardBorders'
import { useWikitaLiteModuleMenuModeSingleton } from '../composables/useWikitaLiteModuleMenuMode'
import { useWikitaLitePinnedModulesSingleton } from '../composables/useWikitaLitePinnedModules'
import { useWikitaLitePreserveScroll } from '../composables/useWikitaLitePreserveScroll'
import { useWikitaLiteRoute } from '../composables/useWikitaLiteRoute'
import { useWikitaLiteView } from '../composables/useWikitaLiteView'
import { isOverflowModuleId, type WikitaLiteModuleId } from '../data/homeModuleIds'
import { isPersonalizedModule } from '../data/personalizedModuleIds'
import { PERSONALIZATION_PAGE } from '../routes'
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
const { activeView, isHome } = useWikitaLiteView()
const { captureScroll, restoreScroll } = useWikitaLitePreserveScroll()
const { pushRoute } = useWikitaLiteRoute()

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

const showPinButton = computed(() => {
  if (!moduleIsPinned.value) return false
  if (!isHome.value) return true
  return activeView.value === 'edit'
})

const unpinAriaLabel = computed(() =>
  !isHome.value ? t('components.unpinFromHome') : t('components.unpinFromTop'),
)

const aboutLabel = computed(() =>
  t('components.moduleAbout', props.title.toLowerCase(), props.title),
)

const overflowMenuItems = computed((): (MenuItemData | MenuGroupData)[] => {
  if (!props.moduleId) return []

  const aboutItem: MenuItemData = { value: 'about', label: aboutLabel.value }

  if (isPersonalizedModule(props.moduleId)) {
    return [
      { value: 'configure', label: t('components.configure'), icon: cdxIconConfigure },
      {
        hideLabel: true,
        label: aboutLabel.value,
        items: [aboutItem],
      },
    ]
  }

  return [aboutItem]
})

watch(menuSelected, (value) => {
  if (value === 'about') {
    menuSelected.value = null
    return
  }

  if (value === 'configure') {
    menuSelected.value = null
    void pushRoute(PERSONALIZATION_PAGE)
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
    :data-module-id="moduleId"
  >
    <div v-if="showOverflowMenu" class="wikita-lite-module__header">
      <div class="wikita-lite-module__title-group">
        <h4 class="wikita-lite-module__title">
          {{ title }}
        </h4>
        <CdxButton
          v-if="moduleIsPinned && showPinButton"
          weight="quiet"
          class="wikita-lite-module__pin-button"
          :aria-label="unpinAriaLabel"
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
          :menu-config="{ renderInPlace: true }"
          weight="quiet"
          size="medium"
          :aria-label="t('components.moduleActions')"
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
      <h4 class="wikita-lite-module__title">{{ title }}</h4>
      <CdxButton weight="quiet" class="wikita-lite-module__arrow-button" :aria-hidden="true" tabindex="-1">
        <CdxIcon :icon="cdxIconNext" />
      </CdxButton>
    </RouterLink>

    <h4 v-else class="wikita-lite-module__title wikita-lite-module__title--static">
      {{ title }}
    </h4>

    <div class="wikita-lite-module__cards">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.wikita-lite-module {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-25, 4px);
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
  position: relative;
  flex-shrink: 0;
}

.wikita-lite-module__overflow-button {
  flex-shrink: 0;
}

.wikita-lite-module__overflow-button :deep(.cdx-menu-button__menu-wrapper) {
  position: relative;
}

/*
 * renderInPlace + useFloatingMenu sizes the menu to available viewport width and
 * shifts it with transform — that pushes the panel off the left edge on narrow
 * screens. Anchor to the trigger instead (Codex menu-button default intent).
 */
.wikita-lite-module__overflow-button :deep(.cdx-menu-button__menu) {
  position: absolute !important;
  top: 100% !important;
  bottom: auto !important;
  inset-inline-start: auto !important;
  inset-inline-end: 0 !important;
  transform: none !important;
  width: max-content !important;
  min-width: 8rem !important;
  max-width: 16rem !important;
  margin-top: 4px;
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
