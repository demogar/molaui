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
    limit: '170 kB',
    modifyRolldownConfig: reactOnly,
  },
  {
    name: 'Button + Field (tree-shaken)',
    path: 'dist/index.js',
    import: '{ Button, Field }',
    limit: '15 kB',
    modifyRolldownConfig: reactOnly,
  },
  {
    name: 'styles.css',
    path: 'dist/mola-ui.css',
    rolldown: false,
    limit: '17.5 kB',
  },
]
