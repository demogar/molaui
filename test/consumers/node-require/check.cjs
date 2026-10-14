// Two promises of the package boundary, checked from a consumer that installed
// the tarball and has no bundler.
//
// 1. `require('@demogar/mola-ui')` works. Jest in its default CommonJS mode,
//    and any Node script that uses `require`, resolve the `require` or
//    `default` condition; with only `import` in `exports` they failed with
//    ERR_PACKAGE_PATH_NOT_EXPORTED. The package stays ESM only: Node 22.12+
//    loads an ES module through `require()` (engines says so), and the
//    stylesheet imports are emptied by the library build, so nothing here
//    needs a loader.
//
// 2. There is one Base UI. The app installs `@base-ui/react` itself, as every
//    install line says, with the range a user would write (`^1.9.0`). When
//    Mola pinned it as a dependency, any app on a newer 1.x got a second copy
//    nested under the package, and `DirectionProvider` from Mola no longer
//    fed the Base UI that Slider, Tabs and Drawer read. The check is on paths
//    rather than object identity: `require('@base-ui/react/…')` here would
//    load Base UI's CommonJS build while Mola's ESM imports load its ESM
//    build, two module instances of one installed copy. Today 1.9.0 is both
//    the newest Base UI and the library's own pin, so a dependency would be
//    deduped here by luck; src/test/package.test.ts fails that arrangement
//    in package.json directly, and this check is what catches it in an
//    install once a newer 1.x exists.
const assert = require('node:assert/strict')
const { execFileSync } = require('node:child_process')
const { dirname, join } = require('node:path')

const mola = require('@demogar/mola-ui')
for (const name of ['Button', 'Dialog', 'DirectionProvider', 'cn']) {
  assert.equal(typeof mola[name], 'function', `require('@demogar/mola-ui').${name} is ${typeof mola[name]}`)
}

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const tree = JSON.parse(execFileSync(npm, ['ls', '@base-ui/react', '--all', '--json'], { encoding: 'utf8' }))
const versions = new Set()
;(function walk(deps = {}) {
  for (const [name, dep] of Object.entries(deps)) {
    if (name === '@base-ui/react' && dep.version) versions.add(dep.version)
    walk(dep.dependencies)
  }
})(tree.dependencies)
assert.equal(versions.size, 1, `npm ls finds ${versions.size} versions of @base-ui/react: ${[...versions].join(', ')}`)

const appCopy = dirname(require.resolve('@base-ui/react/package.json'))
const molaDir = dirname(require.resolve('@demogar/mola-ui/package.json'))
const molaCopy = dirname(require.resolve('@base-ui/react/package.json', { paths: [molaDir] }))
assert.equal(molaCopy, appCopy, `Mola resolves Base UI from ${molaCopy}, the app from ${appCopy}`)
assert.ok(!molaCopy.startsWith(join(molaDir, 'node_modules')), 'Base UI is nested under the package')

console.log(`require() ok (${Object.keys(mola).length} exports); one @base-ui/react, ${[...versions][0]}`)
