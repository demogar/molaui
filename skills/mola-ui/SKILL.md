---
name: mola-ui
description: Build React screens with the Mola UI design system (@demogar/mola-ui) correctly. Use when writing or reviewing UI code that imports @demogar/mola-ui, when choosing which Mola UI component fits a job, or when styling with its tokens and utilities (shadow-cut, relleno, bg-cloth, text-ink, data-theme, data-density).
---

# Building with Mola UI

Mola UI is a React 19 design system for dense internal tools and AI interfaces. It uses Base UI
for behaviour, Tailwind v4 for styling and CSS custom properties for tokens. Its look comes from
the mola textile: flat layers, hard ink keylines, revealed bands, and no curves.

Before you write code, look up the components you plan to use. Don't guess props.

- `docs/ai/components.json` in the repository (or `llms-full.txt` at the Storybook root) lists
  every export with its props, types, defaults, cva variants and usage guidance. It is generated
  from the source, so it is current.
- `https://demogar.github.io/molaui/?path=/docs/<id>` is each component's docs page. The manifest
  gives the URL.

## Setup

```bash
npm install @demogar/mola-ui @base-ui/react \
  @fontsource-variable/archivo @fontsource-variable/alegreya @fontsource-variable/martian-mono
```

```tsx
// once, at the app entry
import '@fontsource-variable/archivo/wdth.css' // the width axis is required
import '@fontsource-variable/alegreya/wght.css'
import '@fontsource-variable/martian-mono/wdth.css'
import '@demogar/mola-ui/styles.css' // or @demogar/mola-ui/tailwind.css inside your own Tailwind v4 build
```

Theme, density and direction are **attributes**, not props or context, so portaled menus and
dialogs inherit them:

```tsx
<html data-theme="dark" data-density="compact" dir="ltr">
```

`data-theme` is `light` or `dark`; leave it off to follow the OS. `data-density` is `compact`
(tables, logs), `comfortable` (default) or `spacious` (forms, onboarding). Both work on any
subtree. No component takes a size-for-density prop. For right-to-left, set `dir="rtl"` on
`<html>` **and** wrap the app in `<DirectionProvider direction="rtl">` from `@demogar/mola-ui`,
because keyboard direction is read from context.

## Rules that are never broken

1. **Interactive edges are `shadow-cut`** (overlays: `shadow-floating`), never `border`.
   `border-keyline` is only for decorative dividers. Don't use arbitrary `shadow-[…]`: the named
   utilities keep an outline in forced-colours mode.
2. **No radius.** No `rounded-*` except `rounded-full` on something that really is a dot.
3. **State is glyph + word + colour**, never colour alone. Use `Badge`, `StatusDot`, `RunStatus`
   or `Callout`, which already do this, rather than a coloured `<span>`.
4. **Disabled is stated, not faded.** Never put `opacity-*` on a disabled control. Pass
   `disabled` and let the component draw it.
5. **Colours only from tokens.** No hex, `rgb()` or arbitrary colour values. Use the utilities
   below.
6. **Logical properties only**: `ps-`/`pe-`, `ms-`/`me-`, `inset-s-`/`inset-e-`, `text-start`/
   `text-end`, `border-s`. Never `pl-`, `mr-`, `left-`, `text-left`. Wrap mixed-direction
   literals (dates, ranges, ids) in `dir="ltr"` or `dir="auto"`.
7. **Typefaces have roles.** Archivo (`font-ui`, the default) is for the interface. Alegreya
   (`font-text`, or `Prose`) is for prose a person or a model says. Martian Mono (`literal`, or
   `Code`/`CodeBlock`) is only for machine literals: ids, JSON, tool arguments. Numbers in tables
   are Archivo with `tabular`, not mono.
8. **No spinners.** For unknown duration, use the relleno working state the components already
   have (`Button loading`, `Progress value={null}`, `toast.running()`, `RunStatus`), with elapsed
   time counting up. Never show an invented percentage.
9. **Anything that writes to the world waits for a person**: `ToolCall` with `approval`, or
   `ChangeReview`. Each choice gets equal visual weight.
10. **Don't rebuild behaviour.** Use the component (built on Base UI) for focus trapping, roving
    focus, typeahead and dismissal. Don't hand-roll a dialog or a listbox.

## Picking a component

