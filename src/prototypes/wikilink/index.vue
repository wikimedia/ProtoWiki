<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, provide, ref, watch } from 'vue'
import { CdxButton, CdxField, CdxIcon, CdxSelect } from '@wikimedia/codex'
import { cdxIconConfigure } from '@wikimedia/codex-icons'

import SettingsPopover from '@/components/settings/SettingsPopover.vue'
import '@/components/settings/settingsPanel.css'

import './styled.css'

import ArticlePanel from './ArticlePanel.vue'
import { fetchCardData, type WikilinkCardData } from './fetchCardData'
import WikilinkCard from './WikilinkCard.vue'
import { mountWikilink } from './wikilink.js'

definePage({
  meta: {
    platform: 'web',
  },
})

// A copy of https://www.todepond.com/wikiblogarden/my-wikiblogarden/
// with some words wrapped in [[double brackets]], styled like todepond.com.
const WIKI = 'https://en.wikipedia.org'
const content = ref<HTMLElement | null>(null)
let wikilink: ReturnType<typeof mountWikilink> | null = null

// Settings: link popover style
type PopoverStyle = 'native' | 'custom' | 'styled'
const POPOVER_STYLE_KEY = 'protowiki-wikilink-popover-style'
const popoverStyleItems = [
  { value: 'native', label: 'Wiki native' },
  { value: 'custom', label: 'Custom' },
  { value: 'styled', label: 'Styled' },
]
function readPopoverStyle(): PopoverStyle {
  try {
    const stored = localStorage.getItem(POPOVER_STYLE_KEY)
    return stored === 'custom' || stored === 'styled' ? stored : 'native'
  } catch {
    return 'native'
  }
}
const popoverStyle = ref<PopoverStyle>(readPopoverStyle())
/** "Styled" is Custom recoloured in todepond.com's palette (see styled.css). */
const styled = computed(() => popoverStyle.value === 'styled')

// Teleported Codex overlays (the settings popover) land in this layer, so its styles can
// be scoped to this page. Only the trigger button is dark; the popover keeps the page theme.
const overlayLayer = ref<HTMLElement | null>(null)
provide('CdxTeleportTarget', overlayLayer)
watch(popoverStyle, (value) => {
  try {
    localStorage.setItem(POPOVER_STYLE_KEY, value)
  } catch {
    /* ignore */
  }
})

// Custom preview: wikilink.js handles hover timing, this renders the card.
const card = ref<{ anchor: HTMLElement; data: WikilinkCardData } | null>(null)
const cardRef = ref<InstanceType<typeof WikilinkCard> | null>(null)
const customPreview = {
  // Show 300ms after hover (or as soon as the data arrives, if that's later). Fetching
  // starts straight away so the data is usually ready by then.
  startDelay: 0,
  dwellDelay: 300,
  // Forgiving close: wait longer than native's 300ms after the pointer leaves the link/card.
  abandonDelay: 600,
  load: (title: string, _signal?: AbortSignal, section?: string) =>
    fetchCardData(WIKI, title, section),
  async show(anchor: HTMLElement, data: WikilinkCardData) {
    card.value = { anchor, data }
    await nextTick()
    return cardRef.value?.el ?? null
  },
  // Let the W bar finish backspacing first, unless another card has replaced this one meanwhile.
  async hide() {
    const closing = card.value
    await cardRef.value?.settle()
    if (card.value === closing) card.value = null
  },
}

// Clicking a wikilink (or the card's image or "Read full article") opens the article
// in a side panel (bottom sheet on mobile). Focus returns to the link when it closes.
const panelTitle = ref<string | null>(null)
/** Section to scroll to, for `[[Blog#History]]`-style links. */
const panelSection = ref('')
/** Mobile: a tapped link opens as a preview sheet first, then expands into the article. */
const panelPreview = ref(false)
let panelOpener: HTMLElement | null = null

function openPanel(
  title: string,
  opener: HTMLElement | null,
  section = '',
  preview = false,
): void {
  panelOpener = opener
  panelTitle.value = title
  panelSection.value = section
  panelPreview.value = preview
  card.value = null
}

function closePanel(): void {
  panelTitle.value = null
  panelOpener?.focus({ preventScroll: true })
  panelOpener = null
}

onMounted(() => {
  if (!content.value) return
  wikilink = mountWikilink(content.value, {
    wiki: WIKI,
    check: true,
    customPreview: () => (popoverStyle.value === 'native' ? null : customPreview),
    onClick: (link: HTMLElement, title: string) =>
      openPanel(title, link, link.dataset.wikilinkSection ?? '', true),
  })
})

onBeforeUnmount(() => {
  wikilink?.destroy()
  wikilink = null
})
</script>

