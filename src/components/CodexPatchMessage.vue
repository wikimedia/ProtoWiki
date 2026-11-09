<script setup lang="ts">
import { computed, ref } from 'vue'
import { CdxMessage } from '@wikimedia/codex'

import { useCodexBuild } from '@/composables/useCodexBuild'

const { build, patchedStatusLine } = useCodexBuild()

const dismissed = ref(false)

const visible = computed(() => !dismissed.value && build.value.patch !== null)
</script>

<template>
  <CdxMessage
    v-if="visible"
    type="notice"
    :allow-user-dismiss="true"
    @user-dismissed="dismissed = true"
  >
    <div class="codex-patch-message">
      <div class="codex-patch-message__text">
        {{ patchedStatusLine }}
      </div>
    </div>
  </CdxMessage>
</template>
