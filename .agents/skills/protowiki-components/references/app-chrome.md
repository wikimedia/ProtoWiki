# App chrome — `AppChromeWrapper`, `AppChromeHeader`, `AppBottomMenu`

Mobile app shell components for **`platform: 'app'`** prototypes. Separate
from web Wikipedia chrome (`ChromeWrapper` / Vector / Minerva).

`AppChromeWrapper` composes **`AppChromeHeader`** + scrollable main slot +
**`AppBottomMenu`**. Primitives are independently importable for custom layouts.

Design reference: [protowiki-apps Figma](https://www.figma.com/design/8qeEyA6LT4bzpQLin1Gx43/protowiki-apps?node-id=1-695).

Starter templates: **`src/prototypes/template-app-chrome/`**, **`src/prototypes/template-app-search/`**.

## AppChromeHeader

Prop-driven top bar. Three regions — **`left`**, **`middle`**, **`right`** — each
an array of items. No slots. Layout is inferred from which regions have content:

| Regions present | Behaviour |
| --- | --- |
| left + middle + right | Grid — middle centered between flanks |
| left + right (no middle) | Flex — flanks at edges |
| left only (e.g. search field) | Flex — left grows |

**`middle`** only renders when **both** **`left`** and **`right`** are present;
otherwise it is ignored (dev console warning).

Omit a prop (or pass **`[]`**) to hide that region. **`left`** / **`right`**
default to the explore preset when omitted.

```ts
/** Exported from AppChromeHeader.vue */
type AppHeaderItem =
  | { type: 'link'; icon: Icon; label: string; href?: string }
  | { type: 'button'; icon: Icon; label: string; onClick?: () => void }
  | { type: 'component'; component: Component }
  | { type: 'title'; text: string }
```

- **`link`** — icon glyph; optional **`href`** (`RouterLink`, **`<a>`**, or plain span)
- **`button`** — quiet **`CdxButton`**; optional **`onClick`**
- **`component`** — Vue component (search field, custom UI)
- **`title`** — screen title; Codex **Heading 3** (`h3`)

Flanking regions (**`left`** / **`right`**) are capped at **4** items.

### Props

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `theme` | `'light' \| 'dark'` | global | Sets `data-theme` on root |
| `left` | `AppHeaderItem[]` | explore preset | Max **4**; **`[]`** hides |
| `middle` | `AppHeaderItem[]` | — | Requires left **and** right |
| `right` | `AppHeaderItem[]` | explore preset | Max **4**; **`[]`** hides |

### Examples

**Home (wrapper default — explore preset):**

```vue
<AppChromeWrapper>
  <p>Body.</p>
</AppChromeWrapper>
```

**Article reader (balanced — middle W):**

```vue
<AppChromeHeader
  :left="[
    { type: 'button', icon: cdxIconArrowPrevious, label: 'Back' },
    { type: 'button', icon: cdxIconSearch, label: 'Search' },
  ]"
  :middle="[{ type: 'link', icon: cdxIconLogoWikipedia, label: 'Wikipedia' }]"
  :right="[
    { type: 'button', icon: cdxIconTabs, label: 'Tabs' },
    { type: 'button', icon: cdxIconBellOutline, label: 'Notifications' },
    { type: 'button', icon: cdxIconVerticalEllipsis, label: 'Menu' },
  ]"
/>
```

**Activity / Saved (title + actions):**

```vue
<AppChromeHeader
  :left="[{ type: 'title', text: 'Activity' }]"
  :right="[
    { type: 'button', icon: cdxIconTabs, label: 'Tabs' },
    { type: 'button', icon: cdxIconBellOutline, label: 'Notifications' },
    { type: 'button', icon: cdxIconVerticalEllipsis, label: 'Menu' },
  ]"
/>
```

**Search screen:**

```vue
<script setup lang="ts">
import { defineComponent, h, ref } from 'vue'
import { CdxSearchInput } from '@wikimedia/codex'
import { cdxIconArrowPrevious } from '@wikimedia/codex-icons'
import AppChromeHeader from '@/components/app/AppChromeHeader.vue'
import type { AppHeaderItem } from '@/components/app/AppChromeHeader.vue'

const query = ref('')

const SearchField = defineComponent({
  setup() {
    return () =>
      h(CdxSearchInput, {
        modelValue: query.value,
        'onUpdate:modelValue': (v: string) => { query.value = v },
        placeholder: 'Search Wikipedia…',
      })
  },
})

const left: AppHeaderItem[] = [
  { type: 'button', icon: cdxIconArrowPrevious, label: 'Back', onClick: () => router.back() },
  { type: 'component', component: SearchField },
]
</script>

<template>
  <AppChromeHeader :left="left" :right="[]" />
</template>
```

## AppBottomMenu

Fixed bottom navigation: five icon-only items (Home, Saved, Search, History,
Menu) with top border and even spacing.

### Props

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `theme` | `'light' \| 'dark'` | global | Sets `data-theme` on root |
| `items` | `AppBottomNavItem[]` | all five | Subset/order |
| `activeItem` | `AppBottomNavItem` | — | Optional selected item |

`AppBottomNavItem` literals: `'home' \| 'bookmarks' \| 'search' \| 'history' \| 'menu'`
(see `src/components/app/appBottomNavItems.ts`).

### Slots

| Slot | Default | Use for |
| --- | --- | --- |
| default | Five icon buttons in `<nav>` | Replace entire bottom bar |
| `#item-{id}` | Codex icon for that item | Per-item override (e.g. `#item-search`) |

### Events

| Event | Payload | Notes |
| --- | --- | --- |
| `update:activeItem` | `AppBottomNavItem` | v-model support |
| `navigate` | `AppBottomNavItem` | Fired on tap |

### Example

```vue
<AppBottomMenu v-model:active-item="activeTab" @navigate="onNav" />
```

## AppChromeWrapper

App shell around the default slot. No `data-skin` — app prototypes don't use
Vector/Minerva skin switching.

### Props

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `lang` | `string` | — | BCP-47; sets `lang` on root |
| `dir` | `'ltr' \| 'rtl'` | — | Sets `dir` on root |
| `theme` | `'light' \| 'dark'` | global | Forwarded to header + bottom menu |
| `showBottomMenu` | `boolean` | `true` | Omit bottom nav when `false` |
| `left` | `AppHeaderItem[]` | — | Forwarded |
| `middle` | `AppHeaderItem[]` | — | Forwarded; **`[]`** hides |
| `right` | `AppHeaderItem[]` | — | Forwarded; **`[]`** hides |
| `bottomNavItems` | `AppBottomNavItem[]` | all five | Forwarded to **`AppBottomMenu`** |
| `activeNavItem` | `AppBottomNavItem` | — | Forwarded to **`AppBottomMenu`** |

### Slots

| Slot | Default content | Use for |
| --- | --- | --- |
| default | (your prototype) | Scrollable body between header and bottom nav |
| `#header` | `<AppChromeHeader>` | Replace entire header |
| `#bottomMenu` | `<AppBottomMenu>` | Replace entire bottom nav |

### Events

Forwarded from **`AppBottomMenu`**: `update:activeNavItem`, `navigate`.

### Theme inheritance

`AppChromeWrapper` **provides** effective theme via `PROTOWIKI_CHROME_THEME`
(same key as **`ChromeWrapper`**) so nested themable components can inject it.

### Layout

Header, main content, and bottom nav share **`--spacing-150` (24px)** horizontal
inset. Bottom nav uses the same **24px** padding on all sides. Main content
scrolls between header and bottom nav; don't add extra outer padding in templates
unless the prototype needs it.

### Example

```vue
<script setup lang="ts">
import AppChromeWrapper from '@/components/app/AppChromeWrapper.vue'

definePage({ meta: { platform: 'app' } })
</script>

<template>
  <AppChromeWrapper>
    <p>App body content.</p>
  </AppChromeWrapper>
</template>
```

## When to use app chrome directly

Most app prototypes use `<AppChromeWrapper>`. Import primitives directly when:

- You need header without bottom nav (`showBottomMenu={false}` on the wrapper
  is usually enough).
- You're building a custom shell with a non-default arrangement.

```vue
<script setup lang="ts">
import AppBottomMenu from '@/components/app/AppBottomMenu.vue'
import AppChromeHeader from '@/components/app/AppChromeHeader.vue'
</script>

<template>
  <div class="custom-app-shell">
    <AppChromeHeader />
    <main>…</main>
    <AppBottomMenu />
  </div>
</template>
```

## Web vs app chrome

| | Web (`ChromeWrapper`) | App (`AppChromeWrapper`) |
| --- | --- | --- |
| Header | Vector / Minerva | App top bar (inferred from regions) |
| Footer / nav | Wikipedia footer strip | Bottom icon nav |
| Skin | `desktop` / `mobile` via `data-skin` | No skin — app device mode |
| Gallery meta | `platform: 'web'` (default) | `platform: 'app'` |
