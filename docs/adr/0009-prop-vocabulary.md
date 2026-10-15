# 0009 — One meaning each for tone, variant, kind and size, and one place for className

**Date:** 2026-10-14 · **Status:** accepted

## Context

The 2026-10-14 audit found that the four prop names a consumer meets on almost every component had
drifted to four or five meanings each:

- `tone` was a status on `Badge`, `Callout` and `Swatch`; a layer of cloth on `Panel`
  (`pale | cloth | … | oro`) and `Placeholder` (`default | deep`); an inversion on `StepList`
  (`default | inverse`); a text ink on `StreamingText` (`default | muted`); and on `Text` a mix
  of inks and statuses with a number among them (`default | 2 | muted | danger | success`).
- `size` was the t-shirt scale on `Button` and every field, `default | comfortable` on `Chip`,
  a type scale on `Timeline` (`default | editorial`), a measure on `Container`
  (`page | wide | prose | full`), a heading level on `Heading` (`1 | 2 | 3 | 4`), and `base` on
  `Text` and `Prose` where every other scale said `md`.
- `variant` was a look on `Badge` (`solid | soft | outline`) and a category on `EmptyState`
  (`empty | no-results | error | no-permission`).
- The status words themselves drifted: `attention` on `NavItem`'s count, `ink` on `Progress`,
  `default` on `MenuItem` where every other component said `neutral`.

Each choice was argued well in its own file. Together they made `<EmptyState tone="danger">` and
`<Chip size="sm">` type errors that had to be looked up per component. That is the opposite of
what `src/docs/usage/rules.ts`, the MCP server and the manifest promise an agent: an API that can
be guessed.

The same audit found the "simple API" components (`Select`, `Combobox`, `NumberInput`, the date
pickers, `Checkbox` with a `label`) put `className` on the control without a `label` and on a
wrapper with one, so `className="w-64"` changed meaning when a label was added.

## Decision

**One vocabulary.**

| Prop | Means | Values |
| --- | --- | --- |
| `tone` (and `*Tone`) | A status | `neutral`, `info`, `success`, `warn`, `danger`, `accent` (a subset is fine) |
| `variant` (and `*Variant`) | A presentation | a look or layout: `solid`, `outline`, `seam`, `flat`, `compact`, `editorial`… |
| `kind` | A category | anything that is not a status, a size or a look: `no-results`, `rate_limited` |
| `size` (and `*Size` when it is a scale) | The t-shirt scale | `xs`, `sm`, `md`, `lg`, `xl` |

The renames, each deprecated in 0.7.0 and removed in 1.0.0:

| Was | Is | Why this name |
| --- | --- | --- |
| `Panel tone` | `layer` | The values are layers of cloth. `data-layer` is written beside `data-tone`. |
| `Placeholder tone="default \| deep"` | `layer="shade \| deep"` | The same idea as `Panel`, with the layer named. |
| `StepList tone="inverse"` | `inverse` | A two-value prop whose second value is "on" is a boolean. |
| `StreamingText tone="muted"` | `variant="muted"` | A muted ink is a look, not a status. |
| `Text tone={2}` / `tone="muted"` | `variant="secondary"` / `variant="muted"` | The three inks are a presentation. `tone` keeps `danger` and `success`, and gains `neutral`. |
| `Text`, `Prose` `size="base"` | `size="md"` | The scale's own word. |
| `Heading size={3}` | `visualLevel={3}` | The value is "look like an h3", a level, not a size. It takes `level`'s values. |
| `Container size` | `width` | The values are measures. |
| `Chip size="default \| comfortable"` | `size="sm \| md"` | The t-shirt scale. |
| `Timeline size="editorial"` | `variant="editorial"` | A type scale is a presentation. |
| `EmptyState variant`, `TableEmpty variant` | `kind` | Four categories of state, not four looks. `data-kind` is written beside `data-variant`. |
| `Progress tone="ink"` | `tone="neutral"` | The status word. |
| `MenuItem tone="default"`, `ToolbarOverflowItem.tone` | `tone="neutral"` | The status word. |
| `NavItem countTone="attention"` | `countTone="danger"` | The status word. |

Kept on purpose:

- `Button variant="danger"`. A destructive button is a presentation of the action, and a button
  has no `tone` to carry it. The vocabulary test lists it as the one tone word a variant may use.
- `ToastTone` and `TimelineTone` add one value to the statuses: `running` and `active`, the work
  still happening. They are fields of data objects, not props, and both are replaced by a status
  when the work finishes. `useToast()` gains `danger()` and `warn()`; `error()` stays as the same
  call under the word people reach for first.

**One place for `className`.** Every exported component accepts `ref`, `id`, `data-*` and the
other DOM props of the element it documents.

- `className` and `style` go to the box you see: the element that wears the cut. For a field that
  is the control (the trigger, the input group); for `Chip` it is the label.
- `ref` and every other prop go to the element you focus: the input, the trigger, the button. For
  a component with nothing to focus, the root.
- A wrapper that holds a `label` beside the control takes `wrapperClassName`, as `ToolbarInput`
  already did.
- A component that renders no element of its own (`ToastProvider`, the Base UI roots, `Field`,
  `TableSkeletonRows`) takes none of these, and says so in its doc comment.

**Gates.** `src/test/prop-vocabulary.test.ts` reads the manifest and fails a non-deprecated prop
whose values leave its set. `src/test/prop-bags.test.tsx` renders every exported component with a
`ref`, a `data-*` attribute and a `className`, and fails one that drops any of them or puts
`className` somewhere other than the element its doc comment names. `src/test/stories.test.tsx`
fails a story that uses a deprecated prop. `codemods/prop-vocabulary.ts` rewrites the renames.

## Consequences

- One minor of warnings, then the old spellings go in 1.0.0. The codemod covers every rename
  written as JSX; object props (`DataTable empty={{ variant }}`, `ToolbarOverflow` items) warn in
  development and are changed by hand.
- The `*Variants` cva functions changed keys with their props (`panelVariants({ layer })`,
  `emptyStateVariants({ kind })`, `containerVariants({ width })`, `headingVariants({ visualLevel })`).
  They are exported for consumers who compose classes, so this is the breaking part of the
  release and is listed in its notes.
- `className` moved for `Checkbox`, `Radio`, `Switch`, `Select`, `Combobox`, `Autocomplete`,
  `NumberInput`, `DatePicker` and `DateRangePicker` when a `label` is set: it now styles the
  control, and the wrapper takes `wrapperClassName`.
