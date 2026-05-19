# Dashboard layout — `Dashboard`, `DashboardModule`

GrowthExperiments-style **newcomer homepage** layout: responsive grid with a
primary column, sidebar modules, and a mobile stack of tappable link cards.

Compose inside **`SpecialPageWrapper`** (see [`composition-recipes.md`](composition-recipes.md)).
Reference prototypes:

- **`src/prototypes/template-dashboard/`** — minimal placeholder modules inline in `index.vue`
- **`src/prototypes/template-homepage/`** — full homepage with co-located `*Module.vue` files and **`dashpage-fixtures.ts`**

## Naming note

Do not confuse:

- **`SpecialPageWrapper` `help`** — desktop title-row **Help** link (Codex docs URL)
- **`dashpage/HelpModule.vue`** — prototype-local **"Get help with editing"** sidebar/mobile card (wraps **`DashboardModule`**)

## `Dashboard`

Responsive shell only — no module chrome of its own.

### Slots

| Slot | Breakpoint | Use for |
| --- | --- | --- |
| `#banner` | Mobile only (≤640px) | Optional strip above the card stack (e.g. "Share feedback" link) |
| `#mobile` | Mobile only | Stacked **`DashboardModule`** link cards — pass **`to`** on each module |
| `#primary` | Desktop only | Main column (e.g. Contribute feed) |
| `#sidebar` | Desktop only | Sidebar stack — omit **`to`** on **`DashboardModule`** for static cards |

At **≤640px**, `#mobile` + `#banner` show and `#primary` / `#sidebar` hide.
Above **640px**, the two-column grid (`primary` ~66% + `sidebar` ~34%) shows
and the mobile regions hide.

Utility classes from the component stylesheet:

- **`dashboard-slot`** — min-height baseline on module roots
- **`dashboard-slot--desktop-primary`**, **`dashboard-slot--mobile-primary`**, etc. — prototype hooks for per-slot sizing (see **`template-dashboard`** / **`dashpage`**)

### Props

None. **`Dashboard`** is a layout shell only.

## `DashboardModule`

Single module box — **link card** when **`to`** is set, **static sidebar card** when omitted.

### Props

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `title` | `string` | `undefined` | Module heading row; omitted when empty after trim |
| `to` | `RouteLocationRaw` | `undefined` | When set → mobile-style tappable **`RouterLink`** card (title, arrow, body, optional CTA). When omitted → desktop **`section.sidebar-card`** |
| `cta` | `string \| null` | `''` | Bottom blue strip label when **`to`** is set. **`null`** hides the strip. **`''`** keeps the strip for a custom **`#cta`** slot |

### Slots

| Slot | Use for |
| --- | --- |
| default | Module body (stats, placeholder copy, charts, …) |
| `#cta` | Replace the default blue CTA strip when **`to`** is set and **`cta !== null`** |

### Mobile vs desktop pattern

The same module often appears twice in a **`Dashboard`** — once in **`#mobile`**
(with **`to`**) and once in **`#primary`** or **`#sidebar`** (without **`to`**):

```vue
<template #mobile>
  <DashboardModule :to="APP_HOME" title="Contribute" cta="Open module">
    …
  </DashboardModule>
</template>
<template #sidebar>
  <DashboardModule title="Contribute">
    …
  </DashboardModule>
</template>
```

Richer modules (mentor, impact, help) can be extracted as co-located
`*Module.vue` files in the prototype folder that wrap **`DashboardModule`**.
Only **`index.vue`** becomes a route — see [`protowiki-create-prototype`](../../protowiki-create-prototype/SKILL.md).

### Example

```vue
<script setup lang="ts">
import ChromeWrapper from '@/components/ChromeWrapper.vue'
import Dashboard from '@/components/Dashboard.vue'
import DashboardModule from '@/components/DashboardModule.vue'
import SpecialPageWrapper from '@/components/SpecialPageWrapper.vue'
</script>

<template>
  <ChromeWrapper :last-edited-notice="false">
    <SpecialPageWrapper title="Dashboard" help>
      <Dashboard>
        <template #mobile>
          <DashboardModule to="/" title="Learn" cta="Open module">
            <p>Learn how to edit Wikipedia</p>
          </DashboardModule>
        </template>
        <template #primary>
          <DashboardModule title="Contribute">
            <p>No suggestions (yet)</p>
          </DashboardModule>
        </template>
        <template #sidebar>
          <DashboardModule title="Your impact">
            <p>— edits completed</p>
          </DashboardModule>
        </template>
      </Dashboard>
    </SpecialPageWrapper>
  </ChromeWrapper>
</template>
```
