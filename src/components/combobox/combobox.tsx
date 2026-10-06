'use client'

import { Autocomplete as AutocompletePrimitive } from '@base-ui/react/autocomplete'
import { Combobox as ComboboxPrimitive } from '@base-ui/react/combobox'
import { useDirection } from '@base-ui/react/direction-provider'
import { Check, ChevronsUpDown, X } from 'lucide-react'
import * as React from 'react'

import { cn } from '../../lib/cn'
import { chipVariants } from '../chip/chip'
import { type FieldControlSize, fieldControlClasses, fieldControlSizes } from '../field/field-control'
import { Label } from '../field/label'
import { optionClasses, optionDescriptionClasses } from '../select/select'

/**
 * A select you can type into, for the lists too long to scroll: a model
 * catalogue, the people who can review a run, two hundred tools.
 *
 * ── two components, because they promise different things ──
 * `Combobox` only ever ends on one of its options. What you type is a filter,
 * and it is thrown away on blur if it matched nothing — the value a form
 * submits is always one the list offered. `Autocomplete` is a text field that
 * suggests: what you type IS the value, and the list only saves keystrokes.
 * One component with a `freeText` flag was the first draft; it made every
 * caller ask "and what happens to a half-typed word?", which is exactly the
 * question the split answers by name. Base UI draws the same line between its
 * Combobox and Autocomplete, and both are built on those primitives — the
 * listbox semantics, `aria-activedescendant`, the filtering and the keyboard
 * model are theirs, not re-implemented here.
 *
 * ── the field looks like every other field ──
 * The input group wears `fieldControlClasses`, so a combobox in a form of
 * inputs and selects is the same cut shape with the same gold hover and rojo
 * invalid band. The popup and its rows are the Select's: highlighted (the
 * cursor) is the ink fill, selected (the value) is a check and a wash, for the
 * reason given there — a current value that looks like the cursor makes an
 * operator press Enter on the wrong row.
 *
 * ── the list always says what state it is in ──
 * An empty popup is ambiguous: no matches, still loading, or broken? So the
 * popup carries a status line that is never blank when the list is. Loading
 * shows the working relleno — the system's one "being cut" texture — next to
 * the word "Searching…", and an empty filter says "No matches". Both sit in
 * Base UI's polite status regions, so a screen reader hears the change
 * without the list stealing focus.
 *
 * ── multiple values are chips you can see and remove ──
 * With `multiple`, each value is drawn as the system's chip, inside the
 * field. At rest it is the unchecked chip; when the keyboard reaches it
 * (ArrowLeft from the start of the input, ArrowRight in RTL) it takes the ink fill, the same
 * mark the list uses for "this is what Backspace will act on". Each chip has
 * a remove button named "Remove <label>", and the input is described with
 * the count and how to reach the chips, so the chips are not a visual-only
 * affordance.
 */

/* ── shared pieces ─────────────────────────────────────────────────── */

export interface ComboboxOption {
  value: string
  /** Shown in the list and the input, and matched against what is typed. A string, so it can be filtered. */
  label: string
  /** Secondary line under the label: a team, a context window, an email. */
  description?: React.ReactNode
  disabled?: boolean
  /** Set the label in the literal face: a tool name, a run id — text a machine reads. */
  literal?: boolean
}

export interface ComboboxOptionGroup {
  label: string
  items: ComboboxOption[]
}

type Items = ComboboxOption[] | ComboboxOptionGroup[]

function isGrouped(items: Items): items is ComboboxOptionGroup[] {
  return items.length > 0 && 'items' in items[0]!
}

function flatten(items: Items): ComboboxOption[] {
  return isGrouped(items) ? items.flatMap((group) => group.items) : items
}

const popupClasses = [
  'w-(--anchor-width) max-w-(--available-width) max-h-[min(var(--available-height),22rem)] overflow-y-auto scroll-cloth',
  'bg-cloth-pale p-1 text-ink shadow-floating outline-none',
  'origin-(--transform-origin) transition-[opacity,transform] duration-(--motion-cut) ease-cut',
  'data-starting-style:-translate-y-1 data-starting-style:opacity-0',
  'data-ending-style:opacity-0',
] as const

// The two icon buttons at the end of the field. Not tab stops (Base UI keeps
// them out of the order): the keyboard opens the list with ArrowDown and
// clears with Backspace, so the buttons are for the pointer.
const endButtonClasses =
  'grid size-6 shrink-0 place-items-center text-ink-muted transition-colors duration-(--motion-cut) hover:bg-ink-soft hover:text-ink data-disabled:pointer-events-none [&_svg]:size-4'

