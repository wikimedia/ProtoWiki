<script setup lang="ts">
/**
 * A feature's editor page — `<dashboard>/<id>`. The form
 * edits a draft; "Save changes" makes it the saved configuration, and "Reset to
 * defaults" (in the "…" menu) discards it. An unknown feature goes back to the
 * dashboard.
 */
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import ChromeWrapper from '@/components/chrome/ChromeWrapper.vue'
import CommunityConfigurationEditor from '@/components/community-configuration/CommunityConfigurationEditor.vue'

import {
  FEATURES,
  draftConfig,
  resetConfig,
  saveConfig,
  useCommunityConfigurationPath,
} from '../features'

const route = useRoute()
const router = useRouter()
const basePath = useCommunityConfigurationPath()

const feature = computed(() => {
  const param = (route.params as { feature?: string | string[] }).feature
  const id = Array.isArray(param) ? param[0] : param
  return FEATURES.find((candidate) => candidate.id === id) ?? null
})

const draft = ref<Record<string, unknown>>({})

watch(
  feature,
  (found) => {
    if (found) {
      draft.value = draftConfig(found.id)
    } else {
      void router.replace(basePath.value)
    }
  },
  { immediate: true },
)

function reset(id: string): void {
  resetConfig(id)
  draft.value = draftConfig(id)
}
</script>

<template>
  <ChromeWrapper :last-edited-notice="false">
    <CommunityConfigurationEditor
      v-if="feature"
      :key="feature.id"
      :feature="feature"
      :base-path="basePath"
      @save="saveConfig(feature.id, draft)"
      @reset="reset(feature.id)"
    >
      <component :is="feature.form" v-model="draft" />
    </CommunityConfigurationEditor>
  </ChromeWrapper>
</template>
