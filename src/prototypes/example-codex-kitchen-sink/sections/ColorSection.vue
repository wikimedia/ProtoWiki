<script setup lang="ts">
import tokensCss from '../../../../.agents/skills/codex-tokens/assets/tokens.css?raw'
import {
  colorSubTabs,
  getColorTokensForSubTab,
  parseTokensFromCss,
} from '../lib/parse-tokens'
import type { ColorSubTab } from '../lib/parse-tokens'
import PlaygroundGrid from '../playground/PlaygroundGrid.vue'
import PlaygroundSubTabs from '../playground/PlaygroundSubTabs.vue'
import TokenSwatch from '../playground/TokenSwatch.vue'

const allTokens = parseTokensFromCss(tokensCss)
</script>

<template>
  <PlaygroundSubTabs
    :items="colorSubTabs"
    default-active="text"
    ariaLabel="Color"
  >
    <template #default="{ id }">
      <PlaygroundGrid min="140px" dense>
        <TokenSwatch
          v-for="token in getColorTokensForSubTab(allTokens, id as ColorSubTab)"
          :key="token.name"
          :token="token"
        />
      </PlaygroundGrid>
    </template>
  </PlaygroundSubTabs>
</template>
