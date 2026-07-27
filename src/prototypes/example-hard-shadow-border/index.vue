<script setup lang="ts">
import PlainWrapper from '@/components/PlainWrapper.vue'
import HardShadowTabTrack from './HardShadowTabTrack.vue'
import OptionSection from './OptionSection.vue'

definePage({
  meta: {
    title: 'Example: Hard-shadow border',
    description:
      'Compare CSS techniques for the Figma inside-stroke + bottom/right outside-stroke tab border.',
  },
})

const techniques = [
  {
    id: 'dual-shadow' as const,
    title: '1. Dual box-shadow',
    verdict: 'Recommended default',
    note: 'One element, no layout shift. Inset stroke plus a hard 1px offset shadow on the bottom-right. Corners usually match Figma well; focus rings need care because they stack with the shadow.',
    avoid: false,
    showActive: true,
  },
  {
    id: 'nested' as const,
    title: '2a. Nested DOM + outer box-shadow',
    verdict: 'Best layer parity with Figma',
    note: 'Outer wrapper carries the offset stroke via box-shadow; inner button carries the full inside border. Maps cleanly to design handoff but adds a wrapper per tab.',
    avoid: false,
  },
  {
    id: 'nested-partial' as const,
    title: '2b. Nested DOM + partial outer border',
    verdict: 'Avoid — corner gaps',
    note: 'Literal translation of “outside stroke on bottom and right only” using border-bottom and border-right on the outer shell. Partial borders on rounded rects leave visible gaps at corners — see the loupe.',
    avoid: true,
  },
  {
    id: 'pseudo' as const,
    title: '3. Pseudo-element second layer',
    verdict: 'Good without a wrapper',
    note: 'Full border on the button; ::after paints the offset stroke. Keeps a single semantic button but still uses two paint passes and can interact with overflow clipping.',
    avoid: false,
  },
  {
    id: 'asymmetric' as const,
    title: '4. Asymmetric border-width',
    verdict: 'Avoid — wrong corners',
    note: 'Looks close at a glance with 2px bottom/right and 1px top/left, but the bottom-right arc does not match Figma’s layered stroke.',
    avoid: true,
  },
  {
    id: 'drop-shadow' as const,
    title: '5. filter: drop-shadow + border',
    verdict: 'Edge case',
    note: 'Single filter property for the offset, but creates a stacking context and can double-paint edges when combined with a full border.',
    avoid: false,
  },
  {
    id: 'gradient' as const,
    title: '6. Gradient / multi-background',
    verdict: 'Possible but brittle',
    note: 'Stacked linear-gradient backgrounds paint 1px top/left and 2px bottom/right inset. Hard to maintain at different radii; does not truly replicate an outside stroke.',
    avoid: false,
  },
  {
    id: 'svg' as const,
    title: '7. SVG background-image',
    verdict: 'Pixel-perfect export; not token-driven',
    note: 'Inline SVG data-URI with two stroke layers. Can match a Figma export exactly but requires separate assets per theme and does not follow Codex tokens automatically.',
    avoid: false,
  },
]
</script>

<template>
  <PlainWrapper heading="Hard-shadow border lab">
    <div class="tab-lab">
      <section class="tab-lab__intro">
        <p>
          Figma builds this tab border from two strokes on two rounded rectangles: a
          1px <strong>inside</strong> stroke on all sides, plus a 1px
          <strong>outside</strong> stroke on the bottom and right only. The result is
          1px on top/left and ~2px on bottom/right, with the extra weight sitting
          outside the inner edge.
        </p>
        <p>
          CSS has no single property for “outside stroke on two sides only.” Every
          technique below simulates the effect with a second paint layer — box-shadow,
          nested DOM, pseudo-element, or similar. Compare the corner loupes against
          the reference tabs.
        </p>
        <p class="tab-lab__links">
          Related:
          <a href="/musical-group">Musical group tabs</a>
          (current plain 1px border) ·
          <a href="?theme=dark">Dark theme preview</a>
        </p>
      </section>

      <div class="tab-lab__grid">
        <OptionSection
          v-for="item in techniques"
          :key="item.id"
          :title="item.title"
          :note="item.note"
          :verdict="item.verdict"
          :avoid="item.avoid"
        >
          <template #demo>
            <HardShadowTabTrack
              :technique="item.id"
              :show-active="item.showActive"
            />
          </template>
          <template #loupe>
            <HardShadowTabTrack
              :technique="item.id"
              :show-active="item.showActive"
            />
          </template>
        </OptionSection>
      </div>

      <section class="tab-lab__summary">
        <h2 class="tab-lab__summary-heading">Summary</h2>
        <table class="tab-lab__table">
          <thead>
            <tr>
              <th scope="col">Approach</th>
              <th scope="col">Verdict</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Dual box-shadow</td>
              <td>Best default for production tabs</td>
            </tr>
            <tr>
              <td>Nested DOM + outer shadow</td>
              <td>Best when designers want 1:1 layer parity</td>
            </tr>
            <tr>
              <td>Pseudo-element</td>
              <td>Good if you need a <code>&lt;button&gt;</code> with no wrapper</td>
            </tr>
            <tr>
              <td>Asymmetric borders / partial outer border</td>
              <td>Avoid — corner artifacts</td>
            </tr>
            <tr>
              <td>drop-shadow / gradient / SVG</td>
              <td>Edge cases; show but don’t ship</td>
            </tr>
          </tbody>
        </table>
        <p class="tab-lab__followup">
          Focus-ring polish per technique is out of scope for this lab — follow up
          after picking an approach for
          <code>MusicalGroupTabs.vue</code>.
        </p>
      </section>
    </div>
  </PlainWrapper>
</template>

<style scoped>
.tab-lab {
  --tab-lab-height: 38px;
  --tab-lab-padding: 1px var(--spacing-100);
  --tab-lab-radius: 6px;
  --tab-lab-gap: var(--spacing-50);

  display: flex;
  flex-direction: column;
  gap: var(--spacing-200);
  font-family: var(--font-family-system-sans);
  font-size: var(--font-size-medium);
  line-height: var(--line-height-medium);
}

.tab-lab__intro p {
  margin: 0 0 var(--spacing-100);
}

.tab-lab__intro p:last-child {
  margin-bottom: 0;
}

.tab-lab__links {
  font-size: var(--font-size-small);
  line-height: var(--line-height-small);
}

.tab-lab__grid {
  display: grid;
  gap: var(--spacing-150);
}

.tab-lab__summary-heading {
  margin: 0 0 var(--spacing-100);
  font-size: var(--font-size-medium);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-medium);
}

.tab-lab__table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-small);
  line-height: var(--line-height-small);
}

.tab-lab__table th,
.tab-lab__table td {
  padding: var(--spacing-50) var(--spacing-75);
  border: 1px solid var(--border-color-subtle);
  text-align: start;
  vertical-align: top;
}

.tab-lab__table th {
  background-color: var(--background-color-neutral-subtle);
  font-weight: var(--font-weight-bold);
}

.tab-lab__followup {
  margin: var(--spacing-100) 0 0;
  color: var(--color-subtle);
  font-size: var(--font-size-small);
  line-height: var(--line-height-small);
}
</style>
