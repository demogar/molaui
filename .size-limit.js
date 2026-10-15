// Bundle budgets, set from measurements with about ten per cent headroom.
//
// A JS file rather than .size-limit.json because of one function. size-limit
// always marks a package's peerDependencies as external, so when
// @base-ui/react became a peer (one copy shared with the app instead of a
// pinned second copy) the "Everything" figure fell from 158 kB to 58 kB: the
// budget had stopped measuring the Base UI code Mola's components pull in,
// and a change that imported twice as much of it would have passed. React is
// left out, as it always was; Base UI stays in, because how much of it the
// components use is Mola's doing.
const reactOnly = (config) => ({ ...config, external: /^(react|react-dom)($|\/)/ })

export default [
  // The whole library, so it grows with every component added, and is raised
  // in a commit of its own with the measurement. 165 kB (#137) was set with
  // no room for the audit's wave of new components: main measured 162.6 kB
  // when Listbox, Tag group, Tree and the time pickers had landed, and the
  // form primitives and the Markdown renderer each crossed it alone. The two
  // small entries below are what a consumer pays and the real guard on bloat;
  // they do not move with this one. 182 kB (#133): the shape glyphs of six
  // status tones, the tooltip's spoken key names and the held-open headers
  // took the library from under 180 kB to 180.36 kB.
  {
    name: 'Everything (import *)',
    path: 'dist/index.js',
    import: '*',
    limit: '182 kB',
    modifyRolldownConfig: reactOnly,
  },
  {
    name: 'Button + Field (tree-shaken)',
    path: 'dist/index.js',
    import: '{ Button, Field }',
    limit: '10.25 kB',
    modifyRolldownConfig: reactOnly,
  },
  // Every component pays for cn(), so it gets a budget of its own. With
  // tailwind-merge behind it this was 8 kB, 63 per cent of the smallest
  // import; src/lib/merge.ts replaced it. A merger growing back towards that
  // size should be a decision, not a drift.
  {
    name: 'cn (the class merger)',
    path: 'dist/index.js',
    import: '{ cn }',
    limit: '4.5 kB',
    modifyRolldownConfig: reactOnly,
  },
  // The stylesheets grow with the components too, and are raised the same
  // way. 17.5 kB left no room for the audit's third wave: main measured
  // 17.33 kB once the Markdown renderer and the side-by-side diff had
  // landed, and DataTable's long-table features (#104) add 0.39 kB, most of
  // it the stacked phone layout's container-query rules. Both files carry
  // the same components, so they move together, to the larger one's figure
  // plus ten per cent.
  {
    name: 'styles.css',
    path: 'dist/mola-ui.css',
    rolldown: false,
    limit: '19.5 kB',
  },
  {
    name: 'components.css',
    path: 'dist/mola-ui-components.css',
    rolldown: false,
    limit: '19.5 kB',
  },
]
