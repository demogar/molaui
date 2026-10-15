/**
 * The tokens and the manifest -> the Figma kit plugin.
 *
 *   figma/plugin/code.js        the plugin the owner runs in Figma: its runtime
 *                               (figma/src/plugin.ts) with the kit's data inlined
 *   figma/component-map.json    every component export, built in Figma or pending
 *
 * Both are derived and committed, like tokens/mola.tokens.json: the plugin is
 * imported into Figma from a checkout, with no build step on the designer's
 * side, and the map is read by people deciding what to draw next. The REST
 * API cannot create components and its Variables endpoints need an Enterprise
 * plan, so the kit is a plugin a person runs, and this script is how the code
 * keeps it honest. figma/src/build.test.ts rebuilds both in the unit suite and
 * fails when either is stale; `--check` does the same for `npm run check`.
 *
 *   npm run figma          writes them
 *   npm run figma:check    fails if either is stale (CI)
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { buildKit, renderCode, renderMap } from '../figma/src/build'

const root = resolve(import.meta.dirname, '..')
const read = (path: string) => readFileSync(resolve(root, path), 'utf8')

export const OUT = { code: 'figma/plugin/code.js', map: 'figma/component-map.json' } as const

export function generate() {
  const kit = buildKit(JSON.parse(read('tokens/mola.tokens.json')), JSON.parse(read('docs/ai/components.json')))
  return { kit, code: renderCode(read('figma/src/plugin.ts'), kit.data), map: renderMap(kit.map) }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { kit, code, map } = generate()
  if (process.argv.includes('--check')) {
    const stale = Object.entries({ [OUT.code]: code, [OUT.map]: map }).filter(([path, text]) => {
      try {
        return read(path) !== text
      } catch {
        return true
      }
    })
    if (stale.length) {
      console.error(`Stale: ${stale.map(([path]) => path).join(', ')}. Run \`npm run figma\` and commit the result.`)
      process.exit(1)
    }
    console.log('The Figma kit plugin is up to date.')
  } else {
    writeFileSync(resolve(root, OUT.code), code)
    writeFileSync(resolve(root, OUT.map), map)
    const entries = Object.values(kit.map.components)
    const built = entries.filter((e) => e.status === 'built').length
    const variables = kit.data.collections.reduce((n, c) => n + c.variables.length, 0)
    console.log(
      `Wrote ${OUT.code} and ${OUT.map}: ${variables} variables in ${kit.data.collections.length} collections, ${kit.data.effectStyles.length} effect styles, ` +
        `${kit.data.components.length} components (${kit.data.components.reduce((n, c) => n + c.variants.length, 0)} variants); ${built} of ${entries.length} exports built, ${entries.length - built} pending.`,
    )
  }
}
