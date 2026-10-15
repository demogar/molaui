/**
 * The icons the kit's components draw, read from lucide-react's own icon data
 * so a Figma icon is the same paths the code renders. lucide-react is already
 * a runtime dependency (ISC), and the plugin carries the paths, not the package.
 *
 * Each becomes a component named `Icon/<export name>`, the name a developer
 * imports from lucide-react, and the instance-swap slots offer them first.
 * The stroke is written as a CSS keyword rather than a colour value: the
 * plugin rebinds every vector to a Color variable, as `currentColor` does.
 */
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'

import type { IconSpec } from './spec'

/** Export name -> lucide's file name. Order is the order they are drawn. */
export const ICONS: Record<string, string> = {
  Plus: 'plus',
  ArrowRight: 'arrow-right',
  Check: 'check',
  Minus: 'minus',
  ChevronsUpDown: 'chevrons-up-down',
  Search: 'search',
  X: 'x',
  Info: 'info',
  CircleCheck: 'circle-check',
  TriangleAlert: 'triangle-alert',
  CircleAlert: 'circle-alert',
}

type IconNode = [string, Record<string, string | number>][]

const require = createRequire(import.meta.url)

/**
 * Reads `node: [...]` out of the icon's ES module. Importing it would make the
 * build asynchronous for no gain, and the CommonJS build is one bundle with no
 * per-icon data. The literal is plain arrays, strings and bare keys, so quoting
 * the keys makes it JSON; path data never contains a colon.
 */
function iconNode(file: string): IconNode {
  const source = readFileSync(require.resolve(`lucide-react/dist/esm/icons/${file}.mjs`), 'utf8')
  const start = source.indexOf('node: [')
  if (start < 0) throw new Error(`lucide-react has no icon data for ${file}`)
  let depth = 0
  let end = start + 6
  for (; end < source.length; end++) {
    if (source[end] === '[') depth++
    else if (source[end] === ']' && --depth === 0) break
  }
  const literal = source.slice(start + 6, end + 1).replace(/([{,]\s*)([a-z][\w-]*)\s*:/g, '$1"$2":')
  return JSON.parse(literal) as IconNode
}

function svgOf(node: IconNode): string {
  const children = node
    .map(([tag, attrs]) => {
      const a = Object.entries(attrs)
        .filter(([k]) => k !== 'key')
        .map(([k, v]) => `${k}="${String(v)}"`)
        .join(' ')
      return `<${tag} ${a}/>`
    })
    .join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${children}</svg>`
}

export function buildIcons(): IconSpec[] {
  return Object.entries(ICONS).map(([name, file]) => {
    return {
      name: `Icon/${name}`,
      svg: svgOf(iconNode(file)),
      description: `import { ${name} } from 'lucide-react'. Drawn at 24px with a 2px stroke, as lucide ships it; size it with an icon variable.`,
    }
  })
}
