<script setup lang="ts">
import tokensCss from '../../../../.agents/skills/codex-tokens/assets/tokens.css?raw'
import { groupTokensByFamily, parseTokensFromCss } from '../lib/parse-tokens'
import type { TokenFamilyGroup } from '../lib/parse-tokens'
import PlaygroundSection from '../playground/PlaygroundSection.vue'
import PlaygroundGrid from '../playground/PlaygroundGrid.vue'
import PlaygroundSubTabs from '../playground/PlaygroundSubTabs.vue'
import type { PlaygroundSubTabItem } from '../playground/PlaygroundSubTabs.vue'
import TokenSwatch from '../playground/TokenSwatch.vue'

const families = groupTokensByFamily(parseTokensFromCss(tokensCss), {
  exclude: ['Typography', 'Color'],
})
const defaultFamily = families[0]?.family ?? 'Spacing'
const familyTabs = families.map((familyGroup) => ({
  id: familyGroup.family,
  label: familyGroup.family,
  familyGroup,
}))

interface TokenFamilyTab extends PlaygroundSubTabItem {
  familyGroup: TokenFamilyGroup
}

function familyGroupFor(item: PlaygroundSubTabItem): TokenFamilyGroup {
  return (item as TokenFamilyTab).familyGroup
}
</script>

<template>
  <PlaygroundSubTabs :items="familyTabs" :default-active="defaultFamily" ariaLabel="Token types">
    <template #default="{ item }">
      <div class="tokens-family">
        <template v-if="familyGroupFor(item).categories.length === 1">
          <PlaygroundSection>
            <PlaygroundGrid min="140px" dense>
              <TokenSwatch
                v-for="token in familyGroupFor(item).categories[0].tokens"
                :key="token.name"
                :token="token"
              />
            </PlaygroundGrid>
          </PlaygroundSection>
        </template>

        <template v-else>
          <PlaygroundSection
            v-for="group in familyGroupFor(item).categories"
            :key="group.category"
            :title="group.category"
          >
            <PlaygroundGrid min="140px" dense>
              <TokenSwatch v-for="token in group.tokens" :key="token.name" :token="token" />
            </PlaygroundGrid>
          </PlaygroundSection>
        </template>
      </div>
    </template>
  </PlaygroundSubTabs>
</template>
