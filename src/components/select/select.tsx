'use client'

import { Select as SelectPrimitive } from '@base-ui/react/select'
import { Check, ChevronsUpDown } from 'lucide-react'
import * as React from 'react'

import { cn } from '../../lib/cn'
import { type FieldControlSize, fieldControlClasses, fieldControlSizes } from '../field/field-control'
import { Label } from '../field/label'

/**
 * A select is two shapes in this system, and they are different materials.
 *
 * The TRIGGER is a control on the page, so it is cut exactly like an input —
 * same keyline, same gold reveal on hover, same rojo band when invalid — and
 * a form of mixed inputs and selects reads as one surface.
 *
 * The POPUP floats, so it is one of the few things here allowed the blurred
 * `shadow-raised`; and it keeps its ink keyline as well, because in the dark
 * theme a shadow on a near-black ground is invisible and the keyline is the
 * only edge left.
 *
 * Inside the list, two states that are usually blurred together are kept
 * apart. HIGHLIGHTED — where the keyboard or pointer is — is the strongest
 * mark in the popup, a full ink fill, because it is the thing about to happen.
 * SELECTED — the current value — is a check and a wash, because it is a fact
 * about the past. A list where the current value looks like the cursor makes
 * an operator press Enter on the wrong row.
 *
 * Positioning drops Base UI's default overlap-the-trigger mode. It is elegant
 * on a phone; in a dense tool the trigger is often inside a table toolbar,
 * and a popup that covers the control you just pressed hides the row you
 * were filtering.
 */

export const SelectRoot = SelectPrimitive.Root
export const SelectValue = SelectPrimitive.Value
export const SelectGroup = SelectPrimitive.Group

export interface SelectTriggerProps extends SelectPrimitive.Trigger.Props {
  size?: FieldControlSize
  className?: string
  /** Shown when there is no value. */
  placeholder?: React.ReactNode
}

export function SelectTrigger({
  size = 'md',
  className,
  placeholder,
  children,
  ...props
}: SelectTriggerProps) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      className={cn(
        fieldControlClasses,
        fieldControlSizes[size],
        'flex cursor-default items-center justify-between gap-3 text-start',
        'focus-visible:shadow-[var(--focus-ring)] data-popup-open:shadow-[var(--focus-ring)]',
        'data-disabled:cursor-not-allowed data-disabled:bg-cloth-shade data-disabled:text-ink-muted data-disabled:hover:shadow-cut',
        className,
      )}
      {...props}
    >
      {children ?? (
        <SelectPrimitive.Value
          placeholder={placeholder}
          className="min-w-0 truncate data-placeholder:text-ink-muted"
        />
      )}
      <SelectPrimitive.Icon className="flex shrink-0 text-ink-muted [&_svg]:size-4">
        <ChevronsUpDown aria-hidden />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
}

export interface SelectContentProps extends SelectPrimitive.Popup.Props {
  className?: string
  /** Gap between trigger and popup, in px. */
  sideOffset?: number
}

export function SelectContent({ className, sideOffset = 6, children, ...props }: SelectContentProps) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Positioner
        sideOffset={sideOffset}
        alignItemWithTrigger={false}
        className="z-50 outline-none"
      >
        <SelectPrimitive.Popup
          data-slot="select-content"
          className={cn(
            'min-w-(--anchor-width) max-h-[min(var(--available-height),22rem)] overflow-y-auto scroll-cloth',
            'bg-cloth-pale p-1 text-ink shadow-floating outline-none',
            'origin-(--transform-origin) transition-[opacity,transform] duration-(--motion-cut) ease-cut',
            'data-starting-style:-translate-y-1 data-starting-style:opacity-0',
            'data-ending-style:opacity-0',
            className,
          )}
          {...props}
        >
          <SelectPrimitive.List>{children}</SelectPrimitive.List>
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  )
}

export interface SelectItemProps extends SelectPrimitive.Item.Props {
  className?: string
  /** Secondary line under the label: a model's context window, a team's size. */
  description?: React.ReactNode
}

/**
 * One option row in any listbox popup: this select and the combobox share it,
 * so "highlighted" and "selected" look the same wherever a list appears.
 */
export const optionClasses = [
  'relative grid min-h-(--control-h) cursor-default grid-cols-[1rem_1fr] items-center gap-x-2.5 py-1.5 pe-3 ps-2 text-base outline-none select-none',
  'data-selected:bg-ink-soft data-selected:font-semibold',
  // Highlighted wins over selected: the cursor is what is about to happen.
  'data-highlighted:bg-ink data-highlighted:text-on-ink data-selected:data-highlighted:bg-ink data-highlighted:forced-selected',
  // The ink fill IS the focus indicator here; the document-wide ring on
  // top of it would draw a second, competing one inside the popup.
  'focus-visible:shadow-none',
  'data-disabled:text-ink-muted data-disabled:cursor-not-allowed',
] as const

