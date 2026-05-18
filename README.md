# ProtoWiki

This repo is an experimental collection of resources for MediaWiki prototyping. It contains many links to many tools you can use. It's also an unopinionated prototyping template itself for minimal prototypes.

You can see it at [wikimedia.github.io/ProtoWiki](https://wikimedia.github.io/ProtoWiki).

## Resources

### Prototype templates

Depending on what you're trying to prototype, you might want to consider using one of these templates or systems.

- [ProtoWiki](https://github.com/wikimedia/ProtoWiki#using-protowiki-as-a-system) — This repo! An unopinionated prototyping system for MediaWiki.
- [Wikipedia Article Template](https://github.com/bmartinezcalvo/wikipedia-article-template) - "Interactive UX prototype template for Wikipedia article pages, built with Vue 3 and Wikimedia Codex design system."
- [Suggestion Mode Template](https://github.com/bmartinezcalvo/suggestion-mode) - "Interactive UX prototype showing the Suggestion Mode feature in the edit mode of a Wikipedia's article."
- [Wikihack Starter](https://gitlab.wikimedia.org/egardner/wikihack-starter) — "A Vue 3 prototyping environment for experimenting with Wikipedia reader features. Built for hackathons and rapid iteration, this starter kit lets you test new UI ideas in front of real users with minimal setup."
- [FakeMediaWiki System](https://github.com/todepond/fakemediawiki) — "An opinonated system for building lightweight MediaWiki prototypes. I should probably give it a better name."
- [Wikipedia Boilerplate](https://github.com/Sudhanshugtm/boiler_plate) — "Rapid prototyping framework for Wikipedia UX design work."
- Amin's monorepo. You'll have to ask Amin for access :)

### Agent skills

Skills that you can ask an AI agent to copy and use.

- [ProtoWiki Skills](https://github.com/wikimedia/ProtoWiki/blob/main/AGENTS.md) — "Skills for MediaWiki prototyping."
- [Wiki Skills](https://gitlab.wikimedia.org/santhosh/wiki-skills) — "A collection of skills for AI coding agents focused on Wikimedia projects."

### Packages

- [Codex package](https://www.npmjs.com/package/@wikimedia/codex) — The Wikimedia Codex design system. You'll want to use this!
- [FakeWiki package](https://www.npmjs.com/package/fakewiki) — Used within FakeMediaWiki, it contains methods for using various MediaWiki APIs and common prototyping patterns. Highly experimental to use this outside of FakeMediaWiki, but you can try it out if you feel adventurous!

### References

Lists of APIs you can use within prototypes.

- [Wiki Signals](https://todepond.github.io/FakeMediaWiki/Fullscreen/WikiSignals) — "Guidance for using real MediaWiki data in prototypes."
- [FakeWiki Playground](https://todepond.github.io/FakeMediaWiki/Fullscreen/ApiPlayground) — Explore every function from the `fakewiki` package.
- [FakeWiki LLMs.txt](https://todepond.github.io/FakeMediaWiki/llms.txt) — Intended for AI agents: A list of methods and composables exported from the `fakewiki` package.
- [FakeWiki Reference](https://todepond.github.io/FakeMediaWiki/Fullscreen/FakeWikiReference) — Intended for humans: A list of methods and composables exported from the `fakewiki` package.

## Using ProtoWiki as a system

_Either follow these instructions, or ask an AI agent to follow them for you!_

To run ProtoWiki locally, clone this repo or fork it to use it as a template.

Then install dependencies and run the dev server:

```bash
npm install
npm run dev
```

Then open [localhost:5173](https://localhost:5173) in your browser.

### Creating a prototype

1. Make a new folder in the `prototypes` folder.
2. Put an `index.vue` file in the folder containing your prototype.
3. Click your prototype from the home page!

I recommend copying one of the `-template` prototypes as a starting point. For example, copy+paste the `chrome-template`, give it a new name, and change its name and description inside its `index.vue` file.

Trouble-shooting: If it doesn't appear at first or you see a blank screeen, try restarting the dev server. If you don't know how to do this, ask a friendly human or AI agent to help you.

## Questions? Thoughts?

Chat to me (Lu Wilson) on Slack! or lwilson-ctr on the wikis! I'm away until May 7th but would be happy to chat with you then!

This is all very experimental and exploratory. Thank you for being part of this.