const statusRowClasses = 'flex items-center gap-2.5 px-2 py-2 text-sm text-ink-muted'

function StatusLine({ loading, status, empty }: { loading?: boolean; status?: React.ReactNode; empty: React.ReactNode }) {
  return (
    <>
      {/* Both regions stay mounted — Base UI announces changes to their
          content, which a region that mounts with its text never does. */}
      <ComboboxPrimitive.Status className="empty:hidden">
        {loading ? (
          <div className={statusRowClasses}>
            <span aria-hidden className="relative h-2 w-6 shrink-0 overflow-hidden bg-cloth-shade shadow-cut">
              <span className="absolute inset-0 band-oro relleno-working" />
            </span>
            Searching…
          </div>
        ) : status ? (
          <div className={statusRowClasses}>{status}</div>
        ) : null}
      </ComboboxPrimitive.Status>
      <ComboboxPrimitive.Empty className="empty:hidden">
        {loading ? null : (
          <div className={statusRowClasses}>
            <span aria-hidden className="size-1.5 shrink-0 bg-ink-muted forced-ink" />
            {empty}
          </div>
        )}
      </ComboboxPrimitive.Empty>
    </>
  )
}

function OptionRow({ option }: { option: ComboboxOption }) {
  return (
    <ComboboxPrimitive.Item
      value={option}
      disabled={option.disabled}
      data-slot="combobox-item"
      className={cn(optionClasses)}
    >
      <ComboboxPrimitive.ItemIndicator className="col-start-1 flex [&_svg]:size-3.5">
        <Check aria-hidden strokeWidth={2.5} />
      </ComboboxPrimitive.ItemIndicator>
      <span className="col-start-2 min-w-0">
        <span className={cn('block truncate', option.literal && 'literal')}>{option.label}</span>
        {option.description ? (
          <span className={optionDescriptionClasses}>{option.description}</span>
        ) : null}
      </span>
    </ComboboxPrimitive.Item>
  )
}

function OptionList({ grouped }: { grouped: boolean }) {
  return (
    <ComboboxPrimitive.List className="outline-none data-empty:hidden">
      {grouped
        ? (group: ComboboxOptionGroup, index: number) => (
            <ComboboxPrimitive.Group key={group.label} items={group.items} className="block">
              {index > 0 ? <ComboboxPrimitive.Separator className="mx-1 my-1 h-px bg-keyline" /> : null}
              <ComboboxPrimitive.GroupLabel className="px-2 pt-2.5 pb-1.5 rotulo text-ink-muted">
                {group.label}
              </ComboboxPrimitive.GroupLabel>
              <ComboboxPrimitive.Collection>
                {(option: ComboboxOption) => <OptionRow key={option.value} option={option} />}
              </ComboboxPrimitive.Collection>
            </ComboboxPrimitive.Group>
          )
        : (option: ComboboxOption) => <OptionRow key={option.value} option={option} />}
    </ComboboxPrimitive.List>
  )
}

/* ── Combobox ──────────────────────────────────────────────────────── */

interface ComboboxCommonProps {
  /** Flat options, or labelled groups. With `filter={null}`, the options to show right now. */
  items: Items
  placeholder?: string
  /**
   * A visible label above the field. Omit it inside `Field`, which renders
   * its own, and spread Field's control props onto this component instead.
   */
  label?: React.ReactNode
  size?: FieldControlSize
  disabled?: boolean
  readOnly?: boolean
  required?: boolean
  name?: string
  id?: string
  className?: string
  /** What the popup says when nothing matches. */
  emptyMessage?: React.ReactNode
  /** Results are on their way: the popup shows the working texture and "Searching…". */
  loading?: boolean
  /** A line above the results — "Showing 20 of 312", or an error from the search. */
  status?: React.ReactNode
  /**
   * How typed text matches an option. Pass `null` when the caller filters —
   * a server search — and hand the results in through `items`.
   */
  filter?: null | ((option: ComboboxOption, query: string) => boolean)
  /** What is typed, as it is typed: the hook for a server search. */
  onInputValueChange?: (query: string) => void
  /** Locale for the built-in matching. Omitted, the runtime's locale is used. */
  locale?: Intl.LocalesArgument
  /** Accessible name of the clear button. */
  clearLabel?: string
  /** Accessible name of the button that opens the list. */
  triggerLabel?: string
  'aria-label'?: string
  'aria-describedby'?: string
  'aria-invalid'?: boolean | 'true' | 'false'
}

