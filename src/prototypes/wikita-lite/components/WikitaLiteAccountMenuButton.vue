<script setup lang="ts">
import { CdxButton, CdxIcon } from '@wikimedia/codex'
import { cdxIconUserAvatarOutline } from '@wikimedia/codex-icons'

import AccountMenuPopover from '@/components/settings/AccountMenuPopover.vue'
import { t } from '@/i18n'

import { useWikitaLiteCreateAccount } from '../composables/useWikitaLiteCreateAccountOpener'

// Same entry point the desktop chrome's "Create account" link uses.
const { openCreateAccount } = useWikitaLiteCreateAccount()

function onCreateAccount(): void {
  void openCreateAccount()
}
</script>

<template>
  <AccountMenuPopover class="wikita-lite-account-menu" @create-account="onCreateAccount">
    <template #default="{ toggle, open }">
      <span class="wikita-lite-account-menu__trigger">
        <CdxButton
          weight="quiet"
          size="large"
          :aria-label="t('components.userMenu')"
          :aria-expanded="open"
          @click="toggle"
        >
          <CdxIcon :icon="cdxIconUserAvatarOutline" size="medium" />
        </CdxButton>
      </span>
    </template>
  </AccountMenuPopover>
</template>

<style scoped>
.wikita-lite-account-menu {
  width: var(--size-icon-large, 40px);
}

.wikita-lite-account-menu__trigger {
  display: inline-flex;
  width: 100%;
  justify-content: center;
}

.wikita-lite-account-menu__trigger :deep(.cdx-button) {
  box-sizing: border-box;
  flex-shrink: 0;
  width: var(--size-icon-large, 40px);
  min-width: var(--size-icon-large, 40px);
  max-width: var(--size-icon-large, 40px);
  height: var(--size-icon-large, 40px);
  min-height: var(--size-icon-large, 40px);
  padding: 0;
  color: var(--color-subtle, #54595d);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
</style>
