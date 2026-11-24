# Community Configuration — `CommunityConfigurationDashboard`, `CommunityConfigurationEditor`

A mimic of [Community Configuration](https://www.mediawiki.org/wiki/Extension:CommunityConfiguration):
the special page where a wiki's administrators configure features
(`Special:CommunityConfiguration` on wiki). Two pages:

- **Dashboard** — "What is Community Configuration?", the "Learn more" and
  "Send us your feedback" boxes, then a grid of feature cards (two columns on
  Vector, one on Minerva).
- **Editor** — one feature's page: "Editing <title>", the "View form" /
  "View history" / "Watch" tabs (Vector only), a "< Special:CommunityConfiguration"
  link back, the feature's form, and a sticky footer with "Save changes" (which
  asks for an edit summary in a dialog, then shows "Your changes were saved").

Copy is the extension's own English messages (`i18n/en.json`). Components live
in `src/components/community-configuration/`.

Starter: **`src/prototypes/template-community-configuration/`** — two real
features, **Automoderator** and **Babel**, each with its form, defaults, and
copy taken from the owning extension's schema and messages.

## The "…" menu (not on wiki)

The editor's "…" menu (top right) holds prototype controls:

- **View as** — **Administrator** (default) or **Not an administrator**. See below.
- **Reset to defaults** — discards the feature's saved configuration. Shown
  only when the page listens for `@reset` (the template does).

### Administrator toggle

Only administrators can save a Community Configuration form. Not an administrator: the extension's "This page is
protected…" notice above the form, the inline "You cannot save changes…"
notice in the footer, and Save changes disabled. The form's fields stay
editable, as on wiki.

The state is shared by every editor page, so it holds between features. Read
or set it from a prototype with `useCommunityConfigurationAdmin()`:

```ts
import { useCommunityConfigurationAdmin } from '@/components/community-configuration/useCommunityConfigurationAdmin'

const { isAdmin } = useCommunityConfigurationAdmin() // Ref<boolean>
```

## Features (in the template)

The template declares its features in `features.ts` — there is no global
registry:

```ts
export const FEATURES: readonly TemplateFeature[] = [
  {
    id: 'Babel', // URL segment: the provider id, as on wiki
    title: 'Babel', // editor page: "Editing Babel"
    description: '…', // dashboard card
    historyUrl: wikiUrl('MediaWiki:BabelConfig.json', { action: 'history' }), // optional
    form: BabelForm, // the form's fields, edited through v-model
    defaults: { BabelMainCategory: 'User %code%' /* … */ }, // keys as in the JSON page
  },
]
```

To add a feature: add an entry, and a form component beside `features.ts`.
A form is a fragment of Codex `CdxField`s that edits its configuration with
`defineModel()` — copy `BabelForm.vue` (text inputs, checkboxes) or
`AutoModeratorForm.vue` (radios, a chip input, help text).

The editor route edits a **draft** copy of the saved configuration; Save
changes (after the dialog) commits it with `saveConfig()`, and Reset to
defaults discards it with `resetConfig()`.

