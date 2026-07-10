/// <reference types="vite/client" />
/// <reference types="unplugin-vue-router/client" />
/// <reference path="./route-meta.d.ts" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, any>
  export default component
}
