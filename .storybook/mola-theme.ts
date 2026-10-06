import { create } from 'storybook/theming'

/**
 * Storybook's own chrome, dressed in the system it documents. Values are
 * literals because the manager runs outside the library's stylesheet; they are
 * the light-theme tokens from src/styles/tokens.css, and nothing else.
 */
export const molaTheme = create({
  base: 'light',
  brandTitle: 'Mola UI',
  brandUrl: './',
  brandImage: './mola-ui-wordmark.svg',
  brandTarget: '_self',

  fontBase: "'Archivo Variable', 'Archivo', system-ui, sans-serif",
  fontCode: "'Martian Mono Variable', ui-monospace, monospace",

  colorPrimary: '#c0272d',
  colorSecondary: '#c0272d',

  appBg: '#edeee8',
  appContentBg: '#f6f7f2',
  appPreviewBg: '#edeee8',
  appBorderColor: '#c6cabc',
  appBorderRadius: 0,

  textColor: '#14161a',
  textInverseColor: '#f6f7f2',
  textMutedColor: '#5e636a',

  barTextColor: '#3d4147',
  barHoverColor: '#c0272d',
  barSelectedColor: '#c0272d',
  barBg: '#f6f7f2',

  buttonBg: '#f6f7f2',
  buttonBorder: '#14161a',
  booleanBg: '#e4e7dc',
  booleanSelectedBg: '#14161a',

  inputBg: '#f6f7f2',
  inputBorder: '#14161a',
  inputTextColor: '#14161a',
  inputBorderRadius: 0,
})
