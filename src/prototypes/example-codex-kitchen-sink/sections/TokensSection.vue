<script setup lang="ts">
import { CdxTab, CdxTabs } from '@wikimedia/codex'
import tokensCss from '../../../../.agents/skills/codex-tokens/assets/tokens.css?raw'
import { groupTokensByFamily, isTokenFamily, parseTokensFromCss } from '../lib/parse-tokens'
import type { TokenFamily } from '../lib/parse-tokens'
import { useUrlQueryParam } from '../lib/use-url-query-param'
import PlaygroundSection from '../playground/PlaygroundSection.vue'
import PlaygroundGrid from '../playground/PlaygroundGrid.vue'
import TokenSwatch from '../playground/TokenSwatch.vue'

const families = groupTokensByFamily(parseTokensFromCss(tokensCss), { exclude: ['Typography'] })
const defaultFamily = families[0]?.family ?? 'Color'
const activeFamily = useUrlQueryParam<TokenFamily>('sub', defaultFamily, isTokenFamily)
</script>

<template>
  <CdxTabs v-model:active="activeFamily" class="tokens-tabs" aria-label="Token types" framed>
    <CdxTab
      v-for="familyGroup in families"
      :key="familyGroup.family"
      :name="familyGroup.family"
      :label="familyGroup.family"
    >
      <div class="tokens-family">
        <template v-if="familyGroup.categories.length === 1">
          <PlaygroundGrid min="140px" dense>
            <TokenSwatch
              v-for="token in familyGroup.categories[0].tokens"
              :key="token.name"
              :token="token"
            />
          </PlaygroundGrid>
        </template>

        <template v-else>
          <PlaygroundSection
            v-for="group in familyGroup.categories"
            :key="group.category"
            :title="group.category"
          >
            <PlaygroundGrid min="140px" dense>
              <TokenSwatch v-for="token in group.tokens" :key="token.name" :token="token" />
            </PlaygroundGrid>
          </PlaygroundSection>
        </template>
      </div>
    </CdxTab>
  </CdxTabs>
</template>

<style scoped>
.tokens-tabs {
  /* margin: 0px -16px; */
}

.tokens-tabs :deep(> .cdx-tabs__header) {
  position: sticky;
  top: 31px;
  z-index: 1;
}

.tokens-family {
  /* display: flex; */
  /* flex-direction: column; */
  /* gap: var(--spacing-200); */
  /* padding: var(--spacing-100); */
  /* padding-left: var(--spacing-100); */
}

.tokens-family :deep(h4):first-child {
  /* margin-top: var(--spacing-50); */
}
</style>
