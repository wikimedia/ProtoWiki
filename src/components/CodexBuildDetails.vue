<script setup lang="ts">
import { ref } from 'vue'
import { CdxButton, CdxField, CdxIcon, CdxMessage, CdxToggleSwitch } from '@wikimedia/codex'
import { cdxIconCopy, cdxIconLinkExternal } from '@wikimedia/codex-icons'

import { stackedChangesDescription, useCodexBuild } from '@/composables/useCodexBuild'

const CODEX_PATCH_COMMAND = 'npm run codex:patch [ID]'
const CODEX_RESET_COMMAND_DISPLAY = 'npm run codex:reset'
const CODEX_RESET_COMMAND_COPY = 'npm run codex:reset'

const isDev = import.meta.env.DEV

const {
  canToggleVariant,
  hasCommittedPatch,
  usePatchedCodex,
  committedPatches,
  setUsePatchedCodex,
  switching,
  switchError,
} = useCodexBuild()

const copyPatchLabel = ref('Copy')
const copyResetLabel = ref('Copy')

async function copyCommand(text: string, labelRef: typeof copyPatchLabel): Promise<void> {
  try {
    await navigator.clipboard.writeText(text)
    labelRef.value = 'Copied'
    window.setTimeout(() => {
      labelRef.value = 'Copy'
    }, 2000)
  } catch {
    labelRef.value = 'Copy failed'
    window.setTimeout(() => {
      labelRef.value = 'Copy'
    }, 2000)
  }
}

function onPatchEnabledChange(enabled: boolean): void {
  void setUsePatchedCodex(enabled)
}

function copyResetCommand(): void {
  void copyCommand(CODEX_RESET_COMMAND_COPY, copyResetLabel)
}

function copyPatchCommand(): void {
  void copyCommand(CODEX_PATCH_COMMAND, copyPatchLabel)
}
</script>

<template>
  <div class="codex-build-details">
    <CdxMessage v-if="switchError" type="error" class="codex-build-details__error">
      {{ switchError }}
    </CdxMessage>

    <section class="codex-build-details__patch">
      <CdxField v-if="hasCommittedPatch">
        <template #label>Patches</template>
        <ul class="codex-build-details__patch-list">
          <li
            v-for="patch in committedPatches"
            :key="patch.id"
            class="codex-build-details__patch-row"
          >
            <CdxToggleSwitch
              align-switch
              :model-value="usePatchedCodex"
              :disabled="switching || !canToggleVariant"
              @update:model-value="onPatchEnabledChange"
            >
              <a
                v-if="patch.url"
                class="codex-build-details__link"
                :href="patch.url"
                target="_blank"
                rel="noopener"
                @click.stop
              >{{ patch.label }}<CdxIcon :icon="cdxIconLinkExternal" size="small" /></a>
              <span v-else>{{ patch.label }}</span>
              <template v-if="stackedChangesDescription(patch.stackedChangeCount)" #description>
                {{ stackedChangesDescription(patch.stackedChangeCount) }}
              </template>
            </CdxToggleSwitch>
          </li>
        </ul>
      </CdxField>

      <template v-if="isDev && hasCommittedPatch">
        <p class="codex-build-details__line codex-build-details__line--reset">
          To uninstall your patches, ask an agent to reset Codex.
        </p>
        <p class="codex-build-details__line">
          Or run this command in your terminal.
        </p>
        <div class="codex-build-details__command">
          <code class="codex-build-details__command-text">{{ CODEX_RESET_COMMAND_DISPLAY }}</code>
          <CdxButton weight="quiet" @click="copyResetCommand">
            <CdxIcon :icon="cdxIconCopy" />
            {{ copyResetLabel }}
          </CdxButton>
        </div>
      </template>

      <template v-else-if="!hasCommittedPatch">
        <h4 class="codex-build-details__section-label">Patches</h4>
        <p class="codex-build-details__line">
          Ask an agent to install a patch from a Gerrit change.
        </p>
        <p class="codex-build-details__line">
          Or run this command in your terminal.<br>
          (replace <code class="codex-build-details__inline-code">[ID]</code> with the change's id)
        </p>
        <div class="codex-build-details__command">
          <code class="codex-build-details__command-text">{{ CODEX_PATCH_COMMAND }}</code>
          <CdxButton weight="quiet" @click="copyPatchCommand">
            <CdxIcon :icon="cdxIconCopy" />
            {{ copyPatchLabel }}
          </CdxButton>
        </div>
      </template>
    </section>
  </div>
</template>

<style scoped>
.codex-build-details {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  width: 100%;
  gap: var(--spacing-50);
}

.codex-build-details__error {
  width: 100%;
}

.codex-build-details__patch {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--spacing-50);
  width: 100%;
}

.codex-build-details__line {
  margin: 0;
  font-size: var(--font-size-medium);
  line-height: var(--line-height-small);
  color: var(--color-base);
}

.codex-build-details__line--reset {
  margin-top: var(--spacing-100);
}

.codex-build-details__section-label {
  margin: 0;
  border: 0;
  padding: 0;
  font-family: var(--font-family-base);
  font-size: var(--font-size-medium);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-small);
  color: var(--color-base);
}

.codex-build-details__patch-list {
  margin: 0;
  padding: 0;
  list-style: none;
  width: 100%;
}

.codex-build-details__patch :deep(.cdx-field) {
  width: 100%;
  margin: 0;
}

.codex-build-details__patch :deep(.cdx-field__control) {
  display: block;
  width: 100%;
}

.codex-build-details__patch-row {
  width: 100%;
}

.codex-build-details__patch-row :deep(.cdx-toggle-switch.cdx-toggle-switch--align-switch) {
  display: flex;
  width: 100%;
}

.codex-build-details__patch-row :deep(.cdx-toggle-switch__label.cdx-label) {
  flex: 1;
  min-width: 0;
}

.codex-build-details__link {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-25);
  color: var(--color-progressive);
  text-decoration: none;
}

.codex-build-details__link:hover {
  text-decoration: underline;
}

.codex-build-details__link :deep(.cdx-icon) {
  color: var(--color-progressive);
}

.codex-build-details__command {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--spacing-50);
  width: 100%;
}

.codex-build-details__inline-code {
  font-family: var(--font-family-monospace, monospace);
  font-size: var(--font-size-small);
}

.codex-build-details__command-text {
  flex: 1;
  min-width: 0;
  margin: 0;
  padding: var(--spacing-25) var(--spacing-50);
  border-radius: var(--border-radius-base);
  background-color: var(--background-color-neutral-subtle);
  font-family: var(--font-family-monospace, monospace);
  font-size: var(--font-size-small);
  line-height: var(--line-height-small);
  color: var(--color-base);
  word-break: break-all;
}
</style>
