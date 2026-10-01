<script setup lang="ts">
import { ref } from 'vue'
import { CdxIcon, CdxTab, CdxTabs } from '@wikimedia/codex'
import { cdxIconLinkExternal } from '@wikimedia/codex-icons'

import { navigationSubTabs } from '../lib/component-tabs'
import PlaygroundSection from '../playground/PlaygroundSection.vue'
import PlaygroundGrid from '../playground/PlaygroundGrid.vue'
import PlaygroundCell from '../playground/PlaygroundCell.vue'
import PlaygroundSubTabs from '../playground/PlaygroundSubTabs.vue'

const activeTab = ref('article')
const activeTabFramed = ref('article')
</script>

<template>
  <PlaygroundSubTabs
    main-tab-id="components-navigation"
    :items="navigationSubTabs"
    default-active="link"
    ariaLabel="Navigation"
  >
    <template #default="{ id }">
      <PlaygroundSection v-if="id === 'link'">
        <PlaygroundGrid min="280px">
          <PlaygroundCell label="base">
            <p>
              The cat (Felis catus) is a
              <a class="playground-link" href="https://en.wikipedia.org/wiki/Species">domestic species</a>
              of small
              <a class="playground-link" href="https://en.wikipedia.org/wiki/Carnivore">carnivorous mammal</a>.
            </p>
          </PlaygroundCell>
          <PlaygroundCell label="underlined">
            <p>
              As a
              <a class="playground-link is-underlined" href="https://en.wikipedia.org/wiki/Predation">predator</a>,
              it is
              <a class="playground-link is-underlined" href="https://en.wikipedia.org/wiki/Crepuscular_animal">crepuscular</a>.
            </p>
          </PlaygroundCell>
          <PlaygroundCell label="external">
            <p>
              According to
              <a class="playground-link is-underlined" href="https://example.com">
                "Living with a Cat"
                <CdxIcon :icon="cdxIconLinkExternal" />
              </a>,
              cats are ready to go to new homes at about 12 weeks of age.
            </p>
          </PlaygroundCell>
          <PlaygroundCell label="red link">
            <p>
              Websites for cat lovers include
              <a class="playground-link is-red-link" href="#">The Catnip Times</a>
              and
              <a class="playground-link is-red-link" href="#">Vanggy</a>.
            </p>
          </PlaygroundCell>
        </PlaygroundGrid>
      </PlaygroundSection>

      <PlaygroundSection v-else-if="id === 'tabs'">
        <PlaygroundGrid min="280px">
          <PlaygroundCell label="default">
            <CdxTabs v-model:active="activeTab">
              <CdxTab name="article" label="Article">
                <p>Article</p>
              </CdxTab>
              <CdxTab name="talk" label="Talk">
                <p>Talk</p>
              </CdxTab>
              <CdxTab name="history" label="History" disabled>
                <p>History</p>
              </CdxTab>
            </CdxTabs>
          </PlaygroundCell>
          <PlaygroundCell label="framed">
            <CdxTabs v-model:active="activeTabFramed" framed>
              <CdxTab name="article" label="Article">
                <p>Article</p>
              </CdxTab>
              <CdxTab name="talk" label="Talk">
                <p>Talk</p>
              </CdxTab>
            </CdxTabs>
          </PlaygroundCell>
        </PlaygroundGrid>
      </PlaygroundSection>
    </template>
  </PlaygroundSubTabs>
</template>

<style scoped>
.playground-link {
  color: var(--color-link);
  text-decoration: none;
}

.playground-link:hover {
  color: var(--color-link--hover);
  text-decoration: underline;
}

.playground-link:visited {
  color: var(--color-link--visited);
}

.playground-link:visited:hover {
  color: var(--color-link--visited--hover);
}

.playground-link.is-underlined {
  text-decoration: underline;
}

.playground-link.is-red-link {
  color: var(--color-link-red);
}

.playground-link.is-red-link:hover {
  color: var(--color-link-red--hover);
}

.playground-link.is-red-link:visited {
  color: var(--color-link-red--visited);
}

.playground-link.is-red-link:visited:hover {
  color: var(--color-link-red--visited--hover);
}

.playground-link :deep(.cdx-icon) {
  color: inherit;
}
</style>
