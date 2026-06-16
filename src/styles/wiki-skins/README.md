# Wikipedia skin CSS (ResourceLoader)

Vendor snapshots of **Vector 2022** (desktop) and **Minerva** (mobile) style bundles from English Wikipedia, scoped under `[data-skin="desktop"]` and `[data-skin="mobile"]` so both can load in ProtoWiki without overriding each other.

## Refresh

```bash
npm run snapshot:wiki-skins
```

This runs `scripts/snapshot-wiki-skins.sh` (curl → `*.rl.css`, then `scripts/scope-wiki-skin-css.mjs`). Re-run periodically; RL output evolves.

See `.agents/skills/wiki-snapshot-data/SKILL.md` for module lists and etiquette.
