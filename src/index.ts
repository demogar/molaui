import './styles/index.css'

export { cn } from './lib/cn'
export type { Variants } from './lib/variants'
export { contrast, mixOklab, parseHex, toHex } from './tokens/color'

// Right-to-left: see lib/direction.ts.
export { DirectionProvider, useDirection, type TextDirection } from './lib/direction'

// Sideways-scrolling regions: see lib/scroll-edge.ts and the scroll-edge utility.
export { useScrollEdge } from './lib/scroll-edge'

// Typography & layout
export * from './components/typography'
export * from './components/layout'
export * from './components/code'

// Actions & forms
export * from './components/button'
export * from './components/field'
export * from './components/select'
export * from './components/checkbox'
export * from './components/radio'
export * from './components/switch'
export * from './components/chip'
export * from './components/segmented'
export * from './components/slider'
export * from './components/combobox'
export * from './components/number-input'
export * from './components/date-picker'
export * from './components/file-upload'

// Feedback
export * from './components/badge'
export * from './components/callout'
export * from './components/progress'
export * from './components/placeholder'
export * from './components/skeleton'
export * from './components/empty-state'
export * from './components/toast'

// Overlays
export * from './components/dialog'
export * from './components/drawer'
export * from './components/popover'
export * from './components/tooltip'
export * from './components/menu'
export * from './components/command'

// Navigation
export * from './components/tabs'
export * from './components/accordion'
export * from './components/breadcrumb'
export * from './components/pagination'

// Data display & application shell
export * from './components/table'
export * from './components/stat'
export * from './components/description-list'
export * from './components/timeline'
export * from './components/swatch'
export * from './components/avatar'
export * from './components/app-shell'
export * from './components/toolbar'

// The AI interface layer
export * from './components/ai'
