---
name: protowiki-update-codex
description: How to upgrade ProtoWiki to a new version of the Wikimedia Codex design system — bump the three @wikimedia/codex packages in lockstep, diff the upstream design-codex docs between the old and new release tags, propagate documented changes into the codex-* skills, refresh the vendored token snapshot, then verify. Use when asked to "update Codex", "upgrade Codex", "bump @wikimedia/codex", or pull in a new Codex version.
license: MIT
---

# Updating Codex in ProtoWiki

Codex ships as three packages that must always move together:
`@wikimedia/codex`, `@wikimedia/codex-design-tokens`, and
`@wikimedia/codex-icons`. Upgrading is more than an `npm install` — the
`codex-*` skills under `.agents/skills/` are a hand-curated mirror of the
upstream docs, so a version bump also means **diffing the upstream docs
and propagating real changes into those skills**.

The `codex-*` skills always describe the **current** Codex — they read as
if today's version is the only version. They carry no changelog notes
("new in vX", "as of vX"), so there is no "last synced" marker to keep up
to date. Your diff baseline is simply the version that is **already
installed** before you bump it (step 1).

## Steps

### 1. Find the latest version, and note the current one

```bash
npm view @wikimedia/codex version          # latest available = your target
node -e "console.log(require('./node_modules/@wikimedia/codex/package.json').version)"  # installed = your baseline
npm view @wikimedia/codex-design-tokens version
npm view @wikimedia/codex-icons version
```

The currently-installed version is your diff baseline (the skills mirror
it). The latest available is your target. All three packages normally
publish the same version; if they ever diverge, pin the `@wikimedia/codex`
version and let its dependency on `codex-icons` decide.

### 2. Bump the dependencies

Edit the three entries in [`package.json`](../../../package.json) to
`^x.y.z` (keep them identical), then:

```bash
npm install
```

Confirm the lockfile resolved as expected:

```bash
node -e "const l=require('./package-lock.json'); for (const p of ['@wikimedia/codex','@wikimedia/codex-design-tokens','@wikimedia/codex-icons']) console.log(p, l.packages['node_modules/'+p].version)"
```

### 3. Diff the upstream docs (baseline tag .. target tag)