export interface ComboboxSingleProps extends ComboboxCommonProps {
  multiple?: false
  value?: string | null
  defaultValue?: string | null
  onValueChange?: (value: string | null) => void
}

export interface ComboboxMultipleProps extends ComboboxCommonProps {
  multiple: true
  value?: string[]
  defaultValue?: string[]
  onValueChange?: (value: string[]) => void
  /** Accessible name of each chip's remove button. */
  removeLabel?: (label: string) => string
}

export type ComboboxProps = ComboboxSingleProps | ComboboxMultipleProps

/**
 * Options seen so far, by value. The public API speaks in value strings, Base
 * UI in option objects; with a server search the selected option may have
 * scrolled out of `items`, and its label still has to be shown in the field.
 */
function useOptionCache(items: Items) {
  // One Map for the component's life, filled as items arrive. It only ever
  // gains entries, so writing to it during render is idempotent.
  const [cache] = React.useState(() => new Map<string, ComboboxOption>())
  for (const option of flatten(items)) cache.set(option.value, option)
  return (value: string): ComboboxOption => cache.get(value) ?? { value, label: value }
}

const multiMinHeight = { sm: 'min-h-(--control-h-sm)', md: 'min-h-(--control-h)', lg: 'min-h-(--control-h-lg)' } as const

