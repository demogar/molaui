import { toPx } from './css-block'

/**
 * What Foundations/Responsive says about the viewport breakpoints and the
 * container steps. The values are read from theme.css; only what the CSS
 * cannot say is written here.
 *
 * BREAKPOINT_USES is which shipped components respond to each breakpoint.
 * foundations.test.tsx scans src/components for the variant prefixes and
 * fails when this list and the source disagree, so "nothing uses xl" stays
 * true or the page changes with it.
 */
export const BREAKPOINT_USES: Record<string, string[]> = {
  sm: [
    'ai/change-review/change-review.tsx',
    'ai/prompt-input/prompt-input.tsx',
    'ai/sources/sources.tsx',
    'ai/token-usage/token-usage.tsx',
    'app-shell/app-shell.tsx',
    'app-shell/page-header.tsx',
    'banner/banner.tsx',
    'date-picker/calendar.tsx',
    'date-picker/date-range-picker.tsx',
    'description-list/description-list.tsx',
    'layout/container.tsx',
    'layout/grid.tsx',
    'layout/section.tsx',
    'timeline/timeline.tsx',
    'toast/toast.tsx',
  ],
  md: ['layout/grid.tsx'],
  nav: ['app-shell/app-shell.tsx'],
  lg: ['layout/container.tsx', 'layout/grid.tsx', 'layout/section.tsx'],
  xl: [],
  '2xl': [],
}

/** What each breakpoint is for, in a line. */
export const BREAKPOINT_JOBS: Record<string, string> = {
  sm: 'A phone ends here. Below it, parts that sat side by side stack: a description list puts each term above its value, the date range presets move above the calendar, toasts span the screen, and calendar days shrink to fit.',
  md: 'Two columns of form or detail fit.',
  nav: 'The application shell keeps its sidebar. Below it, the sidebar becomes a sheet behind a menu button.',
  lg: 'A grid takes its full column count, and page gutters reach their widest.',
  xl: 'Declared so a screen can use it. No component does.',
  '2xl': 'Declared so a screen can use it. No component does.',
}

export interface StepRow {
  /** The variant or utility suffix: `sm`, `nav`, `page`. */
  name: string
  value: string
  px: number | null
}

/** The `--<prefix>-*` entries of a theme block, smallest first; `initial` resets skipped. */
export function scaleRows(theme: Map<string, string>, prefix: 'breakpoint' | 'container'): StepRow[] {
  return [...theme]
    .filter(([name, value]) => name.startsWith(`--${prefix}-`) && value !== 'initial' && !name.endsWith('-*'))
    .map(([name, value]) => ({ name: name.slice(prefix.length + 3), value, px: toPx(value) }))
    .sort((a, b) => (a.px ?? Infinity) - (b.px ?? Infinity))
}

/** `layout/grid.tsx` → `Grid`, `app-shell/page-header.tsx` → `Page header`. */
export function componentName(file: string) {
  const base = file.split('/').pop()!.replace(/\.tsx?$/, '').replace(/-/g, ' ')
  return base.charAt(0).toUpperCase() + base.slice(1)
}
