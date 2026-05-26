<script setup lang="ts">
const props = defineProps<{
  title: string
  href: string
  thumbnailSrc?: string
  shortDescription?: string
}>()
</script>

<template>
  <a
    class="topic-article-card"
    :href="props.href"
    target="_blank"
    rel="noopener noreferrer"
    :aria-label="`Open ${props.title} on Wikipedia`"
  >
    <div v-if="props.thumbnailSrc" class="topic-article-card__thumb">
      <img
        class="topic-article-card__thumb-image"
        :src="props.thumbnailSrc"
        alt=""
        width="70"
        height="70"
        loading="lazy"
      />
    </div>
    <div class="topic-article-card__content">
      <h4 class="topic-article-card__title">{{ props.title }}</h4>
      <p v-if="props.shortDescription" class="topic-article-card__description">
        {{ props.shortDescription }}
      </p>
    </div>
  </a>
</template>

<style scoped>
.topic-article-card {
  display: flex;
  gap: var(--spacing-75, 12px);
  padding: var(--spacing-75, 12px);
  border: var(--border-width-base, 1px) solid var(--border-color-subtle, #c8ccd1);
  border-radius: var(--border-radius-base, 2px);
  background-color: var(--background-color-base, #fff);
  color: inherit;
  text-decoration: none;
}

.topic-article-card:hover {
  background-color: var(--background-color-interactive-subtle, #f8f9fa);
}

.topic-article-card__thumb {
  flex-shrink: 0;
  width: 70px;
  height: 70px;
  overflow: hidden;
  border-radius: var(--border-radius-base, 2px);
  background-color: var(--background-color-neutral-subtle, #eaecf0);
}

.topic-article-card__thumb-image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.topic-article-card__content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-25, 4px);
  min-width: 0;
}

.topic-article-card__title,
.topic-article-card__description {
  margin: 0;
}

</style>
