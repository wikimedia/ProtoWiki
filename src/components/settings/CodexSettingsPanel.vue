<script setup lang="ts">
import CodexBuildDetails from '@/components/CodexBuildDetails.vue'
import { useCodexBuild } from '@/composables/useCodexBuild'

import './settingsPanel.css'

const { runtimeStatusLine } = useCodexBuild()
</script>

<template>
  <div class="settings-panel codex-settings-panel">
    <div class="settings-panel__intro">
      <h2 class="settings-panel__title">Codex settings</h2>
      <p class="settings-panel__description">
        {{ runtimeStatusLine }}
      </p>
    </div>
    <CodexBuildDetails />
  </div>
</template>
