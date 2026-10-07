<script setup lang="ts">
export type HardShadowTechnique =
  | 'dual-shadow'
  | 'nested'
  | 'nested-partial'
  | 'pseudo'
  | 'asymmetric'
  | 'drop-shadow'
  | 'gradient'
  | 'svg'

const props = withDefaults(
  defineProps<{
    technique: HardShadowTechnique
    /** Show inverted active state on Article (dual-shadow section only). */
    showActive?: boolean
  }>(),
  {
    showActive: false,
  },
)

const activeTab = props.showActive ? 'article' : null
</script>

<template>
  <div
    class="tab-track"
    :class="[`tab-track--${technique}`]"
    role="presentation"
  >
    <!-- 1. Dual box-shadow -->
    <template v-if="technique === 'dual-shadow'">
      <button
        type="button"
        class="tab tab--dual-shadow"
        :class="{ 'tab--active': activeTab === 'article' }"
      >
        Article
      </button>
      <button type="button" class="tab tab--dual-shadow">
        Photos
        <span class="tab__dot" aria-hidden="true" />
      </button>
    </template>

    <!-- 2a. Nested DOM + outer box-shadow (Figma-faithful) -->
    <template v-else-if="technique === 'nested'">
      <span class="tab-shell tab-shell--shadow">
        <button type="button" class="tab tab--inner">Article</button>
      </span>
      <span class="tab-shell tab-shell--shadow">
        <button type="button" class="tab tab--inner">
          Photos
          <span class="tab__dot" aria-hidden="true" />
        </button>
      </span>
    </template>

    <!-- 2b. Nested DOM + partial outer border (broken) -->
    <template v-else-if="technique === 'nested-partial'">
      <span class="tab-shell tab-shell--partial">
        <button type="button" class="tab tab--inner">Article</button>
      </span>
      <span class="tab-shell tab-shell--partial">
        <button type="button" class="tab tab--inner">
          Photos
          <span class="tab__dot" aria-hidden="true" />
        </button>
      </span>
    </template>

    <!-- 3. Pseudo-element -->
    <template v-else-if="technique === 'pseudo'">
      <button type="button" class="tab tab--pseudo">Article</button>
      <button type="button" class="tab tab--pseudo">
        Photos
        <span class="tab__dot" aria-hidden="true" />
      </button>
    </template>

    <!-- 4. Asymmetric border-width -->
    <template v-else-if="technique === 'asymmetric'">
      <button type="button" class="tab tab--asymmetric">Article</button>
      <button type="button" class="tab tab--asymmetric">
        Photos
        <span class="tab__dot" aria-hidden="true" />
      </button>
    </template>

    <!-- 5. filter: drop-shadow -->
    <template v-else-if="technique === 'drop-shadow'">
      <button type="button" class="tab tab--drop-shadow">Article</button>
      <button type="button" class="tab tab--drop-shadow">
        Photos
        <span class="tab__dot" aria-hidden="true" />
      </button>
    </template>

    <!-- 6. Gradient backgrounds -->
    <template v-else-if="technique === 'gradient'">
      <button type="button" class="tab tab--gradient">Article</button>
      <button type="button" class="tab tab--gradient">
        Photos
        <span class="tab__dot" aria-hidden="true" />
      </button>
    </template>

    <!-- 7. SVG background-image -->
    <template v-else-if="technique === 'svg'">
      <button type="button" class="tab tab--svg">Article</button>
      <button type="button" class="tab tab--svg">
        Photos
        <span class="tab__dot" aria-hidden="true" />
      </button>
    </template>
  </div>
</template>

<style scoped>
.tab-track {
  display: flex;
  align-items: flex-end;
  gap: var(--tab-lab-gap);
}

.tab {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  box-sizing: border-box;
  height: var(--tab-lab-height);
  padding: var(--tab-lab-padding);
  border-radius: var(--tab-lab-radius);
  background-color: var(--background-color-base);
  color: var(--color-base);
  font-family: var(--font-family-base);
  font-size: var(--font-size-medium);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-medium);
  white-space: nowrap;
  cursor: pointer;
}

.tab__dot {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: var(--color-progressive);
}

/* 1. Dual box-shadow */
.tab--dual-shadow {
  border: none;
  box-shadow:
    var(--box-shadow-inset-small) var(--color-base),
    1px 1px 0 0 var(--color-base);
}

.tab--dual-shadow.tab--active {
  background-color: var(--background-color-inverted);
  color: var(--color-inverted);
  box-shadow:
    var(--box-shadow-inset-small) var(--color-base),
    1px 1px 0 0 var(--color-base);
}

/* 2. Nested shells */
.tab-shell {
  display: inline-flex;
  flex: 0 0 auto;
  border-radius: var(--tab-lab-radius);
}

.tab-shell--shadow {
  box-shadow: 1px 1px 0 0 var(--color-base);
}

.tab-shell--partial {
  border-bottom: 1px solid var(--color-base);
  border-right: 1px solid var(--color-base);
  border-radius: var(--tab-lab-radius);
}

.tab--inner {
  border: 1px solid var(--color-base);
  background-color: var(--background-color-base);
}

/* 3. Pseudo-element offset stroke */
.tab--pseudo {
  border: 1px solid var(--color-base);
}

.tab--pseudo::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  box-shadow: 1px 1px 0 0 var(--color-base);
  pointer-events: none;
}

/* 4. Asymmetric border-width (anti-pattern) */
.tab--asymmetric {
  border: 1px solid var(--color-base);
  border-bottom-width: 2px;
  border-right-width: 2px;
}

/* 5. filter: drop-shadow */
.tab--drop-shadow {
  border: 1px solid var(--color-base);
  filter: drop-shadow(1px 1px 0 var(--color-base));
}

/* 6. Gradient / multi-background border */
.tab--gradient {
  border: none;
  background-color: var(--background-color-base);
  background-image:
    linear-gradient(var(--color-base), var(--color-base)),
    linear-gradient(var(--color-base), var(--color-base)),
    linear-gradient(var(--color-base), var(--color-base)),
    linear-gradient(var(--color-base), var(--color-base));
  background-repeat: no-repeat;
  background-size:
    100% 1px,
    1px 100%,
    100% 2px,
    2px 100%;
  background-position:
    0 0,
    0 0,
    0 100%,
    100% 0;
}

/* 7. SVG stroke as background-image (uses currentColor for theme) */
.tab--svg {
  border: none;
  background-color: transparent;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 38' preserveAspectRatio='none'%3E%3Crect x='0.5' y='0.5' width='99' height='37' rx='6' fill='white' stroke='black' stroke-width='1'/%3E%3Cpath d='M 6 37.5 H 100 M 99.5 6 V 38' stroke='black' stroke-width='1' fill='none'/%3E%3C/svg%3E");
  background-size: 100% 100%;
  background-repeat: no-repeat;
}

[data-theme='dark'] .tab--svg {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 38' preserveAspectRatio='none'%3E%3Crect x='0.5' y='0.5' width='99' height='37' rx='6' fill='%23202122' stroke='%23eaecf0' stroke-width='1'/%3E%3Cpath d='M 6 37.5 H 100 M 99.5 6 V 38' stroke='%23eaecf0' stroke-width='1' fill='none'/%3E%3C/svg%3E");
}
</style>
