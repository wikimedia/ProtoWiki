<script setup lang="ts">
import { CdxCard } from '@wikimedia/codex'
import { cdxIconBook, cdxIconPlay, cdxIconUserAvatar } from '@wikimedia/codex-icons'

import {
  LEARN_GUIDE,
  LEARN_MENTOR,
  LEARN_VIDEO,
  learnVideoMediaUrl,
} from '../data/learnContent'
import WikitaLiteCardPortrait from '../components/WikitaLiteCardPortrait.vue'
import WikitaLiteSupportingRow from '../components/WikitaLiteSupportingRow.vue'

interface Props {
  standalone?: boolean
}

withDefaults(defineProps<Props>(), {
  standalone: false,
})
</script>

<template>
  <div class="learn-module">
    <CdxCard class="learn-module__card">
      <template #title>
        {{ LEARN_MENTOR.title }}
      </template>
      <template #description>
        {{ LEARN_MENTOR.description }}
      </template>
      <template #supporting-text>
        <WikitaLiteSupportingRow :icon="cdxIconUserAvatar">
          {{ LEARN_MENTOR.supportingText }}
        </WikitaLiteSupportingRow>
      </template>
    </CdxCard>

    <CdxCard class="learn-module__card" :url="LEARN_GUIDE.href">
      <template #title>
        {{ LEARN_GUIDE.title }}
      </template>
      <template #description>
        {{ LEARN_GUIDE.description }}
      </template>
      <template #supporting-text>
        <WikitaLiteSupportingRow :icon="cdxIconBook">
          {{ LEARN_GUIDE.supportingText }}
        </WikitaLiteSupportingRow>
      </template>
    </CdxCard>

    <WikitaLiteCardPortrait
      class="learn-module__portrait"
      :url="LEARN_VIDEO.href"
      :media-url="learnVideoMediaUrl()"
      :media-alt="LEARN_VIDEO.mediaAlt"
      :title="LEARN_VIDEO.title"
      :description="LEARN_VIDEO.description"
      :supporting-text="LEARN_VIDEO.supportingText"
      :supporting-icon="cdxIconPlay"
      :show-play-overlay="false"
    />
  </div>
</template>

<style scoped>
.learn-module {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-50, 8px);
  width: 100%;
}

.learn-module__card {
  width: 100%;
}

.learn-module__portrait {
  width: 100%;
}
</style>
