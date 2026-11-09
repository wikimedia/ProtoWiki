<script setup lang="ts">
/**
 * Body of a suggestion / check card: description, prompt, the reason form a
 * check asks for, action buttons and footer. Shared by the desktop sidebar
 * card and the mobile sheet.
 */
import { computed, ref, watch } from 'vue'
import { CdxButton, CdxIcon, CdxRadio } from '@wikimedia/codex'
import { cdxIconCheck, cdxIconPrevious, cdxIconRobot, cdxIconUserAvatar } from '@wikimedia/codex-icons'

import type { ChoiceAction, Finding } from './engine/checks'
import { feedbackFormFor } from './engine/editChecks'
import { STR } from './engine/strings'

const props = defineProps<{
  finding: Finding
  /** Recheck in flight (tone). */
  busy?: boolean
  skin: 'desktop' | 'mobile'
}>()

const emit = defineEmits<{
  act: [action: ChoiceAction, reason?: string]
}>()

const pendingFeedback = ref<{ action: ChoiceAction; description: string; options: readonly { value: string; label: string }[] } | null>(null)
const reason = ref<string>('')

watch(
  () => props.finding.id,
  () => {
    pendingFeedback.value = null
    reason.value = ''
  },
)

const choices = computed(() => {
  if ((props.finding.type === 'tone' || props.finding.type === 'leadLength') && props.finding.revising) {
    return [
      { action: 'recheck' as const, label: STR.recheck, flags: ['primary', 'progressive'] as const },
      { action: 'dismiss' as const, label: STR.decline },
    ]
  }
  return props.finding.choices
})

function onChoice(action: ChoiceAction) {
  const form = feedbackFormFor(props.finding, action)
  if (form) {
    pendingFeedback.value = { action, ...form }
    return
  }
  emit('act', action)
}

function submitFeedback() {
  if (!pendingFeedback.value || !reason.value) return
  emit('act', pendingFeedback.value.action, reason.value)
  pendingFeedback.value = null
}

const footerIcon = computed(() =>
  props.finding.footerIcon === 'robot' ? cdxIconRobot : props.finding.footerIcon === 'userAvatar' ? cdxIconUserAvatar : null,
)
</script>

<template>
  <div class="finding-body" :data-skin="skin">
    <template v-if="pendingFeedback">
      <p class="finding-body__description">{{ pendingFeedback.description }}</p>
      <div class="finding-body__radios" role="radiogroup">
        <CdxRadio
          v-for="option in pendingFeedback.options"
          :key="option.value"
          v-model="reason"
          :name="`reason-${finding.id}`"
          :input-value="option.value"
        >
          <!-- eslint-disable-next-line vue/no-v-html -->
          <span v-html="option.label" />
        </CdxRadio>
      </div>
      <div class="finding-body__actions">
        <CdxButton weight="quiet" @click="pendingFeedback = null">
          <CdxIcon :icon="cdxIconPrevious" />
          {{ STR.back }}
        </CdxButton>
        <CdxButton action="progressive" weight="primary" :disabled="!reason" @click="submitFeedback">
          {{ STR.submit }}
        </CdxButton>
      </div>
    </template>

    <template v-else>
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div class="finding-body__description" v-html="finding.descriptionHtml" />
      <!-- eslint-disable-next-line vue/no-v-html -->
      <p v-if="finding.promptHtml" class="finding-body__prompt" v-html="finding.promptHtml" />
      <div class="finding-body__actions">
        <CdxButton
          v-for="choice in choices"
          :key="choice.action"
          :action="choice.flags?.includes('progressive') ? 'progressive' : 'default'"
          :weight="choice.flags?.includes('primary') ? 'primary' : 'normal'"
          :disabled="busy"
          @click="onChoice(choice.action)"
        >
          <CdxIcon v-if="choice.action === 'recheck'" :icon="cdxIconCheck" />
          {{ choice.label }}
        </CdxButton>
      </div>
      <div v-if="finding.footerHtml" class="finding-body__footer">
        <CdxIcon v-if="footerIcon" :icon="footerIcon" size="small" />
        <!-- eslint-disable-next-line vue/no-v-html -->
        <span v-html="finding.footerHtml" />
      </div>
    </template>
  </div>
</template>

<style scoped>
.finding-body {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-100, 16px);
}

.finding-body__description,
.finding-body__prompt {
  margin: 0;
  font-size: var(--font-size-medium, 16px);
  line-height: var(--line-height-medium, 24px);
  color: var(--color-subtle, #54595d);
}

.finding-body[data-skin='mobile'] .finding-body__description,
.finding-body[data-skin='mobile'] .finding-body__prompt {
  font-size: var(--font-size-medium, 16px);
  line-height: var(--line-height-medium, 24px);
}

.finding-body__description :deep(p) {
  margin: 0 0 var(--spacing-50, 8px);
}

.finding-body__description :deep(p:last-child) {
  margin-bottom: 0;
}

.finding-body__prompt {
  color: var(--color-base, #202122);
  font-weight: var(--font-weight-bold, 700);
}

.finding-body__description :deep(a),
.finding-body__prompt :deep(a),
.finding-body__footer :deep(a) {
  color: var(--color-progressive, #36c);
  text-decoration: none;
}

.finding-body__description :deep(a:hover),
.finding-body__prompt :deep(a:hover),
.finding-body__footer :deep(a:hover) {
  text-decoration: underline;
}

.finding-body__radios {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-50, 8px);
}

.finding-body__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-50, 8px);
}

.finding-body__footer {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-50, 8px);
  padding-top: var(--spacing-75, 12px);
  border-top: 1px solid var(--border-color-subtle, #c8ccd1);
  font-size: var(--font-size-x-small, 12px);
  line-height: var(--line-height-x-small, 18px);
  color: var(--color-subtle, #54595d);
}

.finding-body__footer .cdx-icon {
  color: var(--color-subtle, #54595d);
  flex-shrink: 0;
}
</style>
