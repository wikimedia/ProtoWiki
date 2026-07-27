# App chrome — `AppChromeWrapper`, `AppChromeHeader`, `AppBottomMenu`

Mobile app shell components for **`platform: 'app'`** prototypes. Separate
from web Wikipedia chrome (`ChromeWrapper` / Vector / Minerva).

`AppChromeWrapper` composes **`AppChromeHeader`** + scrollable main slot +
**`AppBottomMenu`**. Primitives are independently importable for custom layouts.

Design reference: [protowiki-apps Figma](https://www.figma.com/design/8qeEyA6LT4bzpQLin1Gx43/protowiki-apps?node-id=1-695).

Starter template: **`src/prototypes/template-app-chrome/`**.

## AppChromeHeader

Top bar: Wikipedia stylized **W** lettermark (32×32) left; quiet icon-only **`CdxButton`**s
right (Tabs, Notifications).

### Props

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `theme` | `'light' \| 'dark'` | global | Sets `data-theme` on root |
| `wordmarkSrc` | `string` | EN W lettermark SVG | `#logo` replaces |
| `headerTools` | `AppHeaderTool[]` | `['tabs', 'notifications']` | `#actions` replaces cluster |

`AppHeaderTool` literals: `'tabs' \| 'notifications'` (see `src/components/app/appHeaderTools.ts`).

### Slots

| Slot | Default | Use for |
| --- | --- | --- |
| `#logo` | EN Wikipedia stylized W `<img>` | Replace lettermark |
| `#actions` | Tabs + Notifications buttons | Replace entire right cluster |

### Events

| Event | Payload | Notes |
| --- | --- | --- |
| `toolClick` | `AppHeaderTool` | Mock — wire in prototype as needed |

### Example

```vue
<AppChromeHeader @tool-click="(tool) => console.log(tool)" />
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
| `wordmarkSrc` | `string` | — | Forwarded to **`AppChromeHeader`** |
| `headerTools` | `AppHeaderTool[]` | full set | Forwarded to **`AppChromeHeader`** |
| `bottomNavItems` | `AppBottomNavItem[]` | all five | Forwarded to **`AppBottomMenu`** |
| `activeNavItem` | `AppBottomNavItem` | — | Forwarded to **`AppBottomMenu`** |

### Slots

| Slot | Default content | Use for |
| --- | --- | --- |
| default | (your prototype) | Scrollable body between header and bottom nav |
| `#header` | `<AppChromeHeader>` | Replace entire header |
| `#bottomMenu` | `<AppBottomMenu>` | Replace entire bottom nav |

### Events

Forwarded from primitives: `toolClick`, `update:activeNavItem`, `navigate`.

### Theme inheritance

`AppChromeWrapper` **provides** effective theme via `PROTOWIKI_CHROME_THEME`
(same key as **`ChromeWrapper`**) so nested themable components can inject it.

### Layout

Header, main content, and bottom nav share **`--spacing-150` (24px)** horizontal
inset. Bottom nav keeps **`--spacing-200` (32px)** vertical padding for the
84px bar height. Main content scrolls between header and bottom nav; don't add
extra outer padding in templates unless the prototype needs it.

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
| Header | Vector / Minerva | App top bar (wordmark + tabs + bell) |
| Footer / nav | Wikipedia footer strip | Bottom icon nav |
| Skin | `desktop` / `mobile` via `data-skin` | No skin — app device mode |
| Gallery meta | `platform: 'web'` (default) | `platform: 'app'` |
