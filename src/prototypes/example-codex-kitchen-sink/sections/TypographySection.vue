<script setup lang="ts">
import tokensCss from '../../../../.agents/skills/codex-tokens/assets/tokens.css?raw'
import {
  getTypographyTokensForSubTab,
  parseTokensFromCss,
  typographySubTabs,
} from '../lib/parse-tokens'
import FontFamilyList from '../playground/FontFamilyList.vue'
import FontSizeList from '../playground/FontSizeList.vue'
import FontWeightList from '../playground/FontWeightList.vue'
import LineHeightList from '../playground/LineHeightList.vue'
import PlaygroundSection from '../playground/PlaygroundSection.vue'
import PlaygroundSubTabs from '../playground/PlaygroundSubTabs.vue'
import TextDecorationList from '../playground/TextDecorationList.vue'
import TextOverflowList from '../playground/TextOverflowList.vue'

const allTokens = parseTokensFromCss(tokensCss)
</script>

<template>
  <PlaygroundSubTabs
    main-tab-id="typography"
    :items="typographySubTabs"
    default-active="style"
    ariaLabel="Typography"
  >
    <template #default="{ id }">
      <PlaygroundSection v-if="id === 'style'">
        <h1>Heading 1</h1>
        <h2>Heading 2</h2>
        <h3>Heading 3</h3>
        <h4>Heading 4</h4>
        <p>Body</p>
        <p><small>Small</small></p>
        <p><cite>Cite</cite></p>
        <figcaption>Figure caption</figcaption>
        <p><code>Code</code></p>
        <blockquote>Block quote</blockquote>
        <pre>Pre</pre>
      </PlaygroundSection>

      <PlaygroundSection v-else-if="id === 'font'">
        <FontFamilyList :tokens="getTypographyTokensForSubTab(allTokens, 'font')" />
      </PlaygroundSection>

      <PlaygroundSection v-else-if="id === 'size'">
        <FontSizeList :tokens="getTypographyTokensForSubTab(allTokens, 'size')" />
      </PlaygroundSection>

      <PlaygroundSection v-else-if="id === 'weight'">
        <FontWeightList :tokens="getTypographyTokensForSubTab(allTokens, 'weight')" />
      </PlaygroundSection>

      <PlaygroundSection v-else-if="id === 'line-height'">
        <LineHeightList :tokens="getTypographyTokensForSubTab(allTokens, 'line-height')" />
      </PlaygroundSection>

      <PlaygroundSection v-else-if="id === 'decoration'">
        <TextDecorationList :tokens="getTypographyTokensForSubTab(allTokens, 'decoration')" />
      </PlaygroundSection>

      <PlaygroundSection v-else-if="id === 'overflow'">
        <TextOverflowList :tokens="getTypographyTokensForSubTab(allTokens, 'overflow')" />
      </PlaygroundSection>
    </template>
  </PlaygroundSubTabs>
</template>
