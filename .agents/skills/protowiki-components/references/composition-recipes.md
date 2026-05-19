# Composition recipes

A page is one or more wrappers + the components inside. There is no
"layout layer" beyond what's expressed in the template.

## Full Wikipedia article page

```vue
<ChromeWrapper>
  <ArticleLive article="Albert Einstein" />
</ChromeWrapper>
```

## Hand-authored article (no live fetch or snapshot)

Use when the prototype needs **Vue-authored** article markup (infobox + sections) without **`page/html`** or **`public/snapshots/`**. Content goes in **`ArticleRenderer`** so **`.mw-parser-output`** and skin CSS apply.

```vue
<script setup lang="ts">
import ArticleRenderer from '@/components/ArticleRenderer.vue'
import ArticleWrapper from '@/components/ArticleWrapper.vue'
import ChromeWrapper from '@/components/ChromeWrapper.vue'

definePage({
  meta: { title: 'My hand-authored article', description: '…' },
})
</script>

<template>
  <ChromeWrapper>
    <ArticleWrapper title="Example band">
      <ArticleRenderer>
        <section class="hand-authored-lead">
          <!-- table.infobox… + lead paragraphs -->
        </section>
        <section>
          <h2>History</h2>
          <!-- … -->
        </section>
      </ArticleRenderer>
    </ArticleWrapper>
  </ChromeWrapper>
</template>
```

**Reference implementation:** **`src/prototypes/template-article-custom/`** (Wet Leg intro + History, enwiki-shaped infobox). Infobox header colours, **`hand-authored-lead`**, and RL vs template styles are documented in [`article.md`](article.md#hand-authored-article-markup-no-fetch-no-snapshot).

## Article page with extra markup beside the parser output

Place experiments as siblings before or after `<ArticleLive>` or `<ArticleSnapshot>` in the padded article region.

```vue
<ChromeWrapper>
  <MyInfoboxExperiment />
  <ArticleLive article="Talk:Albert Einstein" />
</ChromeWrapper>
```

## Special-page-style page

```vue
<ChromeWrapper>
  <SpecialPageWrapper title="Suggested edits">
    <template #actions>
      <CdxButton action="progressive" weight="primary">Pick a task</CdxButton>
    </template>
    <p>Body content.</p>
  </SpecialPageWrapper>
</ChromeWrapper>
```

Special pages usually **omit** the mock last-edited notice (desktop block **and** mobile strip) — mirror **`src/prototypes/template-special-page/index.vue`**:

```vue
<ChromeWrapper :last-edited-notice="false">
  <SpecialPageWrapper title="…">
    <!-- … -->
  </SpecialPageWrapper>
</ChromeWrapper>
```

## Bare canvas with chrome (no columns)

```vue
<ChromeWrapper>
  <h1>Anything</h1>
</ChromeWrapper>
```

## A/B preview — two themes, side by side

```vue
<div class="protowiki-ab">
  <ChromeWrapper theme="light">
    <ArticleLive article="Albert Einstein" />
  </ChromeWrapper>
  <ChromeWrapper theme="dark">
    <ArticleLive article="Albert Einstein" />
  </ChromeWrapper>
</div>

<style scoped>
.protowiki-ab {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
</style>
```

## Mobile preview embedded in a desktop page

```vue
<ChromeWrapper skin="mobile" style="max-width: 360px">
  <ArticleLive article="Albert Einstein" />
</ChromeWrapper>
```

## Edit-suggestion flow

Put **your editing surface** (e.g. a `contenteditable` region or code lifted from [Bárbara’s repos](editors.md)) beside a suggestion panel — see [`edit-suggestions.md`](edit-suggestions.md). Sketch:

```vue
<script setup lang="ts">
import { ref } from 'vue'

const surfaceRef = ref<HTMLDivElement | null>(null)
const draftHtml = ref('<p>…</p>')
function syncDraft() {
  if (!surfaceRef.value) return
  draftHtml.value = surfaceRef.value.innerHTML
}
function onPublish() {
  /* mock publish — never hit a real wiki */
}
</script>

<ChromeWrapper>
  <SpecialPageWrapper title="Suggested edits">
    <div class="layout">
      <div
        ref="surfaceRef"
        class="mw-parser-output"
        contenteditable="true"
        role="textbox"
        aria-multiline="true"
        @input="syncDraft"
      ></div>
      <!-- <aside> suggestion cards … -->
    </div>
  </SpecialPageWrapper>
</ChromeWrapper>
```

## Newcomer homepage / dashboard

Growth-style personal dashboard inside wiki chrome. Use **`Dashboard`** for the
responsive grid and **`DashboardModule`** for each box.

```vue
<ChromeWrapper :last-edited-notice="false">
  <SpecialPageWrapper title="Dashboard" help>
    <Dashboard>
      <template #banner>
        <!-- mobile-only strip, e.g. Share feedback -->
      </template>
      <template #mobile>
        <!-- DashboardModule with :to — tappable link cards -->
      </template>
      <template #primary>
        <!-- desktop main column — DashboardModule without :to -->
      </template>
      <template #sidebar>
        <!-- desktop sidebar modules — DashboardModule without :to -->
      </template>
    </Dashboard>
  </SpecialPageWrapper>
</ChromeWrapper>
```

- **Starter:** **`src/prototypes/template-dashboard/`** — inline placeholder modules
- **Full example:** **`src/prototypes/template-homepage/`** — co-located `HelpModule.vue`, `ImpactModule.vue`, `MentorModule.vue`, plus **`dashpage-fixtures.ts`**

See [`dashboard.md`](dashboard.md) for slot/prop detail. **`SpecialPageWrapper` `help`** is the title-row Help link — not the same as dashpage's **`HelpModule`** card.

## Article embedded in a dashboard module (no extra chrome)

```vue
<DashboardModule title="Suggested article">
  <ArticleLive article="Solar energy" />
</DashboardModule>
```

See also the **Newcomer homepage / dashboard** recipe above for the full page stack.

## Power-user — chrome primitives directly

```vue
<script setup lang="ts">
import ChromeHeader from '@/components/ChromeHeader.vue'
import ChromeFooter from '@/components/ChromeFooter.vue'
import ArticleLive from '@/components/ArticleLive.vue'
</script>

<template>
  <div class="custom-shell">
    <ChromeHeader />
    <main>
      <ArticleLive article="Albert Einstein" />
    </main>
    <ChromeFooter />
  </div>
</template>
```