Diff the version you had installed (step 1 baseline) against the one you
just installed. The upstream repo is mirrored on GitHub at
[`wikimedia/design-codex`](https://github.com/wikimedia/design-codex) with
a `vX.Y.Z` tag per release. Get the file-level diff — no clone needed:

```bash
curl -s "https://api.github.com/repos/wikimedia/design-codex/compare/v<old>...v<new>" -o /tmp/codex-compare.json
node -e "const c=require('/tmp/codex-compare.json'); console.log('commits',c.total_commits,'files',c.files.length); for (const f of c.files) console.log(f.status[0], f.changes, f.filename)"
```

Then inspect the patch for any file of interest:

```bash
node -e "const c=require('/tmp/codex-compare.json'); const f=c.files.find(x=>x.filename==='<path>'); console.log(f.patch)"
```

For a very large diff, clone instead and diff locally:

```bash
git clone --filter=blob:none https://github.com/wikimedia/design-codex /tmp/design-codex
git -C /tmp/design-codex diff v<old>..v<new> -- \
  packages/codex-docs/ 'packages/codex/src/components/**/*.md' \
  packages/codex-design-tokens/src/ packages/codex-icons/src/
```

Where things live upstream:

| Upstream area | What it tells you |
| --- | --- |
| `packages/codex-docs/docs/` | Component guidance, design-token docs, usage prose |
| `packages/codex/src/components/**/*.md` | Per-component prop / slot / event reference |
| `packages/codex-design-tokens/src/application.json` + `src/modes/dark.json` | New / changed / deprecated tokens |
| `packages/codex-icons/src/icons.ts` | New / renamed / removed icon names |
| `CHANGELOG.md` | Human summary; cross-check against the file diff |

### 4. Propagate documented changes into the codex-* skills

Only carry over **documented, user-facing** changes — ignore internal
refactors, build/test churn, and the doc-site version string.

**Write every edit as a description of the current state.** Update the
prose so it reads as though the new version is the only version — adjust
the existing wording, add the new token/icon/prop, remove what's gone. Do
**not** add changelog-style notes like "new in vX", "as of vX", or
"changed in vX"; the git history already records when things changed.

| Diff area | Skill to update |
| --- | --- |
| Component props / slots / events / guidance | [`codex-components`](../codex-components/SKILL.md) + `references/*.md` |
| New / changed / deprecated tokens | [`codex-tokens`](../codex-tokens/SKILL.md) + `references/colors.md` etc. |
| Text style scale / the 9-styles rule | [`codex-typography`](../codex-typography/SKILL.md) (and the copy kept in `codex-tokens/references/typography.md`) |
| Added / renamed / removed icons | [`codex-icons`](../codex-icons/SKILL.md) |
| Cross-cutting usage | [`codex-usage`](../codex-usage/SKILL.md) |
| Design principles, visual style, layout, content guidelines | [`codex-style-guide`](../codex-style-guide/SKILL.md) + `references/*.md` |

Verify any new icon name against the installed package before documenting it:

```bash
node -e "const i=require('@wikimedia/codex-icons'); console.log('cdxIconFoo' in i)"
```

Also regenerate the full icon list at
[`codex-icons/references/icons.md`](../codex-icons/references/icons.md)
(a generated Markdown doc — `Name | Constant | Direction`, grouped A–Z).
Run this from the repo root:

```bash
node -e '
const fs = require("fs");
const icons = require("@wikimedia/codex-icons");
const names = Object.keys(icons).filter(n => n.startsWith("cdxIcon")).sort((a,b)=>a.localeCompare(b));
const direction = v => {
  if (v && typeof v === "object") {
    if ("langCodeMap" in v) return "varies by `langCode`";
    if ("shouldFlip" in v) return "flips in RTL";
    if ("rtl" in v) return "distinct LTR/RTL glyphs";
  }
  return "";
};
const label = n => n.replace(/^cdxIcon/, "")
  .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
  .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2");
const groups = {};
for (const n of names) { const L = n.replace(/^cdxIcon/,"")[0].toUpperCase(); (groups[L]=groups[L]||[]).push(n); }
let out = "# All Codex icons\n\n" +
  "The complete catalogue of importable icon constants from\n" +
  "`@wikimedia/codex-icons` (" + names.length + " icons). Import any of these and\n" +
  "render through `CdxIcon` — see [`../SKILL.md`](../SKILL.md) for usage,\n" +
  "accessibility, and direction/lang handling.\n\n" +
  "The **Name** column is a readable label derived from the constant. The\n" +
  "**Direction** column flags icons that are not plain strings: _flips in RTL_\n" +
  "(auto-mirrored), _distinct LTR/RTL glyphs_, or _varies by `langCode`_.\n\n" +
  "This file is generated from the installed package. To regenerate it (e.g.\n" +
  "after a Codex upgrade) see the\n" +
  "[`protowiki-update-codex`](../../protowiki-update-codex/SKILL.md) skill.\n";
for (const L of Object.keys(groups).sort()) {
  out += "\n## " + L + "\n\n| Name | Constant | Direction |\n| --- | --- | --- |\n";
  for (const n of groups[L]) out += "| " + label(n) + " | `" + n + "` | " + direction(icons[n]) + " |\n";
}
fs.writeFileSync(".agents/skills/codex-icons/references/icons.md", out);
console.log("wrote", names.length, "icons");
'
```

### 5. Refresh the vendored token snapshot

[`codex-tokens/assets/tokens.css`](../codex-tokens/assets/tokens.css) is a
vendored copy used for quick grepping. It is **not** a plain `cp` of one
file: it is the light `:root` block from `theme-wikimedia-ui.css` followed
by the dark tokens from `theme-wikimedia-ui-mode-dark.css`, re-scoped from
`:root` to `html.skin-theme-clientpref-night` (with `color-scheme: dark;`
injected). Regenerate it:

```bash
node -e '
const fs=require("fs"); const dir="node_modules/@wikimedia/codex-design-tokens/";
const light=fs.readFileSync(dir+"theme-wikimedia-ui.css","utf8").trimEnd();
let dark=fs.readFileSync(dir+"theme-wikimedia-ui-mode-dark.css","utf8")
  .replace(/^\/\*[\s\S]*?\*\/\s*/,"")
  .replace(/:root\s*\{/,"html.skin-theme-clientpref-night {\n  color-scheme: dark;").trimEnd();
const header="/* Copied from @wikimedia/codex-design-tokens/theme-wikimedia-ui.css on <DATE> */\n"+
  "/* Night block re-scoped from theme-wikimedia-ui-mode-dark.css (:root -> html.skin-theme-clientpref-night). */\n\n";
fs.writeFileSync(".agents/skills/codex-tokens/assets/tokens.css", header+light+"\n\n"+dark+"\n");
'
```

Replace `<DATE>` with today's date. Sanity-check: braces balance, both the
`:root` and `html.skin-theme-clientpref-night` selectors are present, and
the Codex banner reads the new version.

### 6. Verify

```bash
npm run build
npm run type-check
npm run lint
```

Then `npm run dev` and smoke-test the surfaces most exposed to Codex
changes:

- Popovers: settings gear (`UserSettingsPopover`) and the article
  language menu (`ArticleHeader`).
- Search: `Search` (`CdxTypeaheadSearch`).
- Loading: `ArticleLive` / `ArticleSnapshot` (`CdxProgressBar`).
- Icons across chrome header/footer and homepage modules.
- Toggle light/dark theme to confirm token injection in
  [`src/theme.ts`](../../../src/theme.ts) still cascades.

## Why the skills, not just the package?

ProtoWiki's `codex-*` skills are portable, environment-agnostic mirrors of
the upstream Codex docs (see the prefix-as-contract note in
[`AGENTS.md`](../../../AGENTS.md)). Agents read them via progressive
disclosure instead of opening `node_modules` or the live docs site, so they
drift from reality unless every version bump syncs them. The vendored
`tokens.css` and these skills are the two things `npm install` will *not*
update for you.
