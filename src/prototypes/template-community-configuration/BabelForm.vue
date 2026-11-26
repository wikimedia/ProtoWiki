<script setup lang="ts">
/**
 * Babel's form, as the Babel extension's schema and messages (`BabelSchema`,
 * provider `Babel`).
 */
import { CdxCheckbox, CdxField, CdxTextInput } from '@wikimedia/codex'

interface BabelConfig {
  BabelCategoryNames: Record<string, string>
  BabelMainCategory: string
  BabelUseUserLanguage: boolean
  BabelAutoCreate: boolean
}

const config = defineModel<BabelConfig>({ required: true })

const LEVELS = ['0', '1', '2', '3', '4', '5', 'N']
</script>

<template>
  <CdxField is-fieldset>
    <template #label>Category names per language level</template>
    <template #description>
      Possible variable elements are: <code>%code%</code> (language code),
      <code>%wikiname%</code> (the name of the language in the wiki's content language), and
      <code>%nativename%</code> (the name of the language in its language). Leave blank to disable.
    </template>
    <div class="babel-form__levels">
      <CdxField v-for="level in LEVELS" :key="level">
        <template #label>Level {{ level }}</template>
        <CdxTextInput v-model="config.BabelCategoryNames[level]" />
      </CdxField>
    </div>
  </CdxField>

  <CdxField>
    <template #label>Main category</template>
    <template #description>
      Name of the main (non-level) category for each language to which all users of that language
      are added.
    </template>
    <CdxTextInput v-model="config.BabelMainCategory" />
    <template #help-text>
      Accepts the same format as "Category names per language level" above.
    </template>
  </CdxField>

  <CdxField is-fieldset>
    <CdxCheckbox v-model="config.BabelUseUserLanguage">Use user language</CdxCheckbox>
    <template #help-text>
      Whether to use the user interface language for the header and footer message. If false
      (default), it will be in the page content language. This is because using the user interface
      language may fragment the parser cache.
    </template>
  </CdxField>

  <CdxField is-fieldset>
    <CdxCheckbox v-model="config.BabelAutoCreate">
      Automatically create Babel categories
    </CdxCheckbox>
  </CdxField>
</template>

<style scoped>
.babel-form__levels {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-75);
}
</style>
