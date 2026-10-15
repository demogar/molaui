/**
 * Docs pages in both themes, because the toolbar's theme reaches them too
 * (.storybook/docs-theme.tsx): with Dark selected, the prose, the args table
 * and the system's doc blocks go dark with the examples. They once stayed
 * light while only the examples switched, and a text-only page did not
 * switch at all; nothing caught it because every visual test opened a story,
 * never a page.
 *
 * Not every page: one of each kind that renders in the page itself. An MDX
 * page with no stories runs no decorator (Introduction); an MDX page whose
 * doc blocks resolve tokens (Color); an autodocs component page with its args
 * table (Button). All 107 in two themes would be the slowest tests in the
 * suite for regressions these three already show. A pattern page is left
 * out: its examples are lazily loaded iframes, each with its own clock, and
 * their screenshots differed between two runs of the same build; the
 * behaviour test checks those frames follow the theme instead. The browser
 * audit still checks every docs page in both themes for contrast.
 */
const PAGES = [
  'mola-ui-introduction--overview',
  'foundations-color--overview',
  'components-actions-button--overview',
]
const THEMES = ['light', 'dark'] as const

/**
 * Every docs screenshot, in the order `mine()` deals them across shards. Its
 * own module so the stale-baseline check in stories.visual.ts can count these
 * files as taken without importing (and so registering) these tests.
 */
export const DOCS_SHOTS = THEMES.flatMap((theme) =>
  PAGES.map((id) => ({ theme, id, file: `docs--${id}--${theme}.png` })),
)
