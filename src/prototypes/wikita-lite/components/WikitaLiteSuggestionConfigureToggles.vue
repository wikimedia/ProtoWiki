<script setup lang="ts">
import { CdxButton, CdxIcon, CdxToggleSwitch } from '@wikimedia/codex'
import { cdxIconAdd } from '@wikimedia/codex-icons'

import WikitaLiteInterestChips from './WikitaLiteInterestChips.vue'

interface Props {
  useSavedPages: boolean
  useEditingHistory: boolean
  useInterests: boolean
  interests: string[]
  disabled?: boolean
}

withDefaults(defineProps<Props>(), {
  disabled: false,
})

const emit = defineEmits<{
  'update:useSavedPages': [value: boolean]
  'update:useEditingHistory': [value: boolean]
  'update:useInterests': [value: boolean]
  'add-interest': []
  'remove-interest': [title: string]
}>()
</script>

<template>
  <div
    class="wikita-lite-suggestion-configure-toggles"
    :class="{ 'wikita-lite-suggestion-configure-toggles--disabled': disabled }"
  >
    <CdxToggleSwitch
      :model-value="useSavedPages"
      align-switch
      :disabled="disabled"
      @update:model-value="emit('update:useSavedPages', $event)"
    >
      Show suggestions based on my saved pages
    </CdxToggleSwitch>
    <CdxToggleSwitch
      :model-value="useEditingHistory"
      align-switch
      :disabled="disabled"
      @update:model-value="emit('update:useEditingHistory', $event)"
    >
      Show suggestions based on my editing history
    </CdxToggleSwitch>
    <div class="wikita-lite-suggestion-configure-toggles__interests-group">
      <CdxToggleSwitch
        :model-value="useInterests"
        align-switch
        :disabled="disabled"
        @update:model-value="emit('update:useInterests', $event)"
      >
        Show suggestions based on my interests
      </CdxToggleSwitch>
      <div
        class="wikita-lite-suggestion-configure-toggles__interests-actions"
        :class="{ 'wikita-lite-suggestion-configure-toggles__interests-actions--disabled': disabled }"
      >
        <WikitaLiteInterestChips
          v-if="interests.length"
          :interests="interests"
          @remove="emit('remove-interest', $event)"
        />
        <CdxButton
          class="wikita-lite-suggestion-configure-toggles__add-interest"
          :disabled="disabled"
          @click="emit('add-interest')"
        >
          <CdxIcon :icon="cdxIconAdd" />
          Add interest
        </CdxButton>
      </div>
    </div>
  </div>
</template>

<style scoped>
.wikita-lite-suggestion-configure-toggles {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-150, 24px);
}

.wikita-lite-suggestion-configure-toggles :deep(.cdx-toggle-switch) {
  width: 100%;
}

.wikita-lite-suggestion-configure-toggles--disabled {
  opacity: 0.55;
}

.wikita-lite-suggestion-configure-toggles__interests-group {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-75, 12px);
}

.wikita-lite-suggestion-configure-toggles__interests-actions {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-50, 8px);
  align-items: flex-start;
}

.wikita-lite-suggestion-configure-toggles__interests-actions--disabled {
  pointer-events: none;
}

.wikita-lite-suggestion-configure-toggles__add-interest {
  align-self: flex-start;
}
</style>
