/**
 * Type-level tests for the generic and discriminated parts of the public API.
 *
 * These are the props whose types carry the contract: Combobox's `multiple`
 * decides whether a value is a string or a list, `DataTable<Row>` threads the
 * row type into every column callback, `Select` and `SegmentedControl` infer a
 * value union from their options. Any of them could widen to `any` and still
 * pass `tsc`, the API report and every runtime test, because `any` accepts
 * everything those check. `expectTypeOf(…).toEqualTypeOf<…>()` does not: it
 * fails on `any`, and on a type that is merely assignable.
 *
 * The file is checked by `npm run typecheck` (tsc includes all of src), which
 * is in `npm run check`; it never runs. We tried vitest's `typecheck` mode
 * first: it runs a second tsc over the same files with its own config and
 * reporter, so a type test could pass there and the same file fail in
 * typecheck, or the reverse. One compiler, one config. The `.test-d.tsx`
 * suffix keeps it out of the vitest glob, and src/test is outside the library
 * build and its declarations.
 *
 * An unused `@ts-expect-error` is itself an error, so each "must not compile"
 * line below fails the moment the API starts accepting it.
 */
import { expectTypeOf } from 'vitest'

import {
  type buttonVariants,
  ChangeReview,
  Combobox,
  type ComboboxProps,
  DataTable,
  type DataTableColumn,
  DataTableColumnMenu,
  Field,
  type FieldControlProps,
  type RunStatusValue,
  SegmentedControl,
  Select,
  ToolCall,
  type ToolCallProps,
  type Variants,
} from '@/index'

interface Run {
  id: string
  started: Date
  tokens: number
}

/* 1. Combobox, single: the value is one string or nothing. */
export const comboboxSingle = (
  <Combobox
    items={[{ value: 'eu-west', label: 'EU West' }]}
    onValueChange={(value) => expectTypeOf(value).toEqualTypeOf<string | null>()}
  />
)

/* 2. Combobox, multiple: the value is a list, and only a list. */
export const comboboxMultiple = (
  <Combobox
    multiple
    items={[{ value: 'eu-west', label: 'EU West' }]}
    onValueChange={(value) => expectTypeOf(value).toEqualTypeOf<string[]>()}
    removeLabel={(label) => `Remove ${label}`}
  />
)
// @ts-expect-error a multiple combobox does not take a single value
export const comboboxMultipleWithString: ComboboxProps = { multiple: true, items: [], value: 'eu-west' }
expectTypeOf<Extract<ComboboxProps, { multiple: true }>['value']>().toEqualTypeOf<string[] | undefined>()
// A single combobox has no chips, so it has nothing to remove. `multiple` is
// optional on the single form, and an absent discriminant does not narrow a
// union: `removeLabel` was accepted here and silently ignored.
// @ts-expect-error removeLabel needs multiple
export const comboboxSingleWithRemoveLabel = <Combobox items={[]} removeLabel={(label: string) => `Remove ${label}`} />
// @ts-expect-error removeLabel needs multiple, and multiple={false} is not it
export const comboboxFalseWithRemoveLabel = <Combobox multiple={false} items={[]} removeLabel={(label: string) => `Remove ${label}`} />

/* 2b. Every component takes its element's ref, and the simple-API forms
   type it as the element they forward it to: the input, the trigger. */
export const comboboxRef = (
  <Combobox
    items={[]}
    ref={(node) => {
      expectTypeOf(node).toEqualTypeOf<HTMLInputElement | null>()
    }}
  />
)
export const selectRef = (
  <Select
    items={[]}
    ref={(node) => {
      expectTypeOf(node).toEqualTypeOf<HTMLButtonElement | null>()
    }}
  />
)

/* 3. Select infers its value union from the options. */
export const select = (
  <Select
    items={[
      { value: 'draft', label: 'Draft' },
      { value: 'live', label: 'Live' },
    ]}
    onValueChange={(value) => expectTypeOf(value).toEqualTypeOf<'draft' | 'live' | null>()}
  />
)
// `value` takes part in inference, so the negative case names the union.
// @ts-expect-error the value must be one of the options
export const selectWrongValue = <Select<'draft' | 'live'> items={[{ value: 'draft', label: 'Draft' }]} value="archived" />

