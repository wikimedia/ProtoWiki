<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import { CdxToast } from '@wikimedia/codex'

import ArticleLive from '@/components/article/ArticleLive.vue'

import ExperimentationChrome from './ExperimentationChrome.vue'
import { EXPERIMENTATION_PREFERENCES } from './routes'

definePage({
  meta: {
    title: 'Experimentation preferences',
    description:
      'Prototyping a new preferences section to inform users and allow them to opt-out from experimentation.',
    category: 'prototype',
    platform: 'web',
  },
})

const showToast = ref(true)
</script>

<template>
  <ExperimentationChrome>
    <ArticleLive article="Main Page" :blank-titlebar="true" />
    <CdxToast
      v-if="showToast"
      standalone
      type="notice"
      :auto-dismiss="false"
      @user-dismissed="showToast = false"
    >
      Learn how your completely anonymous interaction data is helping improve the experience of
      Wikipedia users.
      <RouterLink class="experimentation-toast__link" :to="EXPERIMENTATION_PREFERENCES">Learn more</RouterLink>
    </CdxToast>
  </ExperimentationChrome>
</template>

<style scoped>
.experimentation-toast__link {
  color: var(--color-progressive);
  text-decoration: underline;
}
</style>
