<script setup lang="ts">
import tokensCss from '../../../../.agents/skills/codex-tokens/assets/tokens.css?raw'
import {
  getTokensForTokenSubTab,
  parseTokensFromCss,
  tokenSectionTabs,
} from '../lib/parse-tokens'
import type { TokenSection, TokenSubTab } from '../lib/parse-tokens'
import { tokenMainTabBySection } from '../lib/playground-tabs'
import AnimationTokenList from '../playground/AnimationTokenList.vue'
import BorderTokenList from '../playground/BorderTokenList.vue'
import BoxShadowTokenList from '../playground/BoxShadowTokenList.vue'
import CursorTokenList from '../playground/CursorTokenList.vue'
import DimensionTokenList from '../playground/DimensionTokenList.vue'
import OpacityTokenList from '../playground/OpacityTokenList.vue'
import OutlineTokenList from '../playground/OutlineTokenList.vue'
import ZIndexTokenList from '../playground/ZIndexTokenList.vue'
import PlaygroundGrid from '../playground/PlaygroundGrid.vue'
import PlaygroundSection from '../playground/PlaygroundSection.vue'
import PlaygroundSubTabs from '../playground/PlaygroundSubTabs.vue'
import TokenSwatch from '../playground/TokenSwatch.vue'

const props = defineProps<{
  section: TokenSection
}>()

const allTokens = parseTokensFromCss(tokensCss)

const sectionConfig = tokenSectionTabs.find((entry) => entry.id === props.section)!
</script>

<template>
  <PlaygroundSubTabs
    :main-tab-id="tokenMainTabBySection[section]"
    :items="sectionConfig.subTabs"
    :default-active="sectionConfig.subTabs[0].id"
    :ariaLabel="`${sectionConfig.label} tokens`"
  >
    <template #default="{ id: subTabId }">
      <PlaygroundSection>
        <DimensionTokenList
          v-if="subTabId === 'spacing' || subTabId === 'size' || subTabId === 'breakpoint'"
          :kind="subTabId"
          :tokens="
            getTokensForTokenSubTab(allTokens, section, subTabId as TokenSubTab)
          "
        />
        <ZIndexTokenList
          v-else-if="subTabId === 'z-index'"
          :tokens="getTokensForTokenSubTab(allTokens, section, subTabId as TokenSubTab)"
        />
        <BorderTokenList
          v-else-if="subTabId === 'border'"
          :tokens="getTokensForTokenSubTab(allTokens, section, subTabId as TokenSubTab)"
        />
        <BoxShadowTokenList
          v-else-if="subTabId === 'box-shadow'"
          :tokens="getTokensForTokenSubTab(allTokens, section, subTabId as TokenSubTab)"
        />
        <CursorTokenList
          v-else-if="subTabId === 'cursor'"
          :tokens="getTokensForTokenSubTab(allTokens, section, subTabId as TokenSubTab)"
        />
        <OpacityTokenList
          v-else-if="subTabId === 'opacity'"
          :tokens="getTokensForTokenSubTab(allTokens, section, subTabId as TokenSubTab)"
        />
        <OutlineTokenList
          v-else-if="subTabId === 'outline'"
          :tokens="getTokensForTokenSubTab(allTokens, section, subTabId as TokenSubTab)"
        />
        <AnimationTokenList
          v-else-if="subTabId === 'animation' || subTabId === 'transition'"
          :kind="subTabId"
          :tokens="getTokensForTokenSubTab(allTokens, section, subTabId as TokenSubTab)"
        />
        <PlaygroundGrid v-else min="140px" dense>
          <TokenSwatch
            v-for="token in getTokensForTokenSubTab(
              allTokens,
              section,
              subTabId as TokenSubTab,
            )"
            :key="token.name"
            :token="token"
          />
        </PlaygroundGrid>
      </PlaygroundSection>
    </template>
  </PlaygroundSubTabs>
</template>
