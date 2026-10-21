# Changelog

## [0.8.0](https://github.com/demogar/molaui/compare/v0.7.1...v0.8.0) (2026-10-21)


### Features

* **toast,number-input:** translate the words base ui says on its own ([#184](https://github.com/demogar/molaui/issues/184)) ([6df35cc](https://github.com/demogar/molaui/commit/6df35ccc1bae86c5863c8875c78dcb1f0deef494)), closes [#182](https://github.com/demogar/molaui/issues/182) [#183](https://github.com/demogar/molaui/issues/183)


### Bug Fixes

* **patterns:** keep the api key name and its badge on one line ([#177](https://github.com/demogar/molaui/issues/177)) ([ed1298b](https://github.com/demogar/molaui/commit/ed1298bcb774991a2b60b4c8186181d86066d413))
* **storybook:** make every docs contents entry scroll to its section ([#179](https://github.com/demogar/molaui/issues/179)) ([ba5e094](https://github.com/demogar/molaui/commit/ba5e0946e790ef0a3893b7effcec99bf64183833))


### Documentation

* **whats-new:** add the 0.8 page and fail the pr that starts a minor without one ([#185](https://github.com/demogar/molaui/issues/185)) ([bc1a466](https://github.com/demogar/molaui/commit/bc1a466508bbe7383a17d645fff902cb85056783))

## [0.7.1](https://github.com/demogar/molaui/compare/v0.7.0...v0.7.1) (2026-10-15)


### Bug Fixes

* **side-by-side-diff:** stop the panes' scroll sync undoing the reader's scrolling ([#173](https://github.com/demogar/molaui/issues/173)) ([f350a81](https://github.com/demogar/molaui/commit/f350a819eafa626ec11dfb2c70b0cf939d23f21c))
* **stories:** point demo links at the cayuco host their cards show ([#172](https://github.com/demogar/molaui/issues/172)) ([e5f8eea](https://github.com/demogar/molaui/commit/e5f8eea4557709fcf4f873ed948731c71cbc74c0))
* **storybook:** keep anatomy pins apart and off the component's text ([#174](https://github.com/demogar/molaui/issues/174)) ([2fc5018](https://github.com/demogar/molaui/commit/2fc5018e41659d2be99a422a3111537cef1d0230))


### Documentation

* link the credit to demogar.com and name who started the system ([#171](https://github.com/demogar/molaui/issues/171)) ([7d11973](https://github.com/demogar/molaui/commit/7d1197337a08c985b7f311a67962456a00e80736))
* **whats-new:** add the 0.7 page ([#169](https://github.com/demogar/molaui/issues/169)) ([152c915](https://github.com/demogar/molaui/commit/152c9158066b4c874217ababa7a27380fb01952b))

## [0.7.0](https://github.com/demogar/molaui/compare/v0.6.0...v0.7.0) (2026-10-15)


### ⚠ BREAKING CHANGES

* one prop vocabulary, open prop bags, router links and one controllable hook ([#146](https://github.com/demogar/molaui/issues/146))
* close small api and token defects (toast timeout, sparkline, keys, variant nulls, forced colours, browser floor) ([#128](https://github.com/demogar/molaui/issues/128))
* close the wave-0 p1 defects (release gate, check:all, focus ring, overlay keys, prop merging) ([#122](https://github.com/demogar/molaui/issues/122))
* **tokens:** a consumer importing @demogar/mola-ui/tailwind.css into their own Tailwind build loses Tailwind's default palette, radii, shadows, easings, animations, line heights, tracking, font families and container steps above 5xl. max-w-prose is replaced by max-w-reading. The token file's value shapes changed to DTCG 2025.10.
* **package:** @base-ui/react is a peer dependency. npm 7+ and pnpm 8+ install it automatically; under yarn or pnpm with auto-install-peers off, add @base-ui/react ^1.9.0 to the app, as every install line already says.

### Features

* add form, form error summary, fieldset and stepper ([#157](https://github.com/demogar/molaui/issues/157)) ([491a84e](https://github.com/demogar/molaui/commit/491a84e8b579aeb9ff0594011bde263fa6c9413b))
* add link and link button, and localisable built-in strings ([#163](https://github.com/demogar/molaui/issues/163)) ([583a1d1](https://github.com/demogar/molaui/commit/583a1d1678d5a0ce25778ba27db6ce6a3a836587))
* add listbox, tag group and tree ([#153](https://github.com/demogar/molaui/issues/153)) ([6db099b](https://github.com/demogar/molaui/commit/6db099b939b904ad3d767e7fdd19c3b7ab60feda))
* add relativetime, timepicker and datetimepicker ([#154](https://github.com/demogar/molaui/issues/154)) ([ec03a95](https://github.com/demogar/molaui/commit/ec03a953c3d6ab26ad4d2c7a989f39fc1f1f7802))
* **data-table:** add virtual rows, column resize, row expansion, a frozen first column and rows on a phone ([#161](https://github.com/demogar/molaui/issues/161)) ([387bb5b](https://github.com/demogar/molaui/commit/387bb5b35b64544f14bef0ef4fcc07875f459b81))
* **eslint:** ship the check_code rules as @demogar/mola-ui/eslint ([#147](https://github.com/demogar/molaui/issues/147)) ([7d133cd](https://github.com/demogar/molaui/commit/7d133cd398cb904a51bc97aea1de4072fb93f5fe))
* **figma:** add a figma kit plugin generated from the tokens and the manifest ([#165](https://github.com/demogar/molaui/issues/165)) ([3e126c5](https://github.com/demogar/molaui/commit/3e126c59d45fbd916cd58d62006485f4438c317c))
* **markdown,side-by-side-diff:** add a streaming markdown renderer that keeps citations, and a side-by-side diff ([#158](https://github.com/demogar/molaui/issues/158)) ([6fe2922](https://github.com/demogar/molaui/commit/6fe2922b08230eb4becac6db0ccf52495331c45a))
* **mcp:** brief get_component, job-aware search and llms-rules.txt ([#138](https://github.com/demogar/molaui/issues/138)) ([782f3cc](https://github.com/demogar/molaui/commit/782f3cce48ee6ac74a40fe669f1c3b34703672e3)), closes [#95](https://github.com/demogar/molaui/issues/95)
* one prop vocabulary, open prop bags, router links and one controllable hook ([#146](https://github.com/demogar/molaui/issues/146)) ([c493d04](https://github.com/demogar/molaui/commit/c493d04937f3949120112cd4f3139fd916e2baf5))
* one vocabulary for pressed and disabled, a button states matrix, and hard-states stories ([#162](https://github.com/demogar/molaui/issues/162)) ([0408e77](https://github.com/demogar/molaui/commit/0408e778f8813e058631c615ac7a3b32fe5b4729))
* **patterns:** show every pattern state in a story, and move the agent console and form example under patterns ([#160](https://github.com/demogar/molaui/issues/160)) ([2aec7f2](https://github.com/demogar/molaui/commit/2aec7f22c5ae9b680d553c6fdaf8f82a4f02df38))
* **shell:** add a banner, a notification centre, and a shortcuts dialog with usehotkeys ([#156](https://github.com/demogar/molaui/issues/156)) ([f262538](https://github.com/demogar/molaui/commit/f2625389d01e97336bd344dc6d9f7f1f20668e3b))
* ship vs code snippets, and add a codemod index, a proposal template and a roadmap page ([#148](https://github.com/demogar/molaui/issues/148)) ([e22cbfb](https://github.com/demogar/molaui/commit/e22cbfbff23f8abd15658f58142de128151143af))
* **styles:** add components.css for existing apps and document the first-run setup, with counts generated from the source ([#126](https://github.com/demogar/molaui/issues/126)) ([97618c5](https://github.com/demogar/molaui/commit/97618c58df452e179899ac26b4491ec3e3fc1892))
* **tokens:** name the edges, stacking, glyphs and type pairs, and hold rojo to the danger role ([#139](https://github.com/demogar/molaui/issues/139)) ([6737f9b](https://github.com/demogar/molaui/commit/6737f9bfc052532c130a84b2b5e0f694957fdfe6))


### Bug Fixes

* **a11y:** name popup listboxes, keep the asterisk out of names, and reflow every story at spacious 320px ([#152](https://github.com/demogar/molaui/issues/152)) ([81ec7c0](https://github.com/demogar/molaui/commit/81ec7c08c1159afe575c06f327a9f068e8dbd7b0))
* **ai:** render clocks after hydration and test toast timers and thread scrolling ([#125](https://github.com/demogar/molaui/issues/125)) ([b971920](https://github.com/demogar/molaui/commit/b9719204607b3c0413a5a9d629cdce96221be01e))
* **badge:** give every status tone its own shape and close the small accessibility defects ([#133](https://github.com/demogar/molaui/issues/133)) ([b43be94](https://github.com/demogar/molaui/commit/b43be942c8ad35a2a382a11c96340082ac5dda20))
* close small api and token defects (toast timeout, sparkline, keys, variant nulls, forced colours, browser floor) ([#128](https://github.com/demogar/molaui/issues/128)) ([2dd0060](https://github.com/demogar/molaui/commit/2dd0060ceab2b18d6fc832036f638c01e2997a84))
* close the wave-0 p1 defects (release gate, check:all, focus ring, overlay keys, prop merging) ([#122](https://github.com/demogar/molaui/issues/122)) ([9f36126](https://github.com/demogar/molaui/commit/9f3612621d656963502c9bad3d882cd0cea065c2))
* **command:** name groups by index-based ids and announce result counts ([#120](https://github.com/demogar/molaui/issues/120)) ([5a92ac1](https://github.com/demogar/molaui/commit/5a92ac1285260530f5ae777de4ed644ad1c271bf))
* **docs:** make docs pages follow the toolbar theme and take rojo out of the chrome ([#135](https://github.com/demogar/molaui/issues/135)) ([633c5eb](https://github.com/demogar/molaui/commit/633c5eb5e357a553708acec062988ba6da68905f))
* **docs:** parse every changelog section and scope the 0.7.0 release writes ([#141](https://github.com/demogar/molaui/issues/141)) ([38c5270](https://github.com/demogar/molaui/commit/38c5270fb737ea91a29c4412024a0874d9b989e6))
* **figma:** fall back to single-mode collections on figma's starter plan ([#167](https://github.com/demogar/molaui/issues/167)) ([fced51f](https://github.com/demogar/molaui/commit/fced51f6146f0cb7f465082aab46c18072b0d9d3)), closes [#118](https://github.com/demogar/molaui/issues/118)
* **layout:** reflow at 320px and spacious density, with a scroll-edge cue and an audit gate ([#129](https://github.com/demogar/molaui/issues/129)) ([feec088](https://github.com/demogar/molaui/commit/feec0889c00e8e77c2a2aab43f41d78fe7ea03a1))
* **package:** take base ui as a peer dependency, resolve require() and regenerate the api report on dependabot bumps ([#121](https://github.com/demogar/molaui/issues/121)) ([61db69f](https://github.com/demogar/molaui/commit/61db69f2a3ab408e11fa06832d418be562eec36d))
* **patterns:** drop the hand-off message's seam under the card heading ([#132](https://github.com/demogar/molaui/issues/132)) ([dd867bc](https://github.com/demogar/molaui/commit/dd867bc7da8729175cbd6b9a5e147568b30b9cf7))
* **shortcuts,kbd,command,tooltip,menu,field:** keep keyboard shortcuts left to right in a right-to-left page ([#166](https://github.com/demogar/molaui/issues/166)) ([f0c5ef2](https://github.com/demogar/molaui/commit/f0c5ef2502d4e5bda0878ebcc87b436dd1a56a35))
* **storybook:** let changelog entries with several scopes wrap on a phone ([#168](https://github.com/demogar/molaui/issues/168)) ([ead8b26](https://github.com/demogar/molaui/commit/ead8b2655a661b57f07e2ea4e830a4028abf2673))
* **table:** stop the bulk bar clipping its actions' cut and focus ring ([#131](https://github.com/demogar/molaui/issues/131)) ([0f0e5a3](https://github.com/demogar/molaui/commit/0f0e5a3edc36e52a56cf84610e4e8c459050de0c))
* **tokens:** close tailwind's default namespaces and make the dtcg export valid ([#123](https://github.com/demogar/molaui/issues/123)) ([a170ddc](https://github.com/demogar/molaui/commit/a170ddc98447ff457bc3a06ab00adce77bd780a4))


### Performance

* drop tailwind-merge from the bundle and cut layout transitions, shimmers and table restyles ([#137](https://github.com/demogar/molaui/issues/137)) ([921d577](https://github.com/demogar/molaui/commit/921d577a8a75265dc447a586190e2b1c4df3238e))


### Documentation

* **components:** document every public prop and fail the manifest on an undocumented one ([#149](https://github.com/demogar/molaui/issues/149)) ([f97ccc2](https://github.com/demogar/molaui/commit/f97ccc274f1a7df10b0defd84b2ec23c8ed987b9))
* **foundations:** add theming, responsive, data visualisation and migration pages, and reorder getting started ([#151](https://github.com/demogar/molaui/issues/151)) ([333fb5b](https://github.com/demogar/molaui/commit/333fb5bc51fc943170ad7ff141c494dc2ef97891))

## [0.6.0](https://github.com/demogar/molaui/compare/v0.5.0...v0.6.0) (2026-10-14)


### Features

* **mcp:** add a check_code tool that reviews generated ui against the design rules ([#50](https://github.com/demogar/molaui/issues/50)) ([bef0861](https://github.com/demogar/molaui/commit/bef08615fdfb8cdb79fad650558baab75b87810c))
* **tokens:** scope colour tokens and publish the pairings they promise ([#49](https://github.com/demogar/molaui/issues/49)) ([47b1ff4](https://github.com/demogar/molaui/commit/47b1ff49977aa52290a07557761c237c0278428a))


### Bug Fixes

* **tokens:** measure every surface that carries text and fix the disabled states that failed ([f0538d5](https://github.com/demogar/molaui/commit/f0538d50ecacd3eb5c55796b8eecc36134fe934e))

## [0.5.0](https://github.com/demogar/molaui/compare/v0.4.0...v0.5.0) (2026-10-14)


### Features

* **dialog:** add an error slot and finalFocus to alert dialog ([#34](https://github.com/demogar/molaui/issues/34)) ([2bda349](https://github.com/demogar/molaui/commit/2bda3494f5dab6d8c9d8a902d751635333189e8f))
* **docs:** add per-component changes and curated what's new pages ([#36](https://github.com/demogar/molaui/issues/36)) ([816e177](https://github.com/demogar/molaui/commit/816e1778c1ba26bb25b785845a062a3665fb7a5e))
* **mcp:** ship a read-only mola-ui-mcp server over the agent docs ([#44](https://github.com/demogar/molaui/issues/44)) ([918e428](https://github.com/demogar/molaui/commit/918e428f5450050fa1ae10d7467106cae237bde1))


### Bug Fixes

* **docs:** declare the new changelog scopes that are not components ([#48](https://github.com/demogar/molaui/issues/48)) ([b8d055a](https://github.com/demogar/molaui/commit/b8d055a9924946634313624a9f6a841bac4cbe3d))
* **docs:** regenerate agent docs after the table fix ([#43](https://github.com/demogar/molaui/issues/43)) ([0550401](https://github.com/demogar/molaui/commit/05504013aec90083b1dde0d5608e6f9da2c01358))
* **storybook:** reload once when a deploy removed the story chunk ([#37](https://github.com/demogar/molaui/issues/37)) ([739d9e9](https://github.com/demogar/molaui/commit/739d9e932727129c81bc0e4b06ed46612e180c58))
* **table:** centre the empty row on the visible frame, not the whole table ([#39](https://github.com/demogar/molaui/issues/39)) ([54f9aca](https://github.com/demogar/molaui/commit/54f9aca160de9a1176eee2840f1e1dfc0dde6cec))


### Documentation

* **ai:** split llms files by topic, add markdown twins and copy for llm ([#35](https://github.com/demogar/molaui/issues/35)) ([6bc05a0](https://github.com/demogar/molaui/commit/6bc05a073c49cd3ec7a885bae09832c9ae90b8b5))
* **foundations:** show layers side by side in both themes ([#33](https://github.com/demogar/molaui/issues/33)) ([4dac4c5](https://github.com/demogar/molaui/commit/4dac4c54456f1d9a95972855aafdc2ba37812d9e))
* **known-gaps:** drop gaps closed by the foundations, anatomy and changes work ([#46](https://github.com/demogar/molaui/issues/46)) ([8c06fa8](https://github.com/demogar/molaui/commit/8c06fa8d98378b7f6dd6f55c25acaef5283e3635))

## [0.4.0](https://github.com/demogar/molaui/compare/v0.3.0...v0.4.0) (2026-10-13)


### Features

* **callout:** add a flat variant and a swatch colour key ([#20](https://github.com/demogar/molaui/issues/20)) ([fc8a390](https://github.com/demogar/molaui/commit/fc8a390ee8206dcd1d059e30fc90c5c2bd4c2447))
* **docs:** add anatomy diagrams measured from the live component ([#25](https://github.com/demogar/molaui/issues/25)) ([f24a7f0](https://github.com/demogar/molaui/commit/f24a7f0320388cbe669cfdb21c98a82df6223749))


### Bug Fixes

* **docs:** read every :root rule in the token table ([#31](https://github.com/demogar/molaui/issues/31)) ([02cf9c7](https://github.com/demogar/molaui/commit/02cf9c7afa0b3010fede9eb7bf4434d9387c5043))
* **theme:** make nested data-theme subtrees re-theme in built css ([#28](https://github.com/demogar/molaui/issues/28)) ([27dcae9](https://github.com/demogar/molaui/commit/27dcae9d6e798e452195bc06e6c3f6dde64c7037))


### Documentation

* add lifecycle labels, accessibility sections and a known gaps page ([#22](https://github.com/demogar/molaui/issues/22)) ([0691ad1](https://github.com/demogar/molaui/commit/0691ad1be082ad6f960f327203f2762ff4114651))
* **foundations:** add spacing, layers, content and token pages ([#27](https://github.com/demogar/molaui/issues/27)) ([71a6f2d](https://github.com/demogar/molaui/commit/71a6f2d804675f2e8bb6d7efc4d726205b7d52ba))
* **patterns:** add guidance, used-in links and three new patterns ([#26](https://github.com/demogar/molaui/issues/26)) ([fe06943](https://github.com/demogar/molaui/commit/fe06943baaf4c0ca8fe6dd8fa012aa926e7b1731))
* surface architecture decisions in storybook ([#24](https://github.com/demogar/molaui/issues/24)) ([b79c1ac](https://github.com/demogar/molaui/commit/b79c1acf1d44515bd1524affa7aee60a874793a6))

## [0.3.0](https://github.com/demogar/molaui/compare/v0.2.0...v0.3.0) (2026-10-06)


### Features

* **ai:** add change approval, citation cards and run recovery ([#13](https://github.com/demogar/molaui/issues/13)) ([a15d16e](https://github.com/demogar/molaui/commit/a15d16e46239c37691aeb14d513077958ecae62f))


### Bug Fixes

* make components consistent with their own rules and docs ([#16](https://github.com/demogar/molaui/issues/16)) ([1c9e8db](https://github.com/demogar/molaui/commit/1c9e8dbdd6e1b46d1cde573c6f5ef895d331c7ba))


### Documentation

* add usage guidance, versioning policy, patterns and agent-readable docs ([#15](https://github.com/demogar/molaui/issues/15)) ([986dfe7](https://github.com/demogar/molaui/commit/986dfe7dde0aef643fd0be91ade865c1f84db65c))

## [0.2.0](https://github.com/demogar/molaui/compare/v0.1.0...v0.2.0) (2026-10-06)


### Features

* **components:** add combobox, date pickers, number input, file upload, skeleton, drawer, toolbar and data table features ([#11](https://github.com/demogar/molaui/issues/11)) ([aeacb52](https://github.com/demogar/molaui/commit/aeacb52f1b4212e472d3f4cc9aa984bfd760528a))


### Bug Fixes

* **a11y:** keep edges in forced-colors mode and support right-to-left ([#10](https://github.com/demogar/molaui/issues/10)) ([4c26c9d](https://github.com/demogar/molaui/commit/4c26c9d2d995267c0b6ef6ae9e499b365eedb67a))


### Documentation

* explain the name with care, credit design that scales, show the work first ([#7](https://github.com/demogar/molaui/issues/7)) ([74da747](https://github.com/demogar/molaui/commit/74da747c1fe17a6f563ee02ccac84dad5cf930ac))
* replace the headerless readme table with a list ([#9](https://github.com/demogar/molaui/issues/9)) ([a2c01b3](https://github.com/demogar/molaui/commit/a2c01b3b7a6eda0141ee0e79296eebe091a8c1d6))
* state authorship plainly and fix the agent console link ([#5](https://github.com/demogar/molaui/issues/5)) ([28acf39](https://github.com/demogar/molaui/commit/28acf398d36a22432f1dcbfaebb87fa29de9e1a6))

## 0.1.0 (2026-10-05)

First public release.

### Features

* **tokens:** two themes in one declaration (`light-dark()`), three densities, a contrast contract test, and a DTCG export for Figma
* **components:** actions, forms, overlays, feedback, navigation, data display and an application shell
* **ai:** streaming text, threads, a composer, tool calls with approval, an agent run timeline, reasoning, citations, token usage and confidence
* extracted from the Mola design system of mustdopanama.com and re-argued for product density
