<script setup lang="ts">
import { computed } from 'vue'
import type { TokenEntry } from '../lib/parse-tokens'

const props = defineProps<{
  token: TokenEntry
}>()

const cssVar = computed(() => `var(${props.token.name})`)
</script>

<template>
  <div class="token-swatch">
    <div class="token-swatch__preview" :data-kind="token.kind">
      <div
        v-if="token.kind === 'color-text'"
        class="token-swatch__fill"
        :style="{ backgroundColor: cssVar }"
      />
      <div
        v-else-if="token.kind === 'color-bg'"
        class="token-swatch__fill"
        :style="{ backgroundColor: cssVar }"
      />
      <div
        v-else-if="token.kind === 'color-border'"
        class="token-swatch__border-box"
        :style="{ borderColor: cssVar }"
      />
      <div
        v-else-if="token.kind === 'spacing' || token.kind === 'size'"
        class="token-swatch__bar-track"
      >
        <div class="token-swatch__bar" :style="{ width: cssVar }" />
      </div>
      <div
        v-else-if="token.kind === 'radius'"
        class="token-swatch__radius-box"
        :style="{ borderRadius: cssVar }"
      />
      <div
        v-else-if="token.kind === 'font-size'"
        class="token-swatch__type-sample"
        :style="{ fontSize: cssVar }"
      >
        Aa
      </div>
      <div
        v-else-if="token.kind === 'font-weight'"
        class="token-swatch__type-sample"
        :style="{ fontWeight: cssVar }"
      >
        Sample
      </div>
      <div
        v-else-if="token.kind === 'font-family'"
        class="token-swatch__type-sample token-swatch__type-sample--clamp"
        :style="{ fontFamily: cssVar }"
      >
        Aa
      </div>
      <div
        v-else-if="token.kind === 'line-height'"
        class="token-swatch__line-height"
        :style="{ lineHeight: cssVar }"
      >
        Line one<br />Line two
      </div>
      <div
        v-else-if="token.kind === 'shadow'"
        class="token-swatch__shadow-box"
        :style="{ boxShadow: cssVar }"
      />
      <div v-else-if="token.kind === 'opacity'" class="token-swatch__opacity">
        <div class="token-swatch__opacity-base" />
        <div class="token-swatch__opacity-overlay" :style="{ opacity: cssVar }" />
      </div>
      <div v-else class="token-swatch__generic">
        {{ token.value }}
      </div>
    </div>
    <code class="token-swatch__name">{{ token.name }}</code>
  </div>
</template>

<style scoped>
.token-swatch {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-35);
  min-width: 0;
}

.token-swatch__preview {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 3rem;
  padding: var(--spacing-50);
  border: var(--border-subtle);
  border-radius: var(--border-radius-base);
  background: var(--background-color-neutral-subtle);
}

.token-swatch__fill {
  width: 100%;
  height: 2.5rem;
  border-radius: var(--border-radius-base);
  border: 1px solid var(--border-color-subtle);
}

.token-swatch__border-box {
  width: 100%;
  height: 2.5rem;
  border: 3px solid transparent;
  border-radius: var(--border-radius-base);
  background: var(--background-color-base);
}

.token-swatch__bar-track {
  width: 100%;
  height: 0.5rem;
  background: var(--background-color-neutral);
  border-radius: var(--border-radius-base);
}

.token-swatch__bar {
  height: 100%;
  max-width: 100%;
  background: var(--color-progressive);
  border-radius: var(--border-radius-base);
}

.token-swatch__radius-box {
  width: 3rem;
  height: 3rem;
  background: var(--color-progressive);
}

.token-swatch__type-sample {
  font-family: var(--font-family-base);
  color: var(--color-base);
}

.token-swatch__type-sample--clamp {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}

.token-swatch__line-height {
  width: 100%;
  font-size: var(--font-size-small);
  color: var(--color-base);
}

.token-swatch__shadow-box {
  width: 3rem;
  height: 3rem;
  background: var(--background-color-base);
  border-radius: var(--border-radius-base);
}

.token-swatch__opacity {
  position: relative;
  width: 100%;
  height: 2.5rem;
}

.token-swatch__opacity-base,
.token-swatch__opacity-overlay {
  position: absolute;
  inset: 0;
  border-radius: var(--border-radius-base);
}

.token-swatch__opacity-base {
  background: repeating-conic-gradient(var(--border-color-subtle) 0% 25%, transparent 0% 50%) 50% /
    12px 12px;
}

.token-swatch__opacity-overlay {
  background: var(--color-progressive);
}

.token-swatch__generic {
  width: 100%;
  font-family: var(--font-family-monospace);
  font-size: var(--font-size-small);
  line-height: var(--line-height-small);
  color: var(--color-base);
  word-break: break-all;
}

.token-swatch__name {
  font-family: var(--font-family-monospace);
  font-size: var(--font-size-small);
  line-height: var(--line-height-small);
  color: var(--color-subtle);
  word-break: break-all;
}
</style>
