<!-- TOC chrome derived from suggestion-mode (Bárbara Martínez Calvo). -->
<script setup lang="ts">
import { CdxIcon } from '@wikimedia/codex'
import { cdxIconNext } from '@wikimedia/codex-icons'
</script>

<template>
  <aside class="toc-sidebar">
    <div class="toc-container">
      <div class="toc-header">
        <h2 class="toc-title">Contents</h2>
        <button type="button" class="toc-toggle">hide</button>
      </div>

      <nav class="toc-nav">
        <div class="toc-item toc-item-no-chevron">
          <a href="#" class="toc-link toc-link-bold" @click.prevent>(Top)</a>
        </div>
        <div class="toc-item toc-item-no-chevron">
          <a href="#" class="toc-link" @click.prevent>Early life</a>
        </div>
        <div class="toc-item">
          <button type="button" class="toc-expand" aria-label="Expand">
            <CdxIcon :icon="cdxIconNext" size="small" />
          </button>
          <a href="#" class="toc-link" @click.prevent>Career</a>
        </div>
        <div class="toc-item toc-item-no-chevron">
          <a href="#" class="toc-link" @click.prevent>References</a>
        </div>
        <div class="toc-item toc-item-no-chevron">
          <a href="#" class="toc-link" @click.prevent>External links</a>
        </div>
      </nav>
    </div>
  </aside>
</template>
