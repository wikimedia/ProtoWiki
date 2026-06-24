<script setup lang="ts">
import type { MusicalGroupData } from './data/types'

interface Props {
  data: MusicalGroupData
}

defineProps<Props>()
</script>

<template>
  <p v-if="data.description" class="musical-group-header__description">
    {{ data.description }}
  </p>
</template>

<style scoped>
.musical-group-header__description {
  margin: 0;
  color: var(--color-emphasized);
}
</style>
