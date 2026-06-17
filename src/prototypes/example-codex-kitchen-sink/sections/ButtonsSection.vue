<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  CdxButton,
  CdxButtonGroup,
  CdxIcon,
  CdxImage,
  CdxInfoChip,
  CdxThumbnail,
  CdxToggleButton,
  CdxToggleButtonGroup,
  CdxToggleSwitch,
} from '@wikimedia/codex'
import {
  cdxIconAdd,
  cdxIconAlert,
  cdxIconEdit,
  cdxIconImage,
  cdxIconSearch,
} from '@wikimedia/codex-icons'
import type { ButtonAction, ButtonSize, ButtonWeight } from '@wikimedia/codex'

import {
  buttonGroupItems,
  buttonGroupLongItems,
  imageUrl,
  thumbnailUrl,
  toggleGroupItems,
} from '../lib/fixtures'
import PlaygroundSection from '../playground/PlaygroundSection.vue'
import PlaygroundGrid from '../playground/PlaygroundGrid.vue'
import PlaygroundCell from '../playground/PlaygroundCell.vue'

const actions: ButtonAction[] = ['default', 'progressive', 'destructive']
const weights: ButtonWeight[] = ['normal', 'primary', 'quiet']
const sizes: ButtonSize[] = ['small', 'medium', 'large']
const infoChipStatuses = ['notice', 'warning', 'error', 'success'] as const
const aspectRatios = ['16:9', '3:2', '4:3', '1:1', '3:4', '2:3'] as const

const buttonVariants = computed(() => {
  const variants: {
    action: ButtonAction
    weight: ButtonWeight
    size: ButtonSize
    label: string
  }[] = []
  for (const action of actions) {
    for (const weight of weights) {
      for (const size of sizes) {
        variants.push({
          action,
          weight,
          size,
          label: `${action} / ${weight} / ${size}`,
        })
      }
    }
  }
  return variants
})

const toggleBold = ref(false)
const toggleBoldDisabled = ref(true)
const toggleAlignment = ref('center')
const toggleSwitch = ref(true)
const toggleSwitchDisabled = ref(false)
</script>

