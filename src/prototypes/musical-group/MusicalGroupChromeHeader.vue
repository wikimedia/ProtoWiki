<script setup lang="ts">
import { CdxIcon } from '@wikimedia/codex'
import {
  cdxIconBellOutline,
  cdxIconMenu,
  cdxIconSearch,
  cdxIconUserAvatar,
} from '@wikimedia/codex-icons'
</script>

<template>
  <header class="musical-group-chrome-header" aria-label="Site">
    <div class="musical-group-chrome-header__start">
      <button type="button" class="musical-group-chrome-header__icon-btn" aria-label="Menu">
        <CdxIcon :icon="cdxIconMenu" />
      </button>
      <span class="musical-group-chrome-header__wordmark" aria-hidden="true">
        <svg
          class="musical-group-chrome-header__wordmark-svg"
          xmlns="http://www.w3.org/2000/svg"
          width="28"
          height="18"
          viewBox="0 0 28 18"
          fill="none"
        >
          <path
            d="M18.1649 0C18.2315 9.18447e-05 18.2972 0.00018902 18.3617 0.000290295L18.7333 0.000937308C18.7924 0.00105006 18.8499 0.00116446 18.9056 0.00127927L19.2173 0.00196318C19.2652 0.00207471 19.3109 0.00218418 19.3542 0.00229038L19.6743 0.00312436C19.7015 0.0031998 19.7257 0.00326828 19.7467 0.00332855L19.844 0.00361638L19.901 0.0556164V0.551616C19.901 0.688616 19.824 0.756616 19.672 0.756616C18.926 0.791616 18.773 0.865616 18.5 1.25862C18.351 1.47262 18.057 1.93362 17.752 2.45162L15.134 7.34762C15.134 7.34762 15.1086 7.4007 15.0614 7.49911L18.26 14.0486L18.454 14.1016L23.494 2.14062C23.669 1.65862 23.642 1.31662 23.417 1.11562C23.191 0.920616 23.032 0.803616 22.448 0.779616L21.975 0.756616C21.917 0.756616 21.862 0.735616 21.809 0.695616C21.757 0.658616 21.73 0.609616 21.73 0.550616V0.0526164L21.802 0.00161638H27.496L27.554 0.0526164V0.550616C27.554 0.685616 27.477 0.753616 27.325 0.753616C26.579 0.786616 26.026 0.948616 25.668 1.23762C25.309 1.52862 25.029 1.92862 24.828 2.45062C24.828 2.45062 23.0869 6.43552 21.3737 10.3326L21.1037 10.9467C20.1164 13.191 19.1698 15.3341 18.607 16.5856C18 17.7416 17.403 17.6356 16.878 16.5526C16.448 15.667 15.7151 14.083 14.979 12.4753L14.7468 11.9676C14.4362 11.288 14.1307 10.6169 13.8529 10.0055C13.611 10.504 13.349 11.0429 13.0799 11.5938L12.8373 12.0899C11.9839 13.8322 11.0989 15.611 10.584 16.5656C9.876 17.7966 9.293 17.6356 8.829 16.5976C7.218 12.7966 3.91 6.12262 2.353 2.38262C2.065 1.69362 1.848 1.25162 1.643 1.07662C1.437 0.903616 1.009 0.799616 0.358 0.764616C0.119 0.738616 0 0.680616 0 0.586616V0.0656164L0.058 0.0146164C0.0891765 0.0144399 0.123874 0.0142738 0.161858 0.0141177L0.427329 0.0132961C0.477523 0.0131778 0.530536 0.0130685 0.586134 0.0129677L1.14997 0.0122794C1.21897 0.0122258 1.28985 0.0121794 1.36238 0.0121397L3.04746 0.0121365C3.13159 0.0121684 3.21573 0.0122038 3.29965 0.0122423L4.73538 0.0131655C4.80818 0.0132242 4.87935 0.0132831 4.94866 0.0133419L5.81929 0.0141548C5.86411 0.0142005 5.90591 0.0142439 5.94443 0.0142844L6.248 0.0146164L6.306 0.0656164V0.561616C6.306 0.698616 6.219 0.764616 6.048 0.764616L5.402 0.791616C4.848 0.814616 4.571 0.980616 4.571 1.28762C4.571 1.43062 4.629 1.66362 4.758 1.97562C5.998 4.99762 10.281 14.0286 10.281 14.0286L10.438 14.0696L13.1988 8.56301C12.8613 7.81723 12.646 7.33962 12.646 7.33962L10.748 3.60962C10.748 3.60962 10.5849 3.27806 10.4391 2.98354L10.2919 2.68727C10.2785 2.66041 10.2664 2.63628 10.256 2.61562C9.422 0.963616 9.44 0.875616 8.597 0.763616C8.361 0.732616 8.239 0.702616 8.239 0.585616V0.0626164L8.31 0.0116164L8.63792 0.0112425C8.69621 0.0111844 8.75617 0.0111284 8.81763 0.0110744L10.2604 0.010209C10.3331 0.0101793 10.406 0.0101512 10.4789 0.0101245L13.222 0.00961638L13.352 0.0526164V0.573616C13.352 0.692616 13.267 0.753616 13.094 0.753616L12.738 0.804616C11.838 0.874616 11.985 1.24262 12.583 2.43362L14.404 6.15817L16.418 2.14162C16.7309 1.45912 16.6938 1.25171 16.5756 1.08946L16.547 1.05262C16.467 0.957616 16.199 0.803616 15.616 0.780616L15.387 0.755616C15.329 0.755616 15.275 0.735616 15.222 0.696616C15.17 0.659616 15.144 0.611616 15.144 0.550616V0.0546164L15.215 0.00361638C15.4609 0.00189225 15.7595 0.000762639 16.0855 7.38038e-05L18.1649 0Z"
            fill="currentColor"
          />
        </svg>
      </span>
    </div>

    <div class="musical-group-chrome-header__actions">
      <button type="button" class="musical-group-chrome-header__icon-btn" aria-label="Search">
        <CdxIcon :icon="cdxIconSearch" />
      </button>
      <button type="button" class="musical-group-chrome-header__icon-btn" aria-label="Notifications">
        <CdxIcon :icon="cdxIconBellOutline" />
      </button>
      <button type="button" class="musical-group-chrome-header__icon-btn" aria-label="User menu">
        <CdxIcon :icon="cdxIconUserAvatar" />
      </button>
    </div>
  </header>
</template>

<style scoped>
.musical-group-chrome-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px var(--spacing-50);
  border-bottom: 2px solid var(--border-color-interactive);
  background-color: var(--background-color-inverted);
  color: var(--color-inverted);
}

.musical-group-chrome-header__start {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: var(--spacing-50);
}

.musical-group-chrome-header__wordmark {
  display: flex;
  align-items: center;
  color: var(--color-inverted);
}

.musical-group-chrome-header__wordmark-svg {
  display: block;
  width: 27.554px;
  height: 17.433px;
}

.musical-group-chrome-header__actions {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 12px;
}

.musical-group-chrome-header__icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--color-inverted);
  cursor: pointer;
}

.musical-group-chrome-header__icon-btn :deep(.cdx-icon) {
  color: var(--color-inverted);
}

.musical-group-chrome-header__icon-btn :deep(.cdx-icon svg),
.musical-group-chrome-header__icon-btn :deep(.cdx-icon svg path) {
  fill: currentColor;
}
</style>
