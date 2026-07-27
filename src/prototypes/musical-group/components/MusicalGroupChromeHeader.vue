<script setup lang="ts">
import ChromeHeader from '@/components/chrome/ChromeHeader.vue'
import {
  type WikitaChromeHeaderVariant,
} from '../data/headerVariantPreference'
import {
  type WikitaUiSkin,
} from '../data/wikitaUiSkinPreference'
import WikitaChromeHeader from './WikitaChromeHeader.vue'

export type { WikitaChromeHeaderVariant }
export type { WikitaUiSkin }

interface Props {
  showBell?: boolean
  showUser?: boolean
}

withDefaults(defineProps<Props>(), {
  showBell: true,
  showUser: true,
})

const variant = defineModel<WikitaChromeHeaderVariant>('variant', { default: 'black' })
const uiSkin = defineModel<WikitaUiSkin>('uiSkin', { default: 'wikita' })

defineEmits<{
  'toggle-search': []
  'reset-stored-data': []
  'go-home': []
}>()
</script>

<template>
  <WikitaChromeHeader
    v-if="uiSkin === 'wikita'"
    v-model:variant="variant"
    v-model:ui-skin="uiSkin"
    :show-bell="showBell"
    :show-user="showUser"
    @toggle-search="$emit('toggle-search')"
    @reset-stored-data="$emit('reset-stored-data')"
    @go-home="$emit('go-home')"
  />

  <ChromeHeader
    v-else
    skin="mobile"
    home-action="emit"
    @home-click="$emit('go-home')"
  />
</template>
