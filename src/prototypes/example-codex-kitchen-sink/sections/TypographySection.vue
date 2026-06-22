<script setup lang="ts">
import tokensCss from '../../../../.agents/skills/codex-tokens/assets/tokens.css?raw'
import {
  getTypographyTokensForSubTab,
  parseTokensFromCss,
  typographySubTabs,
} from '../lib/parse-tokens'
import type { TypographySubTab } from '../lib/parse-tokens'
import PlaygroundSection from '../playground/PlaygroundSection.vue'
import PlaygroundGrid from '../playground/PlaygroundGrid.vue'
import PlaygroundSubTabs from '../playground/PlaygroundSubTabs.vue'
import TokenSwatch from '../playground/TokenSwatch.vue'

const allTokens = parseTokensFromCss(tokensCss)
</script>

<template>
  <PlaygroundSubTabs :items="typographySubTabs" default-active="style" ariaLabel="Typography">
    <template #default="{ id }">
      <PlaygroundSection v-if="id === 'style'">
        <h1>Heading 1</h1>
        <h2>Heading 2</h2>
        <h3>Heading 3</h3>
        <h4>Heading 4</h4>
        <p>Body</p>
        <p><small>Small</small></p>
        <p><cite>Cite</cite></p>
        <p><figcaption>Figure caption</figcaption></p>
        <p><code>Code</code></p>
        <blockquote>Block quote</blockquote>
        <pre>Pre</pre>
      </PlaygroundSection>

      <PlaygroundSection v-else>
        <PlaygroundGrid min="140px" dense>
          <TokenSwatch
            v-for="token in getTypographyTokensForSubTab(
              allTokens,
              id as Exclude<TypographySubTab, 'style'>,
            )"
            :key="token.name"
            :token="token"
          />
        </PlaygroundGrid>
      </PlaygroundSection>
    </template>
  </PlaygroundSubTabs>
</template>
