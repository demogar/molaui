// Right-to-left. `dir` on <html> mirrors the layout, but Base UI reads keyboard
// direction (slider and tab arrows, which side a submenu opens) from React
// context. Re-exported so the provider is the same instance as the one the
// components read, rather than a second copy of Base UI's context. Its own
// module so stories can import it the way an app imports it from the package,
// without the package entry, which also loads the stylesheet.
export { DirectionProvider, useDirection, type TextDirection } from '@base-ui/react/direction-provider'
