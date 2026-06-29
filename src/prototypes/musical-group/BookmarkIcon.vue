<script setup lang="ts">
interface Props {
  filled?: boolean
}

withDefaults(defineProps<Props>(), {
  filled: false,
})
</script>

<template>
  <svg
    class="bookmark-icon"
    xmlns="http://www.w3.org/2000/svg"
    width="15"
    height="20"
    viewBox="0 0 15 20"
    fill="none"
    aria-hidden="true"
  >
    <path
      v-if="filled"
      fill-rule="evenodd"
      clip-rule="evenodd"
      d="M15 19.2056L13.1669 20L7.5 13.9618L1.83315 20L0 19.2056V0H15V19.2056Z"
      fill="currentColor"
    />
    <path
      v-else
      fill-rule="evenodd"
      clip-rule="evenodd"
      d="M15 19.2056L13.1669 20L7.5 13.9618L1.83315 20L0 19.2056V0H15V19.2056ZM1.83315 16.9462L7.5 11.2974L13.1669 17.511V2.01508H1.83315V16.9462Z"
      fill="currentColor"
    />
  </svg>
</template>

<style scoped>
.bookmark-icon {
  display: block;
  flex-shrink: 0;
}
</style>
