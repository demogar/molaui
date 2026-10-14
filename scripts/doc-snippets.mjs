// The code blocks of Getting started, as files a consumer app can compile.
//
// Getting started is the page a new user copies from, so a snippet that does
// not compile against the published package is the first thing they hit. The
// first-run audit found exactly that kind of drift: an RTL snippet that was
// half statement, half JSX, and an app root that was never written down. So
// every `tsx` block on the page names its file on its first line
// (`// main.tsx`, `// app/layout.tsx`), and scripts/consumers.mjs writes them
// into the Next.js fixture before `next build`, which type-checks the whole
// project against the installed tarball. A block under `app/` replaces the
// fixture's own file of that name, so the documented root layout is the one
// the fixture renders and the browser check runs against; every other block
// goes under `snippets/`, where the fixture's page imports the ones it
// renders and the rest are type-checked only.
//
// A `tsx` block without a file name is an error rather than skipped: skipping
// is how an uncompiled snippet would slip back in.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

export const GETTING_STARTED = resolve(import.meta.dirname, '../src/docs/getting-started.mdx')

const FENCE = /^```tsx\n([\s\S]*?)^```$/gm
const NAME = /^\/\/ ((?:app\/)?[a-z0-9-]+\.tsx?)(?::|$)/

/** Every `tsx` block of an MDX page as `{ path, code, line }`, where `path` is where it goes in the fixture. */
export function docSnippets(mdx = readFileSync(GETTING_STARTED, 'utf8')) {
  const out = []
  for (const match of mdx.matchAll(FENCE)) {
    const code = match[1]
    const line = mdx.slice(0, match.index).split('\n').length
    const name = code.split('\n', 1)[0].match(NAME)?.[1]
    if (!name) throw new Error(`getting-started.mdx:${line}: a tsx block must start with "// <file>.tsx" so the consumer fixture can compile it`)
    const path = name.startsWith('app/') ? name : `snippets/${name}`
    if (out.some((s) => s.path === path)) throw new Error(`getting-started.mdx:${line}: two blocks are both ${name}`)
    out.push({ path, code, line })
  }
  return out
}