export function Combobox(props: ComboboxProps) {
  const {
    items,
    placeholder,
    label,
    size = 'md',
    disabled,
    readOnly,
    required,
    name,
    id,
    className,
    emptyMessage = 'No matches',
    loading = false,
    status,
    filter,
    onInputValueChange,
    locale,
    clearLabel = 'Clear selection',
    triggerLabel = 'Show options',
    'aria-label': ariaLabel,
    'aria-describedby': ariaDescribedBy,
    'aria-invalid': ariaInvalid,
  } = props
  const uid = React.useId()
  const inputId = id ?? `${uid}-input`
  const lookup = useOptionCache(items)
  // The chips sit before the input in reading order, so the key that reaches
  // them is the one pointing backwards: Left in LTR, Right in RTL.
  const backKey = useDirection() === 'rtl' ? 'Right' : 'Left'
  const grouped = isGrouped(items)

  const inputClasses =
    'h-full min-w-0 flex-1 border-0 bg-transparent p-0 [font-size:inherit] text-ink outline-none placeholder:text-ink-muted focus:shadow-none focus-visible:shadow-none disabled:cursor-not-allowed disabled:text-ink-muted'

  const groupClasses = cn(
    fieldControlClasses,
    fieldControlSizes[size],
    'flex items-center gap-1 cursor-text pe-1.5',
    'focus-within:shadow-[var(--focus-ring)] focus-within:hover:shadow-[var(--focus-ring)]',
    'has-[[aria-invalid=true]]:band-rojo has-[[aria-invalid=true]]:cut-band',
    'has-[[aria-invalid=true]]:focus-within:shadow-[var(--focus-ring)]',
    'data-disabled:cursor-not-allowed data-disabled:bg-cloth-shade data-disabled:text-ink-muted data-disabled:hover:shadow-cut',
    label ? undefined : className,
  )

  const endButtons = disabled || readOnly ? null : (
    <>
      <ComboboxPrimitive.Clear aria-label={clearLabel} className={endButtonClasses}>
        <X aria-hidden />
      </ComboboxPrimitive.Clear>
      <ComboboxPrimitive.Trigger aria-label={triggerLabel} className={endButtonClasses}>
        <ChevronsUpDown aria-hidden />
      </ComboboxPrimitive.Trigger>
    </>
  )

  const inputAria = {
    id: inputId,
    'aria-label': ariaLabel,
    'aria-invalid': ariaInvalid,
  }

  const shared = {
    items,
    disabled,
    readOnly,
    required,
    name,
    locale,
    filter,
    isItemEqualToValue: (a: ComboboxOption, b: ComboboxOption) => a.value === b.value,
    itemToStringLabel: (option: ComboboxOption) => option.label,
    itemToStringValue: (option: ComboboxOption) => option.value,
    onInputValueChange: onInputValueChange ? (query: string) => onInputValueChange(query) : undefined,
  }

  let field: React.ReactNode
  let root: (children: React.ReactNode) => React.ReactNode

  if (props.multiple) {
    const { value, defaultValue, onValueChange, removeLabel = (l: string) => `Remove ${l}` } = props
    const pad = 'calc((var(--control-h) - var(--control-h-sm)) / 2)'
    field = (
      <ComboboxPrimitive.InputGroup
        data-slot="combobox"
        className={cn(groupClasses, 'h-auto items-start py-(--chip-pad) ps-(--chip-pad)', multiMinHeight[size])}
        style={{ '--chip-pad': pad } as React.CSSProperties}
      >
        <ComboboxPrimitive.Value>
          {(selected: ComboboxOption[]) => (
            <ComboboxPrimitive.Chips
              aria-label={selected.length > 0 ? 'Selected' : undefined}
              className="flex min-w-0 flex-1 flex-wrap items-center gap-(--chip-pad)"
            >
              {selected.map((option) => (
                <ComboboxPrimitive.Chip
                  key={option.value}
                  aria-label={option.label}
                  className={cn(
                    chipVariants(),
                    'cursor-default gap-1 text-ink outline-none',
                    disabled ? 'bg-cloth-shade text-ink-muted' : readOnly ? undefined : 'pe-0.5',
                    // The keyboard is on this chip: Backspace will remove it.
                    'data-highlighted:bg-ink data-highlighted:text-on-ink data-highlighted:forced-selected',
                    'focus-within:bg-ink focus-within:text-on-ink',
                  )}
                >
                  <span className={cn(option.literal && 'literal')}>{option.label}</span>
                  {/* A locked field keeps its chips but loses their ×: a
                      remove button that does nothing is a broken promise. */}
                  {disabled || readOnly ? null : (
                    <ComboboxPrimitive.ChipRemove
                      aria-label={removeLabel(option.label)}
                      className="grid size-5 place-items-center text-current transition-colors duration-(--motion-cut) hover:bg-ink-soft"
                    >
                      <X aria-hidden />
                    </ComboboxPrimitive.ChipRemove>
                  )}
                </ComboboxPrimitive.Chip>
              ))}
              <ComboboxPrimitive.Input
                {...inputAria}
                aria-describedby={
                  [ariaDescribedBy, selected.length > 0 ? `${uid}-chips-hint` : undefined].filter(Boolean).join(' ') ||
                  undefined
                }
                placeholder={selected.length > 0 ? undefined : placeholder}
                className={cn(inputClasses, 'h-(--control-h-sm) min-w-16 ps-1.5 first:ps-[calc(var(--control-px)-var(--chip-pad))]')}
              />
              {selected.length > 0 ? (
                <span id={`${uid}-chips-hint`} hidden>
                  {`${selected.length} selected. Press ${backKey} Arrow from the start of the field to reach them.`}
                </span>
              ) : null}
            </ComboboxPrimitive.Chips>
          )}
        </ComboboxPrimitive.Value>
        <span className="flex h-(--control-h-sm) items-center">{endButtons}</span>
      </ComboboxPrimitive.InputGroup>
    )
    root = (children) => (
      <ComboboxPrimitive.Root<ComboboxOption, true>
        {...shared}
        multiple
        value={value === undefined ? undefined : value.map(lookup)}
        defaultValue={defaultValue === undefined ? undefined : defaultValue.map(lookup)}
        onValueChange={(next) => onValueChange?.(next.map((option) => option.value))}
      >
        {children}
      </ComboboxPrimitive.Root>
    )
  } else {
    const { value, defaultValue, onValueChange } = props
    field = (
      <ComboboxPrimitive.InputGroup data-slot="combobox" className={groupClasses}>
        <ComboboxPrimitive.Input
          {...inputAria}
          aria-describedby={ariaDescribedBy}
          placeholder={placeholder}
          className={inputClasses}
        />
        {endButtons}
      </ComboboxPrimitive.InputGroup>
    )
    root = (children) => (
      <ComboboxPrimitive.Root<ComboboxOption>
        {...shared}
        value={value === undefined ? undefined : value === null ? null : lookup(value)}
        defaultValue={defaultValue === undefined ? undefined : defaultValue === null ? null : lookup(defaultValue)}
        onValueChange={(next) => onValueChange?.(next ? next.value : null)}
      >
        {children}
      </ComboboxPrimitive.Root>
    )
  }

  return root(
    <>
      {label ? (
        <div className={cn('flex flex-col gap-2', className)}>
          <Label htmlFor={inputId} required={required}>
            {label}
          </Label>
          {field}
        </div>
      ) : (
        field
      )}
      <ComboboxPrimitive.Portal>
        <ComboboxPrimitive.Positioner sideOffset={6} className="z-50 outline-none">
          <ComboboxPrimitive.Popup
            data-slot="combobox-content"
            aria-busy={loading || undefined}
            className={cn(popupClasses)}
          >
            <StatusLine loading={loading} status={status} empty={emptyMessage} />
            <OptionList grouped={grouped} />
          </ComboboxPrimitive.Popup>
        </ComboboxPrimitive.Positioner>
      </ComboboxPrimitive.Portal>
    </>,
  )
}