<template>
  <div class="todepond">
    <div class="wikilink-settings" data-theme="dark">
      <SettingsPopover placement="bottom-start">
        <template #default="{ toggle, open }">
          <CdxButton
            weight="quiet"
            :icon-only="true"
            aria-label="Settings"
            :aria-expanded="open"
            @click="toggle"
          >
            <CdxIcon :icon="cdxIconConfigure" />
          </CdxButton>
        </template>
        <template #panel>
          <div class="settings-panel">
            <CdxField>
              <template #label>Link popover style</template>
              <CdxSelect v-model:selected="popoverStyle" :menu-items="popoverStyleItems" />
            </CdxField>
          </div>
        </template>
      </SettingsPopover>
    </div>
    <main ref="content">
      <h1 id="my-wiki--blog--digital-garden">My wiki / blog / digital garden</h1>

      <p>
        <a href="https://www.todepond.com/">Todepond dot com</a> is my [[wiki]] or [[blog]] or
        [[Digital garden|digital garden]].
      </p>

      <p>I made it because Devine told me to. Let me explain what happened…</p>

      <h2 id="devine">Devine</h2>

      <p>
        I was chatting with <a href="https://wiki.xxiivv.com/site/home.html">Devine</a> on a
        [[Videotelephony|video call]]. And I mentioned how they might be interested in learning about
        Dave Ackley’s work on
        <a href="https://www.youtube.com/watch?v=Dmlm6mtnSZs">robust-first computing</a>. They asked me if
        there was a [[hyperlink|link]] I could give them to let them learn more.
      </p>

      <p>
        I realised that I didn’t have one link in particular… But in my head, I knew of lots of great
        things to watch, read, and explore. Unfortunately, it was all hidden away in my head.
      </p>

      <p>So Devine told me to make a [[wiki]], and here we are.</p>

      <h2 id="matt">Matt</h2>

      <p>
        <a href="https://interconnected.org/home/">Matt Webb</a> told me a similar thing. I was telling him
        how I had so many thoughts floating round my head about some of the things I had learned recently.
        He suggested that I “write it down”.
      </p>

      <p>I think he’s a hardcore [[Blog|blogger]].</p>

      <p>
        He told me he got into [[blog]]ging in the “[[Blog#History|early days]]”. I didn’t know that was a
        thing. I didn’t know people were so ‘into’ blogging, or [[wiki]]s. They didn’t seem like special
        things to me.
      </p>

      <p>But maybe they are!</p>

      <h2 id="maggie">Maggie</h2>

      <p>
        <a href="https://maggieappleton.com/garden">Maggie Appleton</a> makes the case for ‘digital
        gardening’ on her website.
      </p>

      <p>
        I think a [[Digital garden|digital garden]] is something that you grow. It’s full of your thoughts,
        discoveries, [[knowledge]], and whatever you want to grow. Her site is beautiful, and she goes
        all-in on the [[gardening]].
      </p>

      <h2 id="elliot">Elliot</h2>

      <p>
        I’ve also seen it done on a smaller scale. Like on
        <a href="https://elliot.website/editor/">Elliot Evans</a>’s website. He often posts up unfinished
        pages. They end with something like “to be continued” or start with something like “this page is
        [[Under construction (computing)|under construction]]”. But they’re <em>there</em>. They’re
        uploaded on his website, not sitting around in his private notes.
      </p>

      <h2 id="me">Me</h2>

      <p>
        As a general theme, <a href="#">my</a> wiki / blog / digital garden is about ‘merging things
        together’. I’m so tired of seeing new ideas pop up. We have enough of them!
      </p>

      <p><em>No more ideas.</em> (say it with me)</p>

      <p>
        I want to merge things together. I see these three [[concept]]s, and I see the same things in each
        of them. Sure there are differences. There always are. But I want to pull them closer together,
        and introduce people onto the same page.
      </p>

      <p>
        The merging of ideas has always interested me, and it’s how I started my [[creative coding]]
        journey ([[spatial programming]] + [[Falling-sand game|falling sand]]). It’s the running thread
        between all my projects and videos. The clearest example is maybe the latest one,
        Define Define.
      </p>

      <p>Anyway, I should stop yapping away. Hopefully you now know what my website is about:</p>

      <blockquote>
        <p>NO MORE IDEAS<br />WE HAVE ENOUGH</p>
      </blockquote>

      <p>(merge them instead)</p>

      <hr />

      <p>Continue to the <a href="https://www.todepond.com/wikiblogarden/">wikiblogarden</a>.</p>
    </main>
    <Teleport to="body">
      <div ref="overlayLayer" class="wikilink-overlay-layer" />
      <!-- Explicit leave duration (matches the CSS below): the card also has a slide-in animation
           whose end event Vue would otherwise wait on. -->
      <Transition name="wikilink-card-fade" :duration="{ enter: 0, leave: 200 }">
        <WikilinkCard
          v-if="card"
          :styled="styled"
          ref="cardRef"
          :key="card.data.title"
          :data="card.data"
          :anchor="card.anchor"
          @open="(title, section) => openPanel(title, card?.anchor ?? null, section)"
        />
      </Transition>
      <!-- Explicit duration: the panel's root only hosts it, so Vue can't read the slide's length. -->
      <Transition name="article-panel-slide" :duration="250">
        <ArticlePanel
          v-if="panelTitle"
          :key="panelTitle"
          :styled="styled"
          :wiki="WIKI"
          :title="panelTitle"
          :section="panelSection"
          :preview="panelPreview"
          @close="closePanel"
        />
      </Transition>
    </Teleport>
  </div>
</template>

<!--
  The parts of https://www.todepond.com/style.css this page uses, scoped to
  .todepond so they don't leak into the rest of ProtoWiki. Not `scoped`: the
  wikilinks are created at runtime by wikilink.js, so they'd miss Vue's
  scoped-style attribute.
-->
<style>
/*
 * todepond.com's (dark) palette. Text and hover-fill colours are separate variables so a
 * light variant only has to change these values.
 */
.todepond {
  --todepond-text: white;
  --todepond-subtle: #9faeee;
  --todepond-green: #46ff80;
  --todepond-green-bright: #46ff80;
  --todepond-blue: #4699ff;
  --todepond-blue-bright: #4699ff;
  --todepond-red: #ff4346;
  --todepond-red-bright: #ff4346;

  box-sizing: border-box;
  min-height: 100vh;
  padding: 30px 10px;
  color: var(--todepond-text);
  background-color: rgb(31, 39, 54);
  font-family: sans-serif;
  font-size: 1.1em;
  line-height: normal;
}

.todepond *,
.todepond *::before,
.todepond *::after {
  box-sizing: border-box;
  accent-color: #4680ff;
}

.todepond main {
  max-width: 750px;
  margin: 0 auto;
}

.todepond *::selection {
  background-color: rgb(87, 101, 147);
}

.todepond h1,
.todepond h2 {
  width: 100%;
  font-family: inherit;
  font-weight: bold;
  color: inherit;
  border: none;
  margin: 0.67em 0;
}

.todepond h1 {
  font-size: 2em;
}

.todepond h2 {
  font-size: 1.5em;
  margin: 0.83em 0;
  border-bottom: var(--todepond-text) 1px solid;
  padding-bottom: 19px;
  padding-top: 19px;
}

.todepond p {
  margin: 1em 0;
}

.todepond a {
  color: var(--todepond-green);
  /* Longhand, so wikilink.js's dotted underline style survives. */
  text-decoration-line: underline;
}

.todepond a:hover {
  color: black;
  background-color: var(--todepond-green-bright);
  outline: 2px solid var(--todepond-green-bright);
}

.todepond a:focus-visible {
  outline: 2px solid var(--todepond-green);
  outline-offset: 2px;
}

.todepond :target {
  outline: 2px solid #4680ff;
  outline-offset: 2px;
}

.todepond blockquote {
  color: var(--todepond-subtle);
  margin: 0;
  padding-left: 23px;
  border-left: 1px var(--todepond-subtle) solid;
}

.todepond hr {
  border: none;
  height: 1px;
  background-color: var(--todepond-text);
}

/*
 * The select's menu renders inside the settings popover (teleporting it out would make
 * CdxPopover treat clicks on it as outside clicks and close). Let it spill out of the
 * popover's scrolling body instead of adding scrollbars.
 */
.wikilink-overlay-layer .settings-popover__overlay,
.wikilink-overlay-layer .settings-popover__overlay .cdx-popover__body {
  overflow: visible;
}

/* Custom card fades out when it closes (it slides in on its own, see WikilinkCard.vue). */
.wikilink-card-fade-leave-active {
  transition: opacity 200ms ease;
  pointer-events: none;
}

.wikilink-card-fade-leave-to {
  opacity: 0;
}

/* Settings menu: pinned to the top left of the screen; the button is in Codex dark mode. */
.todepond .wikilink-settings {
  position: fixed;
  top: var(--spacing-50);
  left: var(--spacing-50);
  z-index: 100;
}

/* The configure icon itself is white (Codex's dark-mode quiet button is a light grey). */
.todepond .wikilink-settings .cdx-button.cdx-button--weight-quiet,
.todepond .wikilink-settings .cdx-button.cdx-button--weight-quiet:hover {
  color: #fff;
}

/* Wikilinks in todepond.com's palette: blue (its a.secondary), red for missing (its a.danger). */
.todepond a.wikilink,
.todepond a.wikilink:visited {
  color: var(--todepond-blue);
}

.todepond a.wikilink:hover {
  color: black;
  background-color: var(--todepond-blue-bright);
  outline: 2px solid var(--todepond-blue-bright);
}

.todepond a.wikilink.new,
.todepond a.wikilink.new:visited {
  color: var(--todepond-red);
}

.todepond a.wikilink.new:hover {
  color: black;
  background-color: var(--todepond-red-bright);
  outline: 2px solid var(--todepond-red-bright);
}
</style>