export function SelectItem({ className, children, description, ...props }: SelectItemProps) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(optionClasses, className)}
      {...props}
    >
      <SelectPrimitive.ItemIndicator className="col-start-1 flex [&_svg]:size-3.5">
        <Check aria-hidden strokeWidth={2.5} />
      </SelectPrimitive.ItemIndicator>
      <span className="col-start-2 min-w-0">
        <SelectPrimitive.ItemText className="block truncate">{children}</SelectPrimitive.ItemText>
        {description ? (
          <span className="block truncate text-xs font-normal opacity-80">{description}</span>
        ) : null}
      </span>
    </SelectPrimitive.Item>
  )
}

export function SelectGroupLabel({ className, ...props }: SelectPrimitive.GroupLabel.Props & { className?: string }) {
  return (
    <SelectPrimitive.GroupLabel
      className={cn('px-2 pt-2.5 pb-1.5 rotulo text-ink-muted', className)}
      {...props}
    />
  )
}

export function SelectSeparator({ className, ...props }: SelectPrimitive.Separator.Props & { className?: string }) {
  return <SelectPrimitive.Separator className={cn('mx-1 my-1 h-px bg-keyline', className)} {...props} />
}

/* ── the simple API ─────────────────────────────────────────────────── */

export interface SelectOption<V extends string = string> {
  value: V
  label: React.ReactNode
  description?: React.ReactNode
  disabled?: boolean
}

export interface SelectOptionGroup<V extends string = string> {
  label: string
  items: SelectOption<V>[]
}

export interface SelectProps<V extends string = string> {
  /** Flat options, or labelled groups. */
  items: SelectOption<V>[] | SelectOptionGroup<V>[]
  value?: V | null
  defaultValue?: V | null
  onValueChange?: (value: V | null) => void
  placeholder?: React.ReactNode
  /**
   * A visible label rendered above the trigger. Omit it when the select sits
   * inside `Field`, which renders its own — and spread Field's control props
   * onto this component instead.
   */
  label?: React.ReactNode
  size?: FieldControlSize
  disabled?: boolean
  required?: boolean
  name?: string
  id?: string
  className?: string
  'aria-label'?: string
  'aria-describedby'?: string
  'aria-invalid'?: boolean | 'true' | 'false'
}

function isGrouped<V extends string>(
  items: SelectOption<V>[] | SelectOptionGroup<V>[],
): items is SelectOptionGroup<V>[] {
  return items.length > 0 && 'items' in items[0]!
}

/**
 * The one-line form, for the nine selects in ten that are a label and a list.
 * The parts above are exported for the tenth.
 */
export function Select<V extends string = string>({
  items,
  value,
  defaultValue,
  onValueChange,
  placeholder = 'Select…',
  label,
  size = 'md',
  disabled,
  required,
  name,
  id,
  className,
  ...aria
}: SelectProps<V>) {
  const uid = React.useId()
  const triggerId = id ?? `${uid}-trigger`
  const flat = isGrouped(items) ? items.flatMap((group) => group.items) : items

  const trigger = (
    <SelectTrigger
      id={triggerId}
      size={size}
      placeholder={placeholder}
      className={label ? undefined : className}
      {...aria}
    />
  )

  return (
    <SelectRoot<V>
      items={flat.map((item) => ({ value: item.value, label: item.label }))}
      value={value}
      defaultValue={defaultValue}
      onValueChange={(next) => onValueChange?.(next as V | null)}
      disabled={disabled}
      required={required}
      name={name}
    >
      {label ? (
        <div className={cn('flex flex-col gap-2', className)}>
          <Label htmlFor={triggerId} required={required}>
            {label}
          </Label>
          {trigger}
        </div>
      ) : (
        trigger
      )}
      <SelectContent>
        {isGrouped(items)
          ? items.map((group, i) => (
              <React.Fragment key={group.label}>
                {i > 0 ? <SelectSeparator /> : null}
                <SelectGroup>
                  <SelectGroupLabel>{group.label}</SelectGroupLabel>
                  {group.items.map((item) => (
                    <SelectItem
                      key={item.value}
                      value={item.value}
                      disabled={item.disabled}
                      description={item.description}
                    >
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </React.Fragment>
            ))
          : items.map((item) => (
              <SelectItem
                key={item.value}
                value={item.value}
                disabled={item.disabled}
                description={item.description}
              >
                {item.label}
              </SelectItem>
            ))}
      </SelectContent>
    </SelectRoot>
  )
}
