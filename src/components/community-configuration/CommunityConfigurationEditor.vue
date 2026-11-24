<script setup lang="ts">
/**
 * `Special:CommunityConfiguration/<id>`: one feature's editor. "Editing <title>",
 * the "View form" / "View history" / "Watch" tabs (Vector only), a link back to
 * the dashboard, then the form (the default slot) and "Save changes". Saving
 * asks for an edit summary, then emits `save` and confirms. Readers who are not
 * administrators see the extension's notices, and cannot save. The "…" menu
 * switches between those two views and, with a `reset` listener, offers "Reset
 * to defaults". Wrap it in `ChromeWrapper`. Copy is the extension's own English
 * messages.
 */
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import {
  CdxButton,
  CdxDialog,
  CdxField,
  CdxIcon,
  CdxMenuButton,
  CdxMessage,
  CdxTextArea,
} from '@wikimedia/codex'
import type { MenuButtonItemData, MenuGroupData } from '@wikimedia/codex'
import { cdxIconEllipsis, cdxIconStar, cdxIconUnStar } from '@wikimedia/codex-icons'

import SpecialPageWrapper from '@/components/SpecialPageWrapper.vue'

import type { CommunityConfigurationFeature } from './types'
import { useCommunityConfigurationAdmin } from './useCommunityConfigurationAdmin'

const props = defineProps<{
  feature: CommunityConfigurationFeature
  /** The dashboard's route, which the back link leads to. */
  basePath: string
  /**
   * The `@reset` listener: "Reset to defaults" in the "…" menu. A prop, not an
   * event, so that the menu offers it only when there is a listener.
   */
  onReset?: () => void
}>()

const emit = defineEmits<{ save: [summary: string] }>()

const { isAdmin } = useCommunityConfigurationAdmin()

// PROTOWIKI+ Not on wiki: prototype controls, to view the page as an administrator or anyone
// else, and to discard the saved configuration.
const ROLE_GROUP: MenuGroupData = {
  label: 'View as',
  items: [
    { value: 'admin', label: 'Administrator', description: 'Can save changes to this form' },
    { value: 'other', label: 'Not an administrator', description: 'Cannot save changes' },
  ],
}

const RESET_GROUP: MenuGroupData = {
  label: 'Configuration',
  items: [
    {
      value: 'reset',
      label: 'Reset to defaults',
      description: 'Discard the saved configuration of this feature',
    },
  ],
}

const menuItems = computed<(MenuButtonItemData | MenuGroupData)[]>(() =>
  props.onReset ? [ROLE_GROUP, RESET_GROUP] : [ROLE_GROUP],
)

/** The selected row is the current view; "Reset to defaults" acts, and selects nothing. */
const menuSelection = computed({
  get: () => (isAdmin.value ? 'admin' : 'other'),
  set: (value: string) => {
    if (value === 'reset') {
      saved.value = false
      props.onReset?.()
    } else {
      isAdmin.value = value === 'admin'
    }
  },
})

const watched = ref(false)
const dialogOpen = ref(false)
const summary = ref('')
const saved = ref(false)

function openDialog(): void {
  if (!isAdmin.value) return
  saved.value = false
  summary.value = ''
  dialogOpen.value = true
}

function save(): void {
  emit('save', summary.value.trim())
  dialogOpen.value = false
  saved.value = true
}
</script>

<template>
  <SpecialPageWrapper :title="`Editing ${feature.title}`" class="cc-editor">
    <template #actions>
      <CdxMenuButton
        v-model:selected="menuSelection"
        :menu-items="menuItems"
        weight="quiet"
        aria-label="View this page as"
      >
        <CdxIcon :icon="cdxIconEllipsis" />
      </CdxMenuButton>
    </template>

    <nav class="cc-editor__tabs" aria-label="Views">
      <span class="cc-editor__tab cc-editor__tab--selected" aria-current="page">View form</span>
      <a
        class="cc-editor__tab"
        :href="feature.historyUrl ?? '#'"
        :target="feature.historyUrl ? '_blank' : undefined"
        @click="!feature.historyUrl && $event.preventDefault()"
      >
        View history
      </a>
      <a class="cc-editor__tab" href="#" @click.prevent="watched = !watched">
        <CdxIcon :icon="watched ? cdxIconUnStar : cdxIconStar" size="small" />
        {{ watched ? 'Unwatch' : 'Watch' }}
      </a>
    </nav>

    <!-- MediaWiki's subtitle line: a subpage's way back to its parent. -->
    <p class="cc-editor__back">
      &lt; <RouterLink :to="basePath">Special:CommunityConfiguration</RouterLink>
    </p>

    <CdxMessage v-if="!isAdmin" class="cc-editor__notice">
      This page is protected. Configuration for this feature is only editable by administrators.
    </CdxMessage>

    <form class="cc-editor__form" @submit.prevent="openDialog">
      <slot />

      <div class="cc-editor__footer">
        <CdxMessage
          v-if="saved"
          type="success"
          allow-user-dismiss
          dismiss-button-label="Close"
          @user-dismissed="saved = false"
        >
          Your changes were saved
        </CdxMessage>
        <CdxMessage v-if="!isAdmin" inline>
          You cannot save changes to this form because configuration for this feature is only
          editable by administrators.
        </CdxMessage>
        <div>
          <CdxButton type="submit" action="progressive" weight="primary" :disabled="!isAdmin">
            Save changes
          </CdxButton>
        </div>
      </div>
    </form>

    <CdxDialog
      v-model:open="dialogOpen"
      :title="`Save changes for ${feature.title}`"
      use-close-button
      :primary-action="{ label: 'Save changes', actionType: 'progressive' }"
      :default-action="{ label: 'Cancel' }"
      @primary="save"
      @default="dialogOpen = false"
    >
      <div class="cc-editor__dialog">
        <CdxMessage>
          <strong>Reminder</strong>: This change may impact a large number of community members,
          please consider indicating why you are making the change and linking to any related
          community discussion if appropriate.
        </CdxMessage>
        <CdxField>
          <template #label>Edit summary</template>
          <CdxTextArea
            v-model="summary"
            placeholder="Describe the changes that were made in the configuration"
          />
        </CdxField>
      </div>
    </CdxDialog>
  </SpecialPageWrapper>
</template>

<style scoped>
/* Vector 2022's page tabs, right of the title rule: the selected one underlined. */
.cc-editor__tabs {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-100);
  margin-top: calc(-1 * var(--spacing-100));
  border-bottom: var(--border-width-base) var(--border-style-base) var(--border-color-subtle);
}

.cc-editor[data-skin='mobile'] .cc-editor__tabs {
  display: none;
}

.cc-editor__tab {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-25);
  margin-bottom: calc(-1 * var(--border-width-base));
  padding-block: var(--spacing-50);
  border-bottom: var(--border-width-thick) var(--border-style-base) transparent;
}

.cc-editor__tab .cdx-icon {
  color: inherit;
}

.cc-editor__tab--selected {
  border-bottom-color: var(--border-color-emphasized);
  color: var(--color-base);
}

.cc-editor__back {
  margin-block: var(--spacing-50) var(--spacing-100);
}

.cc-editor__notice {
  margin-bottom: var(--spacing-100);
}

.cc-editor__form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-150);
}

/* As the extension: the footer stays in view while the form scrolls under it. */
.cc-editor__footer {
  position: sticky;
  bottom: 0;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-75);
  padding-block: var(--spacing-100);
  border-top: var(--border-width-base) var(--border-style-base) var(--border-color-subtle);
  background-color: var(--background-color-base);
}

.cc-editor__dialog {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-100);
}
</style>
