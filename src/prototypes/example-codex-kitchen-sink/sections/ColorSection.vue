<script setup lang="ts">
import tokensCss from '../../../../.agents/skills/codex-tokens/assets/tokens.css?raw'
import { colorSubTabs, getColorTokensForSubTab, parseTokensFromCss } from '../lib/parse-tokens'
import type { ColorSubTab } from '../lib/parse-tokens'
import ColorPaletteList from '../playground/ColorPaletteList.vue'
import ColorTokenList from '../playground/ColorTokenList.vue'
import PlaygroundSection from '../playground/PlaygroundSection.vue'
import PlaygroundSubTabs from '../playground/PlaygroundSubTabs.vue'

const allTokens = parseTokensFromCss(tokensCss)
</script>

<template>
  <PlaygroundSubTabs
    main-tab-id="color"
    :items="colorSubTabs"
    default-active="text"
    ariaLabel="Color"
  >
    <template #default="{ id }">
      <PlaygroundSection>
        <ColorPaletteList v-if="id === 'palette'" />
        <ColorTokenList
          v-else
          :mode="id as Exclude<ColorSubTab, 'palette'>"
          :tokens="getColorTokensForSubTab(allTokens, id as Exclude<ColorSubTab, 'palette'>)"
        />
      </PlaygroundSection>
    </template>
  </PlaygroundSubTabs>
</template>
