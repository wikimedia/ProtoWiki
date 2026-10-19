<!-- VE toolbar derived from suggestion-mode (Bárbara Martínez Calvo). -->
<script setup lang="ts">
import { CdxIcon, CdxToggleButton } from '@wikimedia/codex'
import {
  cdxIconClose,
  cdxIconEdit,
  cdxIconExpand,
  cdxIconHelp,
  cdxIconLightbulb,
  cdxIconLink,
  cdxIconListBullet,
  cdxIconMenu,
  cdxIconNext,
  cdxIconQuotes,
  cdxIconRedo,
  cdxIconSpecialCharacter,
  cdxIconTextStyle,
  cdxIconUndo,
  cdxIconAlert,
} from '@wikimedia/codex-icons'

import type { Skin } from '@/theme'

defineProps<{
  skin: Skin
  hasUnsavedChanges: boolean
}>()

const emit = defineEmits<{
  exitEdit: []
  undo: []
  'update:showSuggestions': [value: boolean]
}>()

const showSuggestionsModel = defineModel<boolean>('showSuggestions', { required: true })
</script>

<template>
  <div v-if="skin === 'mobile'" class="editor-toolbar editor-toolbar--minerva">
    <button type="button" class="toolbar-btn toolbar-btn-icon-only" aria-label="Close" @click="emit('exitEdit')">
      <CdxIcon :icon="cdxIconClose" size="medium" />
    </button>
    <button
      type="button"
      class="toolbar-btn toolbar-btn-icon-only"
      :class="{ 'toolbar-btn-disabled': !hasUnsavedChanges }"
      :disabled="!hasUnsavedChanges"
      aria-label="Undo"
      @click="emit('undo')"
    >
      <CdxIcon :icon="cdxIconUndo" size="medium" />
    </button>
    <button type="button" class="toolbar-btn toolbar-btn-icon-only" aria-label="Text styles">
      <CdxIcon :icon="cdxIconTextStyle" size="medium" />
      <CdxIcon :icon="cdxIconExpand" size="small" class="dropdown-icon" />
    </button>
    <button type="button" class="toolbar-btn toolbar-btn-icon-only" aria-label="Cite">
      <CdxIcon :icon="cdxIconQuotes" size="medium" />
    </button>
    <button type="button" class="toolbar-btn toolbar-btn-icon-only" aria-label="Link">
      <CdxIcon :icon="cdxIconLink" size="medium" />
    </button>
    <button
      type="button"
      class="toolbar-btn toolbar-btn-icon-only toolbar-btn-primary"
      :class="{ 'toolbar-btn-primary--disabled': !hasUnsavedChanges }"
      :disabled="!hasUnsavedChanges"
      aria-label="Publish"
    >
      <CdxIcon :icon="cdxIconNext" size="medium" />
    </button>
  </div>

  <div v-else class="editor-toolbar">
    <div class="editor-toolbar-left">
      <button
        type="button"
        class="toolbar-btn toolbar-btn-icon-only"
        :class="{ 'toolbar-btn-disabled': !hasUnsavedChanges }"
        :disabled="!hasUnsavedChanges"
        @click="emit('undo')"
      >
        <CdxIcon :icon="cdxIconUndo" size="medium" />
      </button>
      <button type="button" class="toolbar-btn toolbar-btn-icon-only toolbar-btn-disabled" disabled>
        <CdxIcon :icon="cdxIconRedo" size="medium" />
      </button>
      <button type="button" class="toolbar-btn toolbar-btn-dropdown">
        <span class="toolbar-btn-text">Paragraph</span>
        <CdxIcon :icon="cdxIconExpand" size="small" class="dropdown-icon" />
      </button>
      <button type="button" class="toolbar-btn toolbar-btn-icon-only">
        <CdxIcon :icon="cdxIconLink" size="medium" />
      </button>
      <button type="button" class="toolbar-btn">
        <CdxIcon :icon="cdxIconQuotes" size="medium" />
        <span class="toolbar-btn-text">Cite</span>
      </button>
      <button type="button" class="toolbar-btn toolbar-btn-dropdown">
        <CdxIcon :icon="cdxIconListBullet" size="medium" />
        <CdxIcon :icon="cdxIconExpand" size="small" class="dropdown-icon" />
      </button>
      <button type="button" class="toolbar-btn toolbar-btn-icon-only">
        <CdxIcon :icon="cdxIconSpecialCharacter" size="medium" />
      </button>
    </div>
    <div class="editor-toolbar-right">
      <CdxToggleButton
        v-model="showSuggestionsModel"
        quiet
        aria-label="Toggle suggestions"
        class="suggestions-toggle-btn"
        :class="{ 'suggestions-toggle-btn--active': showSuggestionsModel }"
      >
        <span class="lightbulb-icon-wrapper">
          <span v-if="showSuggestionsModel" class="bulb-rays">
            <span class="ray ray-1"></span>
            <span class="ray ray-2"></span>
            <span class="ray ray-3"></span>
            <span class="ray ray-4"></span>
            <span class="ray ray-5"></span>
          </span>
          <CdxIcon :icon="cdxIconLightbulb" size="medium" />
        </span>
      </CdxToggleButton>
      <button type="button" class="toolbar-btn toolbar-btn-icon-only">
        <CdxIcon :icon="cdxIconHelp" size="medium" />
      </button>
      <button type="button" class="toolbar-btn toolbar-btn-icon-only">
        <CdxIcon :icon="cdxIconAlert" size="medium" />
      </button>
      <button type="button" class="toolbar-btn toolbar-btn-icon-only">
        <CdxIcon :icon="cdxIconMenu" size="medium" />
      </button>
      <button type="button" class="toolbar-btn toolbar-btn-dropdown">
        <CdxIcon :icon="cdxIconEdit" size="medium" />
        <CdxIcon :icon="cdxIconExpand" size="small" class="dropdown-icon" />
      </button>
      <button
        type="button"
        class="toolbar-btn-primary"
        :class="{ 'toolbar-btn-primary--disabled': !hasUnsavedChanges }"
        :disabled="!hasUnsavedChanges"
      >
        Publish changes...
      </button>
    </div>
  </div>
</template>
