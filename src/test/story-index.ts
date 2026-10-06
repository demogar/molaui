import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

import { isExportStory } from 'storybook/internal/csf'

import { docsId, storyId } from '../docs/usage/links'

/**
 * The ids Storybook will assign, computed from the sources rather than from a
 * running Storybook, so the link check runs in the unit suite: one docs page
 * per stories title (autodocs) and per MDX page, and one id per story.
 */
type StoryModule = { default: { title: string } } & Record<string, unknown>
const modules = import.meta.glob<StoryModule>('../**/*.stories.tsx', { eager: true })

export const repoRoot = resolve(import.meta.dirname, '../..')

export function walk(dir: string, test: (name: string) => boolean): string[] {
  return readdirSync(dir).flatMap((name) => {
    if (name === 'node_modules' || name.startsWith('.')) return []
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return walk(path, test)
    return test(name) ? [path] : []
  })
}

export const storyTitles = Object.values(modules).map((mod) => mod.default.title)

export const mdxTitles = walk(join(repoRoot, 'src'), (name) => name.endsWith('.mdx')).flatMap((path) => {
  const title = readFileSync(path, 'utf8').match(/<Meta\s+title="([^"]+)"/)?.[1]
  return title ? [title] : []
})

export const knownIds = new Set([
  ...[...storyTitles, ...mdxTitles].map(docsId),
  ...Object.values(modules).flatMap((mod) =>
    Object.keys(mod)
      .filter((key) => key !== 'default' && isExportStory(key, mod.default as never))
      .map((key) => storyId(mod.default.title, key)),
  ),
])
