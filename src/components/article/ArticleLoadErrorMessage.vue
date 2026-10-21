<script setup lang="ts">
import { computed } from 'vue'
import { CdxMessage } from '@wikimedia/codex'

import { formatArticleLoadError } from './shared/formatArticleLoadError'

const props = defineProps<{
  error: string
}>()

const formattedError = computed(() => formatArticleLoadError(props.error))
</script>

<template>
  <CdxMessage type="error" class="article-load-error" :allow-user-dismiss="false">
    Couldn't load this article: {{ formattedError }}
  </CdxMessage>
</template>

<style scoped>
.article-load-error {
  margin-block-start: var(--spacing-100, 16px);
}
</style>
