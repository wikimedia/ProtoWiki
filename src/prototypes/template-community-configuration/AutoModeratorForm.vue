<script setup lang="ts">
/**
 * Automoderator's form, as the AutoModerator extension's schema and messages
 * (`AutoModeratorConfigSchema`, provider `AutoModerator`).
 */
import { computed } from 'vue'
import { CdxCheckbox, CdxChipInput, CdxField, CdxRadio, CdxTextInput } from '@wikimedia/codex'
import type { ChipInputItem } from '@wikimedia/codex'

import PageTitleLookup from './PageTitleLookup.vue'
import { wikiUrl } from './wikiUrl'

interface AutoModeratorConfig {
  AutoModeratorEnableRevisionCheck: boolean
  AutoModeratorEnableLogOnlyMode: boolean
  AutoModeratorCautionLevel: string
  AutoModeratorUseEditFlagMinor: boolean
  AutoModeratorEnableBotFlag: boolean
  AutoModeratorRevertTalkPageMessageEnabled: boolean
  AutoModeratorRevertTalkPageMessageRegisteredUsersOnly: boolean
  AutoModeratorHelpPageLink: string
  AutoModeratorEnableUserRevertsPerPage: boolean
  AutoModeratorUserRevertsPerPage: string
  AutoModeratorSkipUserRights: string[]
  AutoModeratorFalsePositivePageTitle: string
}

const config = defineModel<AutoModeratorConfig>({ required: true })

const CAUTION_LEVELS = [
  {
    value: 'very-cautious',
    label:
      'Most cautious (default): Fewest edits will be reverted, but the accuracy will be the highest.',
  },
  {
    value: 'cautious',
    label: 'Cautious: Relatively few edits will be reverted, but the accuracy will be medium.',
  },
  {
    value: 'somewhat-cautious',
    label:
      'Somewhat cautious: Relatively more edits will be reverted, but the accuracy will be low.',
  },
  {
    value: 'less-cautious',
    label:
      'Least caution: The most number of edits will be reverted, but the accuracy will be the lowest.',
  },
]

const skipUserRights = computed<ChipInputItem[]>({
  get: () => config.value.AutoModeratorSkipUserRights.map((value) => ({ value })),
  set: (chips) => {
    config.value.AutoModeratorSkipUserRights = chips.map((chip) => String(chip.value))
  },
})

const LOG_URL = wikiUrl('Special:Log', { type: 'automoderator' })
const TRANSLATEWIKI_URL =
  'https://translatewiki.net/w/i.php?title=Special%3ATranslate&group=ext-automoderator&language=en&action=translate&filter='
const MESSAGES_URL = wikiUrl('Special:AllMessages', {
  prefix: 'automoderator-wiki',
  filter: 'all',
  limit: '50',
})
</script>