/* ── Autocomplete ──────────────────────────────────────────────────── */

export interface AutocompleteProps {
  /** Suggestions. Plain strings, or options with a description line. */
  items: (string | ComboboxOption)[]
  value?: string
  defaultValue?: string
  /** Every change to the text, typed or chosen. */
  onValueChange?: (value: string) => void
  placeholder?: string
  label?: React.ReactNode
  size?: FieldControlSize
  disabled?: boolean
  readOnly?: boolean
  required?: boolean
  name?: string
  id?: string
  className?: string
  /** What the popup says when nothing matches. Omit to close the popup instead. */
  emptyMessage?: React.ReactNode
  loading?: boolean
  status?: React.ReactNode
  /** Locale for the built-in matching. Omitted, the runtime's locale is used. */
  locale?: Intl.LocalesArgument
  autoComplete?: string
  'aria-label'?: string
  'aria-describedby'?: string
  'aria-invalid'?: boolean | 'true' | 'false'
}

/**
 * Free text with suggestions: a run label, a tag, a search. The typed text is
 * the value; picking a suggestion only fills it in.
 */
export function Autocomplete({
  items,
  value,
  defaultValue,
  onValueChange,
  placeholder,
  label,
  size = 'md',
  disabled,
  readOnly,
  required,
  name,
  id,
  className,
  emptyMessage,
  loading = false,
  status,
  locale,
  autoComplete = 'off',
  ...aria
}: AutocompleteProps) {
  const uid = React.useId()
  const inputId = id ?? `${uid}-input`
  const options = React.useMemo(
    () => items.map((item) => (typeof item === 'string' ? { value: item, label: item } : item)),
    [items],
  )

  const input = (
    <AutocompletePrimitive.Input
      data-slot="autocomplete"
      id={inputId}
      placeholder={placeholder}
      autoComplete={autoComplete}
      className={cn(fieldControlClasses, fieldControlSizes[size], label ? undefined : className)}
      {...aria}
    />
  )

  return (
    <AutocompletePrimitive.Root
      items={options}
      value={value}
      defaultValue={defaultValue}
      onValueChange={onValueChange ? (next) => onValueChange(next) : undefined}
      itemToStringValue={(option: ComboboxOption) => option.label}
      disabled={disabled}
      readOnly={readOnly}
      required={required}
      name={name}
      locale={locale}
    >
      {label ? (
        <div className={cn('flex flex-col gap-2', className)}>
          <Label htmlFor={inputId} required={required}>
            {label}
          </Label>
          {input}
        </div>
      ) : (
        input
      )}
      <AutocompletePrimitive.Portal>
        <AutocompletePrimitive.Positioner sideOffset={6} className="z-50 outline-none">
          <AutocompletePrimitive.Popup
            data-slot="autocomplete-content"
            aria-busy={loading || undefined}
            className={cn(popupClasses, 'empty:hidden')}
          >
            <StatusLine loading={loading} status={status} empty={emptyMessage} />
            <AutocompletePrimitive.List className="outline-none data-empty:hidden">
              {(option: ComboboxOption) => (
                <AutocompletePrimitive.Item
                  key={option.value}
                  value={option}
                  disabled={option.disabled}
                  className={cn(optionClasses, 'grid-cols-1 ps-2.5')}
                >
                  <span className="min-w-0">
                    <span className="block truncate">{option.label}</span>
                    {option.description ? (
                      <span className={optionDescriptionClasses}>{option.description}</span>
                    ) : null}
                  </span>
                </AutocompletePrimitive.Item>
              )}
            </AutocompletePrimitive.List>
          </AutocompletePrimitive.Popup>
        </AutocompletePrimitive.Positioner>
      </AutocompletePrimitive.Portal>
    </AutocompletePrimitive.Root>
  )
}
