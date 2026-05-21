<script setup lang="ts">
import { useSlots } from 'vue'

const slots = useSlots()
</script>

<template>
  <main class="personal-dashboard-clone">
    <div v-if="slots.banner" class="dashboard-mobile-banner">
      <slot name="banner" />
    </div>

    <div v-if="slots.mobile" class="dashboard-mobile-cards">
      <slot name="mobile" />
    </div>

    <div class="dashboard-main">
      <div class="personal-dashboard-clone__primary dashboard-slot dashboard-slot--desktop-primary">
        <slot name="primary" />
      </div>
      <aside class="dashboard-sidebar">
        <slot name="sidebar" />
      </aside>
    </div>
  </main>
</template>

<style scoped>
.personal-dashboard-clone__primary {
  min-width: 0;
  box-sizing: border-box;
}
</style>

<style>
/* Shell: grid, banner, desktop primary/sidebar regions */
.personal-dashboard-clone {
  width: 100%;
  margin: 0 auto;
  font-size: var(--font-size-small);
}

.dashboard-mobile-banner {
  display: none;
}

.dashboard-mobile-cards {
  display: none;
}

/* Two columns on desktop skin; stack below 862px (narrow desktop / tablet). */
.dashboard-main {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 34%);
  gap: var(--spacing-200, 2rem);
  align-items: start;
  padding-bottom: var(--spacing-100, 1rem);
}

@media (max-width: 862px) {
  .dashboard-main {
    grid-template-columns: minmax(0, 1fr);
  }
}

/* Mobile layout — follow ancestor data-skin (viewport ≥640px + SpecialPageWrapper padding can be <640px wide). */
[data-skin='mobile'] .personal-dashboard-clone {
  font-size: var(--font-size-medium);
}

[data-skin='mobile'] .personal-dashboard-clone .dashboard-mobile-banner {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-top: -1rem;
  margin-bottom: 1rem;
}

[data-skin='mobile'] .personal-dashboard-clone .dashboard-mobile-banner__feedback {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  color: var(--color-progressive, #3366cc);
  text-decoration: none;
  font-size: inherit;
}

[data-skin='mobile'] .personal-dashboard-clone .dashboard-mobile-banner__feedback:hover {
  text-decoration: underline;
}

[data-skin='mobile'] .personal-dashboard-clone .dashboard-main {
  display: none;
}

[data-skin='mobile'] .personal-dashboard-clone .dashboard-mobile-cards {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-125, 1.25rem);
}

.dashboard-sidebar {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-125, 1.25rem);
}

.dashboard-slot {
  min-height: 4rem;
  box-sizing: border-box;
}

/* Static modules use `.sidebar-card__title` (18px); tappable rows use `.mobile-card__title` (16px) — unify in the mobile stack only. */
.dashboard-mobile-cards .sidebar-card__title {
  font-size: 16px;
}
</style>
