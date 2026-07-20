> [!NOTE]
> This is an experimental project that's used internally at Wikimedia to create prototypes for research, testing, exploration, thought experiments, and fun. You are welcome to explore it and try it out too.

# ProtoWiki

This repo is an experimental collection of resources for prototyping within the Wiki ecosystem. It contains two things:

1. [A big list](#resources) of links to many resources and tools that you can use.
2. [A prototyping system](#prototyping-system) itself for making minimal prototypes.

We'd love to hear from you. Have some feedback? Have a suggestion? Found a bug?\
In all cases, please feel free to [let us know](https://github.com/wikimedia/ProtoWiki/issues/new).

## Resources

> [!TIP]
> This is the big list of resources. For the prototyping system itself, [scroll down](#prototyping-system).

### Prototype templates

Depending on what you're trying to prototype, you might want to consider using one of these templates or systems.

- [ProtoWiki](https://github.com/wikimedia/ProtoWiki#using-protowiki-as-a-system) — This repo! An unopinionated prototyping system for MediaWiki and list of resources.
- [Wikipedia Article Template](https://github.com/bmartinezcalvo/wikipedia-article-template) - "Interactive UX prototype template for Wikipedia article pages, built with Vue 3 and Wikimedia Codex design system."
- [Suggestion Mode Template](https://github.com/bmartinezcalvo/suggestion-mode) - "Interactive UX prototype showing the Suggestion Mode feature in the edit mode of a Wikipedia's article."
- [Wikihack Starter](https://gitlab.wikimedia.org/egardner/wikihack-starter) — "A Vue 3 prototyping environment for experimenting with Wikipedia reader features. Built for hackathons and rapid iteration, this starter kit lets you test new UI ideas in front of real users with minimal setup."
- [FakeMediaWiki System](https://github.com/todepond/fakemediawiki) — "An opinonated system for building lightweight MediaWiki prototypes. I should probably give it a better name."
- [Wikipedia Boilerplate](https://github.com/Sudhanshugtm/boiler_plate) — "Rapid prototyping framework for Wikipedia UX design work."
- Amin's monorepo. You'll have to ask Amin for access :)
- [Minerva Prototypes](https://github.com/justinscherer/minerva-prototypes) — Prototyping system for reading experiences on mobile web.

### Agent skills

Skills that you can ask an AI agent to copy and use.

- [ProtoWiki Skills](https://github.com/wikimedia/ProtoWiki/blob/main/AGENTS.md) — "Skills for MediaWiki prototyping."
- [Wiki Skills](https://gitlab.wikimedia.org/santhosh/wiki-skills) — "A collection of skills for AI coding agents focused on Wikimedia projects."

### Packages

- [Codex package](https://www.npmjs.com/package/@wikimedia/codex) — The Wikimedia Codex design system. You'll want to use this!
- [FakeWiki package](https://www.npmjs.com/package/fakewiki) — Used within FakeMediaWiki, it contains methods for using various MediaWiki APIs and common prototyping patterns. Highly experimental, but you can try it out if you feel adventurous!

### References

Lists of APIs you can use within prototypes.

- [Wiki Signals](https://todepond.github.io/FakeMediaWiki/Fullscreen/WikiSignals) — "Guidance for using real MediaWiki data in prototypes."
- [FakeWiki Playground](https://todepond.github.io/FakeMediaWiki/Fullscreen/ApiPlayground) — Explore every function from the `fakewiki` package.
- [FakeWiki LLMs.txt](https://todepond.github.io/FakeMediaWiki/llms.txt) — Intended for AI agents: A list of methods and composables exported from the `fakewiki` package.
- [FakeWiki Reference](https://todepond.github.io/FakeMediaWiki/Fullscreen/FakeWikiReference) — Intended for humans: A list of methods and composables exported from the `fakewiki` package.

## Prototyping system

> [!TIP]
> Either follow these instructions, or ask an AI agent to follow them for you.

ProtoWiki's prototyping system tries to make things simpler and faster (and more on-design) by bringing you a preconfigured environment with sensible defaults. It comes with Codex installed and all the right styles for a Wikipedia-ish look. It also contains a growing collection of components and templates for commonly prototyped pages. And it does various things automatically that you'll probably need, like [deploying](#deploying-a-prototype).

There are also many skills within the repo that agents can use to navigate all of this, including how to use Codex properly, how to use ProtoWiki, how to get live data from wikis, and more.

### Getting started

To run ProtoWiki locally, click "Use as template" on this repo, then clone your copy.

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

I recommend copying one of the `template-*` prototypes as a starting point. For example, copy paste `template-chrome`, give it a new folder name, and change its title and description inside its `index.vue` file.

Trouble-shooting: If it doesn't appear at first or you see a blank screen, try restarting the dev server. If you don't know how to do this, ask a friendly human or AI agent to help you.

### Deploying a prototype

ProtoWiki gets deployed when you commit to the `main` branch.\
It's available at `[your-username].github.io/[your-copy-name]`\
For example: [wikimedia.github.io/ProtoWiki](https://wikimedia.github.io/ProtoWiki).\
You might need to enable actions within the actions tab of your repo to get this to work.

Alternatively, when you create a pull request on your copy, a preview gets deployed. Here's an [example](https://github.com/wikimedia/ProtoWiki/pull/3#issuecomment-4488446669).\
This is great because it also creates a QR code that people can use to try the prototype on their phone.

### Planned features

- Visual editor prototyping support https://github.com/wikimedia/ProtoWiki/issues/15
- Helpers for accessing real data https://github.com/wikimedia/ProtoWiki/issues/21

To see more planned work, check out the [issues](https://github.com/wikimedia/ProtoWiki/issues).

## Examples

### Prototypes

Here are some examples of ProtoWiki's prototyping system in use:

- [Codex playground](https://wikimedia.github.io/ProtoWiki/pr-preview/pr-49/example-codex-kitchen-sink): A kitchen sink for exploring all of Codex's features.
- [Suggested edits feed](https://wikimedia.github.io/ProtoWiki/pr-preview/pr-11/no-distractions?title=Jade+Thirlwall&screen=home&username=NewEditor): A remix of the Newcomer Homepage that pulls edit suggestions from the Visual Editor's "Suggestion mode" and presents them as a feed.
- [Experimental main page](https://wikimedia.github.io/ProtoWiki/pr-preview/pr-44/musical-group): A thought experiment that re-imagines the main page and how it can evolve as you save interests over time.
- [Amin's onboarding flow](https://aminalhazwani.github.io/protowiki3/pr-preview/pr-1/no-distractions?title=Curlew+sandpiper&screen=welcome&username=TestUser): A streamlined re-imagining of the welcome survey and interest picker.
- [Julieta's event worklist](https://julietafernandez23.github.io/worklists/worklist-event): A page for configuring a list of pages to edit as part of an event.
- [Eduardo's recent edit highlight](https://medied.github.io/ProtoWiki/mock-article-section-highlight): An article with a highlighted paragraph, showcasing a recent edit.
