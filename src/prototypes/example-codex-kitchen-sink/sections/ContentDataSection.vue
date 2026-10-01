<script setup lang="ts">
import { ref, useTemplateRef } from 'vue'
import {
  CdxAccordion,
  CdxButton,
  CdxCard,
  CdxDialog,
  CdxIcon,
  CdxMenu,
  CdxMenuItem,
  CdxPopover,
  CdxTable,
  CdxTooltip,
} from '@wikimedia/codex'
import { cdxIconAdd, cdxIconBook, cdxIconEdit } from '@wikimedia/codex-icons'

import { contentDataSubTabs } from '../lib/component-tabs'
import { menuItems, tableColumns, tableRows, thumbnailUrl } from '../lib/fixtures'
import PlaygroundSection from '../playground/PlaygroundSection.vue'
import PlaygroundGrid from '../playground/PlaygroundGrid.vue'
import PlaygroundCell from '../playground/PlaygroundCell.vue'
import PlaygroundSubTabs from '../playground/PlaygroundSubTabs.vue'

const vTooltip = CdxTooltip

const accordionOpen = ref(true)
const accordionSeparations = ['none', 'minimal', 'divider', 'outline'] as const

const dialogProgressive = ref(false)
const dialogDestructive = ref(false)
const dialogCustomFooter = ref(false)
const dialogSubtitle = ref(false)

const menuExpanded = ref(false)
const menuSelected = ref<string | null>('edit')

const popoverOpen = ref(false)
const popoverAnchor = useTemplateRef<HTMLElement>('popoverAnchor')

const tableSort = ref({ column: 'title', direction: 'asc' as const })
</script>

<template>
  <PlaygroundSubTabs
    main-tab-id="components-content-data"
    :items="contentDataSubTabs"
    default-active="accordion"
    ariaLabel="Content & data"
  >
    <template #default="{ id }">
      <PlaygroundSection v-if="id === 'accordion'">
        <PlaygroundGrid min="280px">
          <PlaygroundCell v-for="separation in accordionSeparations" :key="separation" :label="separation">
            <CdxAccordion v-model="accordionOpen" :separation="separation">
              <template #title>Title</template>
              <template #description>Description</template>
              <p>Body content</p>
            </CdxAccordion>
          </PlaygroundCell>
          <PlaygroundCell label="open">
            <CdxAccordion open separation="outline">
              <template #title>Title</template>
              <p>Body content</p>
            </CdxAccordion>
          </PlaygroundCell>
        </PlaygroundGrid>
      </PlaygroundSection>

      <PlaygroundSection v-else-if="id === 'card'">
        <PlaygroundGrid min="240px">
          <PlaygroundCell label="default">
            <CdxCard>
              <template #title>Title</template>
              <template #description>Description</template>
            </CdxCard>
          </PlaygroundCell>
          <PlaygroundCell label="url">
            <CdxCard url="#">
              <template #title>Title</template>
              <template #description>Description</template>
            </CdxCard>
          </PlaygroundCell>
          <PlaygroundCell label="icon">
            <CdxCard :icon="cdxIconBook">
              <template #title>Title</template>
            </CdxCard>
          </PlaygroundCell>
          <PlaygroundCell label="thumbnail">
            <CdxCard :thumbnail="{ url: thumbnailUrl, width: 40, height: 40 }">
              <template #title>Title</template>
            </CdxCard>
          </PlaygroundCell>
        </PlaygroundGrid>
      </PlaygroundSection>

      <PlaygroundSection v-else-if="id === 'dialog'">
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

      <PlaygroundSection v-else-if="id === 'menu'">
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

      <PlaygroundSection v-else-if="id === 'menu-item'">
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

      <PlaygroundSection v-else-if="id === 'popover'">
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

      <PlaygroundSection v-else-if="id === 'table'">
        <PlaygroundGrid min="100%">
          <PlaygroundCell label="default">
            <CdxTable
              caption="Table"
              :columns="tableColumns"
              :data="tableRows"
              v-model:sort="tableSort"
            />
          </PlaygroundCell>
          <PlaygroundCell label="paginate">
            <CdxTable
              caption="Table"
              :columns="tableColumns"
              :data="tableRows"
              paginate
              :pagination-size-default="2"
            />
          </PlaygroundCell>
          <PlaygroundCell label="vertical-borders">
            <CdxTable caption="Table" :columns="tableColumns" :data="tableRows" show-vertical-borders />
          </PlaygroundCell>
        </PlaygroundGrid>
      </PlaygroundSection>

      <PlaygroundSection v-else-if="id === 'tooltip'">
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
    </template>
  </PlaygroundSubTabs>
</template>

<style scoped></style>
