<script setup lang="ts">
import { useRouter } from 'vue-router'

import { CdxButton, CdxIcon } from '@wikimedia/codex'
import { cdxIconConfigure } from '@wikimedia/codex-icons'

import { CONFIGURE_PAGE } from '../routes'

interface Props {
  label?: string
  to?: string
}

const props = withDefaults(defineProps<Props>(), {
  label: 'Configure suggestions',
  to: CONFIGURE_PAGE,
})

const router = useRouter()

function openConfigure() {
  router.push(props.to)
}
</script>

<template>
  <CdxButton
    class="wikita-lite-configure-button"
    weight="quiet"
    :icon-only="true"
    :aria-label="label"
    @click="openConfigure"
  >
    <CdxIcon :icon="cdxIconConfigure" />
  </CdxButton>
</template>

<style scoped>
.wikita-lite-configure-button {
  flex-shrink: 0;
  width: 2.75rem;
}
</style>
