<script setup lang="ts">
import WikitaLiteInterestsPicker from '../wikita-lite/components/WikitaLiteInterestsPicker.vue'

definePage({
  meta: {
    title: 'Wikita-lite — Select interests for Suggested edits',
    description: 'Choose article topics for the Suggested edits module.',
  },
})
</script>

<template>
  <WikitaLiteInterestsPicker module-id="suggestedEdits" />
</template>