Saved configuration is kept in the viewer's browser (`localStorage`), so it
lasts through reloads, new tabs, and direct links. A save in one tab updates
the others. It is **not** shared between people: a link to the prototype shows
the defaults to anyone who hasn't saved. Each copy of the template stores
under its own key (it includes the dashboard's route). Without storage
(private windows, blocked site data), saves last until the page reloads.

## Controlling a prototype with a setting

The usual reason to add Community Configuration to a prototype: "add a
Community Configuration setting that turns X on". Do it like this:

1. **Copy the template into the prototype's folder** — don't edit
   `template-community-configuration/`. Copy the whole folder to
   `src/prototypes/<prototype>/community-configuration/`. Set
   `COMMUNITY_CONFIGURATION_PATH` in the copied `features.ts` to
   `/<prototype>/community-configuration` (in development, the console warns
   until it matches), and remove the `definePage` gallery meta from the copied
   `index.vue` (nested routes don't show in the gallery anyway). Keep the
   template's features and forms only if the prototype needs them;
   `PageTitleLookup.vue` and `wikiUrl.ts` are shared by the forms.
2. **Declare the prototype's feature** in the copied `features.ts`: an `id`,
   the feature's real `title` and `description` if it has them, a `form`, and
   `defaults` with one key per setting. Use the extension's real config keys
   when the setting exists on wiki (e.g. `AutoModeratorEnableRevisionCheck`);
   otherwise name it the way the extension would.
3. **Add the setting to the form** — a `CdxField` bound to
   `config.<Key>` through `defineModel()`, using the field that
   Community Configuration would show for the setting's type. See
   [Form fields](#form-fields): use only those, unless the prototype
   proposes a new kind of field.
4. **Read it in the prototype** with `useFeatureConfig()`. It updates when
   someone saves the form, so use it in a `computed` or the template:

   ```vue
   <script setup lang="ts">
   import { computed } from 'vue'
   import { useFeatureConfig } from './community-configuration/features'

   const config = useFeatureConfig<{ MyFeatureEnabled: boolean }>('MyFeature')
   const showWidget = computed(() => config.value.MyFeatureEnabled)
   </script>
   ```

   Read only — change settings through the form, so they go through Save
   changes as on wiki.

5. **Link the prototype to its settings** if the reader needs a way there, e.g.
   a `RouterLink` to `/<prototype>/community-configuration/MyFeature`.

## Form fields

Community Configuration doesn't let a feature lay out its own form. A
feature describes its settings as a JSON schema, and the editor picks a
built-in field for each setting by its type. A prototype's form should use
only these fields, so the design is one the extension can build without new
work:

| Setting type (schema)                           | Field                                      | In ProtoWiki                                    |
| ----------------------------------------------- | ------------------------------------------ | ----------------------------------------------- |
| `boolean`                                       | Checkbox                                   | `CdxCheckbox`                                   |
| `string`                                        | Single-line text box                       | `CdxTextInput`                                  |
| `number`, `integer`                             | Number box (optional min, max, step)       | `CdxTextInput input-type="number"`              |
| `string` / `number` with `enum`                 | Radio buttons, one per value               | `CdxRadio`                                      |
| `array` of `enum` values                        | Chip input with a menu of the values       | `CdxChipInput` + `CdxMenu`                      |
| `array` of `string`                             | Chip input                                 | `CdxChipInput`                                  |
| `array` of anything else                        | Repeated fields, each with a delete button | `CdxField` per item + quiet `CdxButton` (trash) |
| `object`                                        | A labelled group of fields (a fieldset)    | `CdxField is-fieldset` around its fields        |
| Page title (`MediaWikiDefinitions` `PageTitle`) | Page search                                | `PageTitleLookup.vue` (template)                |
| Page titles (`PageTitles`)                      | Page search, several picks                 | `CdxMultiselectLookup`                          |
| Namespaces (`Namespaces`)                       | Namespace search, several picks            | `CdxMultiselectLookup`                          |
| Commons file (`CommonsFile`)                    | File search                                | `CdxLookup`                                     |

Every field can have a label, a description and help text (the `CdxField`
slots), and shows a validation error under it. A checkbox's own text is
separate from its field label: a field can have either, or both.

**Not available:** multi-line text boxes, dropdowns (`CdxSelect`), toggle
switches, date pickers, sliders. A list of values is always radio buttons,
however long. The **Automoderator** form in the template uses checkboxes, radios,
text boxes, a chip input and page search; **Babel** uses a group of text boxes.

**Custom fields.** Another extension can register its own field and ask for
it by name in its UI schema, in place of the built-in one. So a new kind of
field is possible, but it is new code in that extension. When a prototype
needs one, build it, and tell the author it goes beyond what Community
Configuration ships.

## Routing

Two route files (file-based routing): the dashboard at
`<basePath>/index.vue` and the editor at `<basePath>/[feature]/index.vue`,
which sends an unknown id back to the dashboard. Both components take the
dashboard's route as **`basePath`**; feature links are `<basePath>/<id>`.
The template's pages find `basePath` from the URL
(`useCommunityConfigurationPath()` in `features.ts`), so a copied or renamed
folder links to itself. `COMMUNITY_CONFIGURATION_PATH` still names the
saved configuration in storage, and is what the prototype links to.

A standalone Community Configuration prototype (not attached to another
prototype) is a copy of the whole template folder under a new name, as with
any template: change its `definePage` title and description, and
`COMMUNITY_CONFIGURATION_PATH`.

Both components render their own **`SpecialPageWrapper`** — wrap them in
**`ChromeWrapper`** only.

## `CommunityConfigurationDashboard`

| Prop       | Type                                       | Notes                 |
| ---------- | ------------------------------------------ | --------------------- |
| `features` | `readonly CommunityConfigurationFeature[]` | One card each         |
| `basePath` | `string`                                   | The dashboard's route |

`CommunityConfigurationFeature` (`types.ts`): `id`, `title`, `description`,
optional `historyUrl`.

## `CommunityConfigurationEditor`

| Prop       | Type                            | Notes                     |
| ---------- | ------------------------------- | ------------------------- |
| `feature`  | `CommunityConfigurationFeature` |                           |
| `basePath` | `string`                        | Where the back link leads |

| Slot       | Use for                                                         |
| ---------- | --------------------------------------------------------------- |
| `#default` | The feature's form fields (Codex `CdxField`s), above the footer |

| Event   | Payload           | When                                                                             |
| ------- | ----------------- | -------------------------------------------------------------------------------- |
| `save`  | `summary: string` | Save changes in the edit summary dialog                                          |
| `reset` | (none)            | Reset to defaults in the "…" menu. Without a listener, the menu doesn't offer it |

Saving persists nothing itself: keep the form's state in the prototype and
commit it on `save`. Give the editor a `:key` of the feature id, so its
messages reset between features.
