<!-- Tools sidebar derived from suggestion-mode (Bárbara Martínez Calvo). -->
<template>
  <aside class="tools-sidebar">
    <div class="tools-container">
      <div class="tools-header">
        <h2 class="tools-title">Tools</h2>
        <button type="button" class="tools-toggle">hide</button>
      </div>

      <div class="tools-section">
        <div class="tools-section-title">General</div>
        <nav class="tools-nav">
          <a href="#" class="tools-link" @click.prevent>What links here</a>
          <a href="#" class="tools-link" @click.prevent>Related changes</a>
          <a href="#" class="tools-link" @click.prevent>Permanent link</a>
          <a href="#" class="tools-link" @click.prevent>Cite this page</a>
        </nav>
      </div>

      <div class="tools-section">
        <div class="tools-section-title">Print/export</div>
        <nav class="tools-nav">
          <a href="#" class="tools-link" @click.prevent>Download as PDF</a>
          <a href="#" class="tools-link" @click.prevent>Printable version</a>
        </nav>
      </div>
    </div>
  </aside>
</template>