<template>
  <PlaygroundSection title="CdxButton">
    <PlaygroundGrid min="180px">
      <PlaygroundCell v-for="variant in buttonVariants" :key="variant.label" :label="variant.label">
        <CdxButton :action="variant.action" :weight="variant.weight" :size="variant.size">
          Label
        </CdxButton>
      </PlaygroundCell>
      <PlaygroundCell
        v-for="variant in buttonVariants.filter((v) => v.size === 'medium' && v.weight !== 'quiet')"
        :key="`disabled-${variant.label}`"
        :label="`${variant.label} / disabled`"
      >
        <CdxButton :action="variant.action" :weight="variant.weight" :size="variant.size" disabled>
          Label
        </CdxButton>
      </PlaygroundCell>
      <PlaygroundCell label="icon + label">
        <CdxButton action="progressive">
          <CdxIcon :icon="cdxIconAdd" />
          Add
        </CdxButton>
      </PlaygroundCell>
      <PlaygroundCell label="icon-only / quiet">
        <CdxButton weight="quiet" aria-label="Search">
          <CdxIcon :icon="cdxIconSearch" />
        </CdxButton>
      </PlaygroundCell>
      <PlaygroundCell label="icon-only / large">
        <CdxButton weight="quiet" size="large" aria-label="Edit">
          <CdxIcon :icon="cdxIconEdit" />
        </CdxButton>
      </PlaygroundCell>
    </PlaygroundGrid>
  </PlaygroundSection>

  <PlaygroundSection title="CdxButtonGroup">
    <PlaygroundGrid min="280px">
      <PlaygroundCell label="default">
        <CdxButtonGroup :buttons="buttonGroupItems" />
      </PlaygroundCell>
      <PlaygroundCell label="long labels">
        <CdxButtonGroup :buttons="buttonGroupLongItems" />
      </PlaygroundCell>
      <PlaygroundCell label="disabled item">
        <CdxButtonGroup
          :buttons="[
            { value: 'a', label: 'A' },
            { value: 'b', label: 'B' },
            { value: 'c', label: 'C', disabled: true },
          ]"
        />
      </PlaygroundCell>
    </PlaygroundGrid>
  </PlaygroundSection>

  <PlaygroundSection title="CdxToggleButton">
    <PlaygroundGrid min="120px">
      <PlaygroundCell label="off">
        <CdxToggleButton v-model="toggleBoldDisabled">
          <CdxIcon :icon="cdxIconEdit" />
        </CdxToggleButton>
      </PlaygroundCell>
      <PlaygroundCell label="on">
        <CdxToggleButton v-model="toggleBold">
          <CdxIcon :icon="cdxIconEdit" />
        </CdxToggleButton>
      </PlaygroundCell>
      <PlaygroundCell label="disabled">
        <CdxToggleButton :model-value="false" disabled>
          <CdxIcon :icon="cdxIconEdit" />
        </CdxToggleButton>
      </PlaygroundCell>
    </PlaygroundGrid>
  </PlaygroundSection>

  <PlaygroundSection title="CdxToggleButtonGroup">
    <PlaygroundGrid min="280px">
      <PlaygroundCell label="default">
        <CdxToggleButtonGroup v-model="toggleAlignment" :buttons="toggleGroupItems" />
      </PlaygroundCell>
      <PlaygroundCell label="disabled">
        <CdxToggleButtonGroup
          model-value="center"
          :buttons="toggleGroupItems.map((b) => ({ ...b, disabled: true }))"
        />
      </PlaygroundCell>
    </PlaygroundGrid>
  </PlaygroundSection>

  <PlaygroundSection title="CdxToggleSwitch">
    <PlaygroundGrid min="180px">
      <PlaygroundCell label="off">
        <CdxToggleSwitch v-model="toggleSwitchDisabled">Off</CdxToggleSwitch>
      </PlaygroundCell>
      <PlaygroundCell label="on">
        <CdxToggleSwitch v-model="toggleSwitch">On</CdxToggleSwitch>
      </PlaygroundCell>
      <PlaygroundCell label="disabled">
        <CdxToggleSwitch :model-value="true" disabled>Disabled</CdxToggleSwitch>
      </PlaygroundCell>
    </PlaygroundGrid>
  </PlaygroundSection>

  <PlaygroundSection title="CdxIcon">
    <PlaygroundGrid min="100px">
      <PlaygroundCell
        v-for="size in ['xx-small', 'x-small', 'small', 'medium']"
        :key="size"
        :label="size"
      >
        <CdxIcon :icon="cdxIconSearch" :size="size" />
      </PlaygroundCell>
    </PlaygroundGrid>
  </PlaygroundSection>

  <PlaygroundSection title="CdxInfoChip">
    <PlaygroundGrid min="140px">
      <PlaygroundCell v-for="status in infoChipStatuses" :key="status" :label="status">
        <CdxInfoChip :status="status" :icon="cdxIconAlert">Status</CdxInfoChip>
      </PlaygroundCell>
      <PlaygroundCell label="no icon">
        <CdxInfoChip status="notice">Status</CdxInfoChip>
      </PlaygroundCell>
    </PlaygroundGrid>
  </PlaygroundSection>

  <PlaygroundSection title="CdxThumbnail">
    <PlaygroundGrid min="120px">
      <PlaygroundCell label="image">
        <CdxThumbnail :thumbnail="{ url: thumbnailUrl, width: 80, height: 80 }" />
      </PlaygroundCell>
      <PlaygroundCell label="placeholder">
        <CdxThumbnail :placeholder-icon="cdxIconImage" />
      </PlaygroundCell>
    </PlaygroundGrid>
  </PlaygroundSection>

  <PlaygroundSection title="CdxImage">
    <PlaygroundGrid min="200px">
      <PlaygroundCell v-for="ratio in aspectRatios" :key="ratio" :label="ratio">
        <CdxImage :src="imageUrl" alt="Sample" :aspect-ratio="ratio" />
      </PlaygroundCell>
      <PlaygroundCell label="object-fit cover">
        <CdxImage :src="imageUrl" alt="Sample" aspect-ratio="1:1" object-fit="cover" />
      </PlaygroundCell>
      <PlaygroundCell label="object-fit contain">
        <CdxImage :src="imageUrl" alt="Sample" aspect-ratio="1:1" object-fit="contain" />
      </PlaygroundCell>
    </PlaygroundGrid>
  </PlaygroundSection>
</template>

<style scoped></style>