| Need | Use | Not |
| --- | --- | --- |
| State of a row, in a word | `Badge` (`tone`, `dot`) | `Callout` |
| A condition of a region that stays true | `Callout` | `Toast` |
| Something that just happened | `useToast()` | `Callout` |
| A decision before going on | `Dialog`; destructive: `AlertDialog` naming the object | `Toast` |
| A panel with nothing in it | `EmptyState` | grey text in a blank panel |
| On/off applied on Save, or on/off applied at once | `Checkbox`, or `Switch` | the other one |
| One of 2–5 options compared side by side | `RadioGroup` | `Select` |
| Switch between views of the same data | `SegmentedControl` | `Tabs` |
| One value from a scannable list, or from a long list | `Select`, or `Combobox` | each other |
| Free text with suggestions | `Autocomplete` | `Combobox` |
| An exact number, or a value where the range matters | `NumberInput`, or `Slider` | each other |
| One date, or a period | `DatePicker`, or `DateRangePicker` | two date pickers |
| A label for an icon-only control | `IconButton` (`label` is required) + `Tooltip` | `Popover` |
| A small anchored panel, page still usable | `Popover` | `Dialog` |
| Actions on an object | `Menu` | `Select` |
| Details beside a list | `Drawer` | `Dialog` |
| Jump anywhere by name | `CommandPalette` | `Menu` |
| Content loading in a known layout | `SkeletonGroup` + `Skeleton` | a spinner |
| Work toward a known total, or a reading in a range | `Progress`, or `Meter` | each other |
| Records compared row by row | `Table`; with sort, selection, bulk actions or pages: `DataTable` | `DescriptionList` |
| The fields of one record | `DescriptionList` | a two-column table |
| A headline figure | `Stat` | `Meter` |
| Views of one object | `Tabs` | `SegmentedControl` |
| Page chrome | `AppShell`, `Sidebar`, `Topbar`, `PageHeader` | a custom layout |
| A model's answer, streamed | `Message` + `StreamingText` | `Prose` until the stream ends |
| A tool call, or a larger change for review | `ToolCall`, or `ChangeReview` | each other |
| A run and its steps, or why it stopped | `AgentRun`, or `RunError` | `Timeline`, or `Callout` |
| Where a claim came from, and how well it is supported | `Citation`/`SourceList`, and `Confidence` (words, not %) | links, or a percentage |

The full decision tables are on the "Choosing a component" docs page
(`?path=/docs/mola-ui-choosing-a-component--overview`). Each component's `usage` in the manifest
says when not to use it and what to use instead.

## Tokens and utilities

Grounds, from back to front:

- `bg-cloth` is the page.
- `bg-cloth-pale` is raised: cards, inputs, menus.
- `bg-cloth-shade` is one step down: table headers, wells.
- `bg-cloth-deep` is the deepest ground.
- `on-ink` is an inverted ink region.

Text, from strong to weak:

- `text-ink` is body text and headings.
- `text-ink-2` is secondary text.
- `text-ink-muted` is metadata, and the floor of the ramp.

Each of these is legal on every ground and every wash.

Status colours:

- **Tone:** `danger`, `success`, `warn`, `info`. Use these for marks and fills.
- **Text:** `text-ink-danger`, `text-ink-success`, `text-ink-warn`, `text-ink-info`. Use these
  when the tone has to colour words.
- **Layers:** `rojo`, `anil`, `verde`, `oro`. These are fields and marks, never body text.
  `oro` is never text on light cloth.
- **Washes:** `*-soft`. A wash is for a whole region, such as a selected row or a callout.

Mola utilities:

- `shadow-cut` is a keyline edge, and `shadow-floating` is the keyline plus elevation.
- `cut-band band-oro` is a revealed band on hover or selection.
- `relleno` is the divider and empty texture.
- `rotulo` is a small label in capitals. Write its text in sentence case; the utility sets the
  capitals.
- `literal` is the mono face for machine text.
- `tabular` gives aligned figures.

Spacing and sizes follow density. Size controls with the components, not with fixed heights. If
you must match a control, use `h-(--control-h)` and `px-(--control-px)`, so the size scales with
`data-density`. Merge class names with `cn()` from `@demogar/mola-ui`. It knows the token
vocabulary, where plain `tailwind-merge` would drop a token colour class.

## Writing

- **Sentence case** everywhere.
- **Buttons start with a verb and name the object**: "Cancel run", not "OK".
- **Errors say what happened and what to do.** Show the raw error as a literal beside the
  sentence.
- **Numbers carry units**: "4m 12s", "18,204 tokens".
- **Avoid** "please", exclamation marks and trailing periods on labels.
- **Use the status vocabulary**: Queued, Running, Needs approval, Succeeded, Failed, Cancelled.

## Before you call it done

- Every state works: empty, loading, error, long text and 390px wide.
- It works in both themes, in `compact` density and right-to-left.
- Every control has a visible label or an accessible name. Icon-only controls use `IconButton`
  with `label`.
- The checklist is clean: no `border` on an interactive edge, no `rounded-*`, no `opacity-*` on
  disabled controls, no hex, no `pl-`/`pr-`/`left-`/`right-`.
- Patterns for whole screens are in Storybook under Patterns: Settings page, List and detail,
  Filtered table. Start from them rather than from a blank file.