<template>
  <CdxField is-fieldset>
    <template #label>Automoderator</template>
    <CdxCheckbox v-model="config.AutoModeratorEnableRevisionCheck">
      Automoderator is turned on
    </CdxCheckbox>
  </CdxField>

  <CdxField is-fieldset>
    <template #description>
      If log-only mode is enabled, Automoderator will not revert any edits, and instead will
      <a :href="LOG_URL" target="_blank">log the decisions</a> it would make.
    </template>
    <CdxCheckbox v-model="config.AutoModeratorEnableLogOnlyMode">Log-only mode</CdxCheckbox>
  </CdxField>

  <CdxField is-fieldset>
    <template #label>Configure threshold</template>
    <template #description>
      This extension leverages the new revert risk models that can calculate a score for every
      revision denoting the likelihood that the edit should be reverted. The models support only
      Wikipedia projects and trained on the main (article) namespace. Set a threshold, above which
      edits will be automatically reverted. Lower thresholds mean that more edits are reverted, but
      the accuracy will be lower, while higher thresholds result in fewer edits being reverted, but
      with better accuracy.
    </template>
    <CdxRadio
      v-for="level in CAUTION_LEVELS"
      :key="level.value"
      v-model="config.AutoModeratorCautionLevel"
      name="AutoModeratorCautionLevel"
      :input-value="level.value"
    >
      {{ level.label }}
    </CdxRadio>
    <template #help-text>
      <b>Edit Summary</b>
      <p>
        Automoderator’s edit summary can be translated at translatewiki, and overwritten locally.
      </p>
      <b>Actions</b>
      <ul>
        <li>
          Please add translations through
          <a :href="TRANSLATEWIKI_URL" target="_blank">translatewiki</a>.
        </li>
        <li>
          For a custom talk page message override the text in
          <a :href="MESSAGES_URL" target="_blank">system messages</a>.
        </li>
      </ul>
    </template>
  </CdxField>

  <CdxField is-fieldset>
    <template #label>Minor edits</template>
    <CdxCheckbox v-model="config.AutoModeratorUseEditFlagMinor">
      Reverts by AutoModerator will be considered minor edits.
    </CdxCheckbox>
    <template #help-text>
      <a href="https://www.mediawiki.org/wiki/Help:Minor_edit" target="_blank">Help:Minor edit</a>
    </template>
  </CdxField>

  <CdxField is-fieldset>
    <template #label>Bot edit</template>
    <CdxCheckbox v-model="config.AutoModeratorEnableBotFlag">
      Reverts by Automoderator will be considered bot edits.
    </CdxCheckbox>
    <template #help-text>
      <a href="https://www.mediawiki.org/wiki/Manual:Bots#The_%22bot%22_flag" target="_blank">
        Manual:Bots
      </a>
    </template>
  </CdxField>

  <CdxField is-fieldset>
    <template #label>Talk page message</template>
    <template #description>
      After Automoderator reverts an edit, a talk page message can be automatically sent to the
      editor, explaining what happened and providing helpful links.
    </template>
    <CdxCheckbox v-model="config.AutoModeratorRevertTalkPageMessageEnabled">
      Talk page message is turned on
    </CdxCheckbox>
    <template #help-text>
      <b>Actions</b>
      <ul>
        <li>
          Please add translations through
          <a :href="TRANSLATEWIKI_URL" target="_blank">translatewiki</a>.
        </li>
        <li>
          For a custom talk page message override the text in
          <a :href="MESSAGES_URL" target="_blank">system messages</a>.
        </li>
      </ul>
    </template>
  </CdxField>

  <CdxField is-fieldset>
    <CdxCheckbox v-model="config.AutoModeratorRevertTalkPageMessageRegisteredUsersOnly">
      Send talk page messages to registered users only
    </CdxCheckbox>
  </CdxField>

  <CdxField>
    <template #label>Link to a page to help with editing</template>
    <template #description>
      The talk page message for unregistered contributors will display a link to a page to help them
      with editing. This link can be configured to be any link in the wiki.
    </template>
    <PageTitleLookup v-model="config.AutoModeratorHelpPageLink" />
  </CdxField>

  <CdxField is-fieldset>
    <template #label>Enable user reverts per page</template>
    <CdxCheckbox v-model="config.AutoModeratorEnableUserRevertsPerPage">
      Enables the feature to specify how many times Automoderator can revert the same user on a
      given page within a 24 hour period.
    </CdxCheckbox>
  </CdxField>

  <CdxField>
    <template #label>User reverts per page</template>
    <template #description>
      Specify how many times Automoderator can revert the same user on a given page within a 24 hour
      period. If user revert per page restrictions are enabled and this is not set Automoderator
      will revert the same user an unlimited amount of times.
    </template>
    <CdxTextInput v-model="config.AutoModeratorUserRevertsPerPage" />
  </CdxField>

  <CdxField>
    <template #label>User rights</template>
    <template #description>
      Specify user rights whose holders Automoderator should never revert.
    </template>
    <CdxChipInput v-model:input-chips="skipUserRights" />
  </CdxField>

  <CdxField>
    <template #label>False Positive Report Page</template>
    <PageTitleLookup v-model="config.AutoModeratorFalsePositivePageTitle" />
  </CdxField>
</template>
