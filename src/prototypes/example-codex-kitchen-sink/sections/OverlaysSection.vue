<script setup lang="ts">
import { ref, useTemplateRef } from 'vue'
import {
  CdxButton,
  CdxDialog,
  CdxIcon,
  CdxMenu,
  CdxMenuButton,
  CdxMenuItem,
  CdxPopover,
  CdxTooltip,
} from '@wikimedia/codex'
import { cdxIconAdd, cdxIconEdit, cdxIconEllipsis } from '@wikimedia/codex-icons'

import { menuItems } from '../lib/fixtures'
import PlaygroundSection from '../playground/PlaygroundSection.vue'
import PlaygroundGrid from '../playground/PlaygroundGrid.vue'
import PlaygroundCell from '../playground/PlaygroundCell.vue'

const vTooltip = CdxTooltip

const dialogProgressive = ref(false)
const dialogDestructive = ref(false)
const dialogCustomFooter = ref(false)
const dialogSubtitle = ref(false)

const menuExpanded = ref(false)
const menuSelected = ref<string | null>('edit')
const menuButtonSelected = ref<string | null>(null)

const popoverOpen = ref(false)
const popoverAnchor = useTemplateRef<HTMLElement>('popoverAnchor')
</script>

<template>
  <PlaygroundSection title="CdxDialog">
    <PlaygroundGrid min="180px">
      <PlaygroundCell label="progressive primary">
        <CdxButton @click="dialogProgressive = true">Open</CdxButton>
      </PlaygroundCell>
      <PlaygroundCell label="destructive primary">
        <CdxButton action="destructive" @click="dialogDestructive = true">Open</CdxButton>
      </PlaygroundCell>
      <PlaygroundCell label="custom footer">
        <CdxButton @click="dialogCustomFooter = true">Open</CdxButton>
      </PlaygroundCell>
      <PlaygroundCell label="subtitle">
        <CdxButton @click="dialogSubtitle = true">Open</CdxButton>
      </PlaygroundCell>
    </PlaygroundGrid>

    <CdxDialog
      v-model:open="dialogProgressive"
      title="Title"
      close-button-label="Close"
      :primary-action="{ label: 'Primary', actionType: 'progressive' }"
      :default-action="{ label: 'Default' }"
      dismissable
      @primary="dialogProgressive = false"
      @default="dialogProgressive = false"
    >
      Body
    </CdxDialog>

    <CdxDialog
      v-model:open="dialogDestructive"
      title="Title"
      close-button-label="Close"
      :primary-action="{ label: 'Delete', actionType: 'destructive' }"
      :default-action="{ label: 'Cancel' }"
      dismissable
      @primary="dialogDestructive = false"
      @default="dialogDestructive = false"
    >
      Body
    </CdxDialog>

    <CdxDialog
      v-model:open="dialogCustomFooter"
      title="Title"
      close-button-label="Close"
      dismissable
    >
      Body
      <template #footer>
        <CdxButton weight="quiet" @click="dialogCustomFooter = false">Cancel</CdxButton>
        <CdxButton action="progressive" :icon="cdxIconAdd" @click="dialogCustomFooter = false">
          Add
        </CdxButton>
      </template>
    </CdxDialog>

    <CdxDialog
      v-model:open="dialogSubtitle"
      title="Title"
      subtitle="Subtitle"
      close-button-label="Close"
      :primary-action="{ label: 'Primary', actionType: 'progressive' }"
      dismissable
      @primary="dialogSubtitle = false"
    >
      Body
    </CdxDialog>
  </PlaygroundSection>

  <PlaygroundSection title="CdxTooltip">
    <PlaygroundGrid min="160px">
      <PlaygroundCell label="directive">
        <CdxButton v-tooltip="'Tooltip text'">Hover</CdxButton>
      </PlaygroundCell>
      <PlaygroundCell label="icon">
        <CdxButton v-tooltip="'Edit'" weight="quiet" aria-label="Edit">
          <CdxIcon :icon="cdxIconEdit" />
        </CdxButton>
      </PlaygroundCell>
    </PlaygroundGrid>
  </PlaygroundSection>

  <PlaygroundSection title="CdxMenuItem">
    <PlaygroundGrid min="200px">
      <PlaygroundCell label="default">
        <CdxMenuItem label="Menu item" value="item" />
      </PlaygroundCell>
      <PlaygroundCell label="with icon">
        <CdxMenuItem label="Edit" value="edit" :icon="cdxIconEdit" />
      </PlaygroundCell>
      <PlaygroundCell label="disabled">
        <CdxMenuItem label="Disabled" value="disabled" disabled />
      </PlaygroundCell>
    </PlaygroundGrid>
  </PlaygroundSection>

  <PlaygroundSection title="CdxMenu">
    <PlaygroundGrid min="220px">
      <PlaygroundCell label="expanded">
        <CdxMenu
          v-model:expanded="menuExpanded"
          v-model:selected="menuSelected"
          :menu-items="menuItems"
        />
      </PlaygroundCell>
      <PlaygroundCell label="show-pending">
        <CdxMenu
          v-model:expanded="menuExpanded"
          v-model:selected="menuSelected"
          :menu-items="[]"
          show-pending
        >
          <template #pending>Pending</template>
        </CdxMenu>
      </PlaygroundCell>
    </PlaygroundGrid>
  </PlaygroundSection>

  <PlaygroundSection title="CdxMenuButton">
    <PlaygroundGrid min="160px">
      <PlaygroundCell label="default">
        <CdxMenuButton v-model:selected="menuButtonSelected" :menu-items="menuItems">
          <CdxIcon :icon="cdxIconEllipsis" />
        </CdxMenuButton>
      </PlaygroundCell>
    </PlaygroundGrid>
  </PlaygroundSection>

  <PlaygroundSection title="CdxPopover">
    <PlaygroundGrid min="240px">
      <PlaygroundCell label="open">
        <CdxButton ref="popoverAnchor" @click="popoverOpen = !popoverOpen">Toggle</CdxButton>
        <CdxPopover
          v-model:open="popoverOpen"
          :anchor="popoverAnchor"
          title="Title"
          use-close-button
          :primary-action="{ label: 'Primary', actionType: 'progressive' }"
          :default-action="{ label: 'Default' }"
        >
          Body
        </CdxPopover>
      </PlaygroundCell>
    </PlaygroundGrid>
  </PlaygroundSection>
</template>

<style scoped></style>