/* 4. SegmentedControl infers its value union, and never hands back null. */
export const segmented = (
  <SegmentedControl
    aria-label="View"
    options={[
      { value: 'table', label: 'Table' },
      { value: 'board', label: 'Board' },
    ]}
    onValueChange={(value) => expectTypeOf(value).toEqualTypeOf<'table' | 'board'>()}
  />
)
// @ts-expect-error the value must be one of the options
export const segmentedWrongValue = <SegmentedControl<'table' | 'board'> aria-label="View" options={[{ value: 'table', label: 'Table' }]} value="list" />

/* 5. DataTable threads the row type into every row callback. */
const runColumns: DataTableColumn<Run>[] = [
  { key: 'id', header: 'Run', cell: (row) => row.id },
  { key: 'started', header: 'Started', sortValue: (row) => row.started },
]
export const dataTable = (
  <DataTable
    columns={runColumns}
    rows={[] as Run[]}
    getRowId={(row) => {
      expectTypeOf(row).toEqualTypeOf<Run>()
      return row.id
    }}
    rowLabel={(row) => `Select ${row.id}`}
  />
)
export const dataTableInline = (
  <DataTable
    rows={[] as Run[]}
    getRowId={(row) => row.id}
    columns={[{ key: 'tokens', header: 'Tokens', cell: (row) => expectTypeOf(row).toEqualTypeOf<Run>() && row.tokens }]}
  />
)
export const dataTableWrongField = (
  // @ts-expect-error a Run has no `name`
  <DataTable rows={[] as Run[]} columns={runColumns} getRowId={(row) => row.name} />
)

/* 6. DataTableColumnMenu keeps the same row type as its columns. */
export const columnMenu = (
  <DataTableColumnMenu
    columns={runColumns}
    hidden={new Set<string>()}
    onToggle={(key, visible) => {
      expectTypeOf(key).toEqualTypeOf<string>()
      expectTypeOf(visible).toEqualTypeOf<boolean>()
    }}
  />
)
// @ts-expect-error columns for a Run are not columns for a number
export const columnMenuWrongRow = <DataTableColumnMenu<number> columns={runColumns} hidden={new Set()} onToggle={() => {}} />

/* 7. Field's render prop receives the wiring, typed, not `any`. */
export const field = (
  <Field label="Workspace name">
    {(control) => {
      expectTypeOf(control).toEqualTypeOf<FieldControlProps>()
      expectTypeOf(control['aria-invalid']).toEqualTypeOf<true | undefined>()
      return <input {...control} />
    }}
  </Field>
)
// @ts-expect-error Field's child is a function of the control props, not a node
export const fieldWithNode = <Field label="Workspace name"><input /></Field>

/* 8. ToolCall: the status is the run-status union, and approval needs both decisions. */
expectTypeOf<ToolCallProps['status']>().toEqualTypeOf<RunStatusValue>()
export const toolCall = (
  <ToolCall
    name="rollout.query"
    status="waiting"
    approval={{ reason: 'Writes to production', onApprove: () => {}, onDeny: () => {} }}
  />
)
// @ts-expect-error `done` is not a run status
export const toolCallWrongStatus = <ToolCall name="rollout.query" status="done" />
// @ts-expect-error an approval without onDeny offers only one choice
export const toolCallHalfApproval = <ToolCall name="rollout.query" status="waiting" approval={{ reason: 'Writes', onApprove: () => {} }} />

/* 9. ChangeReview hands back a decision from the closed set. */
export const changeReview = (
  <ChangeReview
    title="Roll the help panel out to Starter"
    agent="Cayuco research agent"
    onDecide={(status, reason) => {
      expectTypeOf(status).toEqualTypeOf<'approved' | 'changes_requested' | 'rejected'>()
      expectTypeOf(reason).toEqualTypeOf<string | undefined>()
    }}
  />
)

/* 10. Variants<> turns cva's variants into props without cva's null. */
type ButtonVariantProps = Variants<typeof buttonVariants>
expectTypeOf<ButtonVariantProps['variant']>().toEqualTypeOf<'primary' | 'secondary' | 'danger' | 'ghost' | undefined>()
expectTypeOf<ButtonVariantProps['size']>().toEqualTypeOf<'sm' | 'md' | 'lg' | undefined>()
// @ts-expect-error null is not a size
export const nullSize: ButtonVariantProps = { size: null }
