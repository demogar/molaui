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
  {
    name: 'Everything (import *)',
    path: 'dist/index.js',
    import: '*',
    limit: '165 kB',
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
  {
    name: 'styles.css',
    path: 'dist/mola-ui.css',
    rolldown: false,
    limit: '17.5 kB',
  },
  {
    name: 'components.css',
    path: 'dist/mola-ui-components.css',
    rolldown: false,
    limit: '17.5 kB',
  },
]
