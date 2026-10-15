import { create } from 'storybook/theming'

/**
 * Storybook's own chrome, dressed in the system it documents. Values are
 * literals because the manager runs outside the library's stylesheet (its
 * bundler has no `?raw` import to resolve tokens.css with). They are the
 * tokens from src/styles/tokens.css and nothing else, keyed by token name so
 * src/docs/storybook-chrome.test.ts can resolve each one and fail on drift.
 */
export const CHROME_PALETTES = {
  light: {
    '--cloth': '#edeee8',
    '--cloth-pale': '#f6f7f2',
    '--cloth-shade': '#e4e7dc',
    '--ink': '#14161a',
    '--ink-2': '#3d4147',
    '--ink-muted': '#5e636a',
    '--keyline': '#c6cabc',
  },
  dark: {
    '--cloth': '#16181c',
    '--cloth-pale': '#1e2126',
    '--cloth-shade': '#111316',
    '--ink': '#eceee6',
    '--ink-2': '#c4c8bd',
    '--ink-muted': '#9a9f97',
    '--keyline': '#3a3f46',
  },
} as const

/**
 * Selection is ink, as the primary action is (ADR 0002): the chrome used to
 * mark the selected story, the active tab, links and focus in rojo, which
 * spent the one colour that means "this can be lost" on the most ordinary
 * thing in the interface.
 *
 * Hover is ink too, one step up from the resting ink-2. The audit suggested
 * oro, but Storybook's `barHoverColor` is a text colour, and gold is never
 * text on light cloth (1.66:1, see tokens.css): in the system, hover reveals
 * gold as a field beneath a shape, which Storybook's theme has no slot for.
 */
function chrome(base: 'light' | 'dark') {
  const p = CHROME_PALETTES[base]
  return create({
    base,
    brandTitle: 'Mola UI',
    brandUrl: './',
    brandImage: './mola-ui-wordmark.svg',
    brandTarget: '_self',

    fontBase: "'Archivo Variable', 'Archivo', system-ui, sans-serif",
    fontCode: "'Martian Mono Variable', ui-monospace, monospace",

    colorPrimary: p['--ink'],
    colorSecondary: p['--ink'],

    appBg: p['--cloth'],
    appContentBg: p['--cloth-pale'],
    appPreviewBg: p['--cloth'],
    appBorderColor: p['--keyline'],
    appBorderRadius: 0,

    textColor: p['--ink'],
    textInverseColor: p['--cloth-pale'],
    textMutedColor: p['--ink-muted'],

    barTextColor: p['--ink-2'],
    barHoverColor: p['--ink'],
    barSelectedColor: p['--ink'],
    barBg: p['--cloth-pale'],

    buttonBg: p['--cloth-pale'],
    buttonBorder: p['--ink'],
    booleanBg: p['--cloth-shade'],
    booleanSelectedBg: p['--ink'],

    inputBg: p['--cloth-pale'],
    inputBorder: p['--ink'],
    inputTextColor: p['--ink'],
    inputBorderRadius: 0,
  })
}

/** The manager (sidebar, toolbar, addon panel) and the light docs pages. */
export const molaTheme = chrome('light')

/** Docs pages while the toolbar's theme is dark (see docs-theme.tsx). */
export const molaDarkTheme = chrome('dark')
