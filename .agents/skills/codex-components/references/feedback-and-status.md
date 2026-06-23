# Feedback & status

## CdxMessage

Banner message (notice / warning / error / success).

```vue
<CdxMessage type="notice">
  Heads up: this is a draft prototype.
</CdxMessage>
```

| Prop | Values | Default |
| --- | --- | --- |
| `type` | `notice` / `warning` / `error` / `success` | `notice` |
| `inline` | true for compact inline use | `false` |
| `dismissButtonLabel` | `aria-label` for ✕ | `'Close'` |
| `allowUserDismiss` | boolean | `false` |
| `fadeIn` | boolean | `false` |
| `icon` | custom icon descriptor | (status default) |

Emits `user-dismissed`.

Use this:

- For an inline form-level error.
- For a page-level "draft only" notice.
- For success after publish.

## CdxProgressBar

A progress bar.

```vue
<CdxProgressBar inline aria-label="Loading" />            <!-- indeterminate, thin -->
<CdxProgressBar :value="42" aria-label="Importing" />  <!-- determinate -->
```

| Prop | Values | Default |
| --- | --- | --- |
| `inline` | true for thin inline bar | `false` |
| `value` | `0`–`100` for determinate, omit for indeterminate | indeterminate |
| `disabled` | boolean | `false` |

## CdxProgressIndicator

Spinner for "operation in flight" — typically inside buttons or inline
with text.

```vue
<CdxButton :disabled="loading">
  <CdxProgressIndicator v-if="loading" inline />
  Publish
</CdxButton>
```

## CdxToast / CdxToastContainer

Floating, ephemeral notification. Place a single `<CdxToastContainer />`
near the root, then call its API to push toasts.

```vue
<!-- App.vue -->
<CdxToastContainer ref="toasts" />

<script setup>
import { useTemplateRef } from 'vue'
const toasts = useTemplateRef('toasts')

function notify() {
  toasts.value?.add({
    type: 'success',
    message: 'Published.',
  })
}
</script>
```

## When to use which

| Situation | Use |
| --- | --- |
| Form field is invalid | `CdxMessage` inline (or `CdxField`'s `status` + `messages`) |
| Page is loading | `CdxProgressBar inline` |
| Button is busy | `CdxProgressIndicator inline` inside the button |
| Action just completed | `CdxToast` (transient) |
| Persistent page-level notice | `CdxMessage` block-level |
