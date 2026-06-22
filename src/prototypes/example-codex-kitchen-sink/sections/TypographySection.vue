<script setup lang="ts">
import tokensCss from '../../../../.agents/skills/codex-tokens/assets/tokens.css?raw'
import { getTokensForFamily, parseTokensFromCss } from '../lib/parse-tokens'
import PlaygroundSection from '../playground/PlaygroundSection.vue'
import PlaygroundGrid from '../playground/PlaygroundGrid.vue'
import TokenSwatch from '../playground/TokenSwatch.vue'
import PlaygroundTab from '../playground/PlaygroundTab.vue'

const typographyTokens = getTokensForFamily(parseTokensFromCss(tokensCss), 'Typography')
</script>

<template>
  <PlaygroundTab>
    <PlaygroundSection>
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

    <PlaygroundSection title="Tokens">
      <PlaygroundGrid min="140px" dense>
        <TokenSwatch v-for="token in typographyTokens" :key="token.name" :token="token" />
      </PlaygroundGrid>
    </PlaygroundSection>
  </PlaygroundTab>
</template>

<style scoped>
#styles {
  /* padding-left: var(--spacing-100); */
}
</style>
