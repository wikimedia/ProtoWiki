<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  CdxButton,
  CdxButtonGroup,
  CdxIcon,
  CdxMenuButton,
  CdxToggleButton,
  CdxToggleButtonGroup,
} from '@wikimedia/codex'
import { cdxIconAdd, cdxIconEdit, cdxIconEllipsis, cdxIconSearch } from '@wikimedia/codex-icons'
import type { ButtonAction, ButtonSize, ButtonWeight } from '@wikimedia/codex'

import { buttonsSubTabs } from '../lib/component-tabs'
import {
  buttonGroupItems,
  buttonGroupLongItems,
  menuItems,
  toggleGroupItems,
} from '../lib/fixtures'
import PlaygroundSection from '../playground/PlaygroundSection.vue'
import PlaygroundGrid from '../playground/PlaygroundGrid.vue'
import PlaygroundCell from '../playground/PlaygroundCell.vue'
import PlaygroundSubTabs from '../playground/PlaygroundSubTabs.vue'

const actions: ButtonAction[] = ['default', 'progressive', 'destructive']
const weights: ButtonWeight[] = ['normal', 'primary', 'quiet']
const sizes: ButtonSize[] = ['small', 'medium', 'large']

const actionLabels: Record<ButtonAction, string> = {
  default: 'Default',
  progressive: 'Progressive',
  destructive: 'Destructive',
}

const disabledVariants = computed(() => {
  const variants: { action: ButtonAction; weight: ButtonWeight; label: string }[] = []
  for (const action of actions) {
    for (const weight of weights) {
      if (weight === 'quiet') continue
      variants.push({
        action,
        weight,
        label: `${action} / ${weight}`,
      })
    }
  }
  return variants
})

const toggleBold = ref(false)
const toggleBoldDisabled = ref(true)
const toggleAlignment = ref('center')
const menuButtonSelected = ref<string | null>(null)
</script>

<template>
  <PlaygroundSubTabs
    main-tab-id="components-buttons"
    :items="buttonsSubTabs"
    default-active="button"
    ariaLabel="Buttons"
  >
    <template #default="{ id }">
      <PlaygroundSection v-if="id === 'button'">
        <div class="button-showcase">
          <section v-for="action in actions" :key="action" class="button-showcase__group">
            <h5 class="button-showcase__heading">{{ actionLabels[action] }}</h5>
            <div class="button-showcase__matrix">
              <div class="button-showcase__row button-showcase__row--header">
                <span class="button-showcase__corner" />
                <code v-for="size in sizes" :key="size" class="button-showcase__col-label">{{ size }}</code>
              </div>
              <div v-for="weight in weights" :key="weight" class="button-showcase__row">
                <code class="button-showcase__row-label">{{ weight }}</code>
                <div v-for="size in sizes" :key="size" class="button-showcase__cell">
                  <CdxButton :action="action" :weight="weight" :size="size">Label</CdxButton>
                </div>
              </div>
            </div>
          </section>

          <section class="button-showcase__group">
            <h5 class="button-showcase__heading">Disabled</h5>
            <div class="button-showcase__stack">
              <div
                v-for="variant in disabledVariants"
                :key="variant.label"
                class="button-showcase__stack-item"
              >
                <CdxButton
                  :action="variant.action"
                  :weight="variant.weight"
                  size="medium"
                  disabled
                >
                  Label
                </CdxButton>
                <code class="button-showcase__stack-label">{{ variant.label }}</code>
              </div>
            </div>
          </section>

          <section class="button-showcase__group">
            <h5 class="button-showcase__heading">Icons</h5>
            <div class="button-showcase__stack">
              <div class="button-showcase__stack-item">
                <CdxButton action="progressive">
                  <CdxIcon :icon="cdxIconAdd" />
                  Add
                </CdxButton>
                <code class="button-showcase__stack-label">icon + label</code>
              </div>
              <div class="button-showcase__stack-item">
                <CdxButton weight="quiet" aria-label="Search">
                  <CdxIcon :icon="cdxIconSearch" />
                </CdxButton>
                <code class="button-showcase__stack-label">icon-only / quiet</code>
              </div>
              <div class="button-showcase__stack-item">
                <CdxButton weight="quiet" size="large" aria-label="Edit">
                  <CdxIcon :icon="cdxIconEdit" />
                </CdxButton>
                <code class="button-showcase__stack-label">icon-only / large</code>
              </div>
            </div>
          </section>
        </div>
      </PlaygroundSection>

      <PlaygroundSection v-else-if="id === 'button-group'">
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

      <PlaygroundSection v-else-if="id === 'menu-button'">
        <PlaygroundGrid min="160px">
          <PlaygroundCell label="default">
            <CdxMenuButton v-model:selected="menuButtonSelected" :menu-items="menuItems">
              <CdxIcon :icon="cdxIconEllipsis" />
            </CdxMenuButton>
          </PlaygroundCell>
        </PlaygroundGrid>
      </PlaygroundSection>

      <PlaygroundSection v-else-if="id === 'toggle-button'">
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

      <PlaygroundSection v-else-if="id === 'toggle-button-group'">
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
    </template>
  </PlaygroundSubTabs>
</template>

<style scoped>
.button-showcase {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-100);
}

.button-showcase__heading {
  margin: 0 0 var(--spacing-50);
  font-family: var(--font-family-base);
  font-size: var(--font-size-medium);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-medium);
  color: var(--color-base);
}

.button-showcase__matrix {
  display: grid;
  grid-template-columns: 4rem repeat(3, max-content);
  gap: var(--spacing-50) var(--spacing-75);
  align-items: center;
}

.button-showcase__row {
  display: contents;
}

.button-showcase__corner {
  display: block;
}

.button-showcase__col-label,
.button-showcase__row-label,
.button-showcase__stack-label {
  font-family: var(--font-family-monospace);
  font-size: var(--font-size-small);
  line-height: var(--line-height-small);
  color: var(--color-subtle);
}

.button-showcase__col-label {
  text-align: center;
}

.button-showcase__cell {
  display: flex;
  justify-content: center;
  min-width: 5.5rem;
}

.button-showcase__stack {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-50);
}

.button-showcase__stack-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-75);
}
</style>
