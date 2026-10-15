import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { act, render } from '@/test/render'
import * as React from 'react'
import { afterAll, describe, expect, it } from 'vitest'

import { FORWARDS, type Forward } from '@/docs/usage/forwards'
import * as mola from '@/index'

/**
 * Every exported component is an open prop bag (docs/adr/0010-prop-vocabulary.md):
 *
 * - it accepts `ref`, and the ref reaches a DOM element;
 * - it forwards `data-*` (and with it `id`, `aria-*`, handlers) to the DOM,
 *   on the element the ref reaches;
 * - `className` lands on that element or on the box around it — the
 *   element that wears the cut — and never moves when a `label` is added;
 * - that box carries a `data-slot`, the stable hook CSS, tests and
 *   `AvatarGroup` select on.
 *
 * About eighteen components used to be closed: a hand-picked list of props,
 * no `ref`, no `data-testid`, no `id` for `aria-controls`, and `className` on
 * the control or a wrapper depending on whether a `label` was passed.
 *
 * Each export needs a FIXTURE that renders it with the props it requires
 * (and the parent it needs), spreading the probe onto it; a new export with
 * no fixture fails here. EXEMPT is for components that render no element of
 * their own, with the reason.
 *
 * Where each component put the probe is also checked against
 * src/docs/usage/forwards.ts, which the agent manifest publishes, so the
 * docs say which element takes `className` and which takes `ref` because
 * this test saw it there. Rerun with `WRITE_FORWARDS=1` to rewrite that file
 * after a deliberate change, and review the diff.
 */

type Probe = { ref: React.RefCallback<Element>; className: string; 'data-probe': string }
type Fixture = (probe: Probe) => React.ReactElement
type LabelFixture = { plain: Fixture; labelled: Fixture }

const EXEMPT: Record<string, string> = {
  DirectionProvider: 'a context provider; renders its children only',
  MessagesProvider: 'a context provider; renders its children only',
  ToastProvider: 'a context provider; renders its children and a portalled viewport',
  TooltipProvider: 'a context provider; renders its children only',
  HotkeysProvider: 'a context provider; renders its children only',
  Dialog: 'the Base UI root; DialogContent is the element',
  Drawer: 'the Base UI root; DrawerContent is the element',
  Popover: 'the Base UI root; PopoverContent is the element',
  Menu: 'the Base UI root; MenuContent is the element',
  MenuSubmenu: 'the Base UI root; its trigger and content are the elements',
  SelectRoot: 'the Base UI root; SelectTrigger and SelectContent are the elements',
  Field: 'wires a label, description and error to a control it renders through a function',
  TableSkeletonRows: 'renders several rows and no element of its own',
}

/**
 * Components whose `className` goes to the content inside the element, with
 * the reason. Their element still takes `ref` and `data-*`.
 */
const CLASS_ON_CONTENT: Record<string, string> = {
  AccordionPanel: 'the panel animates its height; padding on it would be clipped',
  CollapsiblePanel: 'the panel animates its height; padding on it would be clipped',
}

const noop = () => {}
const today = new Date(2026, 9, 14)
const columns = [{ key: 'name', header: 'Name' }]
const rows = [{ id: 'r1', name: 'Ingest' }]
const options = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Beta' },
]

const FIXTURES: Record<string, Fixture | LabelFixture> = {
  // AI layer
  AgentRun: (p) => <mola.AgentRun {...p} name="Cayuco research agent" runId="run_1" status="running" steps={[]} />,
  ChangeCount: (p) => <mola.ChangeCount {...p} added={1} removed={2} />,
  ChangeReview: (p) => <mola.ChangeReview {...p} agent="Cayuco agent" title="Roll out" />,
  FieldChanges: (p) => <mola.FieldChanges {...p} title="Fields" changes={[]} />,
  FileDiff: (p) => <mola.FileDiff {...p} path="a.ts" />,
  SideBySideDiff: (p) => <mola.SideBySideDiff {...p} title="Prompt" before="a" after="b" />,
  Confidence: (p) => <mola.Confidence {...p} level="high" />,
  UncertaintyNote: (p) => <mola.UncertaintyNote {...p}>Unsure</mola.UncertaintyNote>,
  Message: (p) => <mola.Message {...p} role="assistant">Hi</mola.Message>,
  Thread: (p) => <mola.Thread {...p} label="Conversation" />,
  AttachmentChip: (p) => <mola.AttachmentChip {...p} name="a.csv" />,
  PromptInput: (p) => <mola.PromptInput {...p} label="Ask" onSubmit={noop} />,
  Reasoning: (p) => <mola.Reasoning {...p} text="Thinking" />,
  PartialOutput: (p) => <mola.PartialOutput {...p}>Partial</mola.PartialOutput>,
  RunError: (p) => <mola.RunError {...p} />,
  RunStatus: (p) => <mola.RunStatus {...p} status="running" />,
  RunStatusGlyph: (p) => <mola.RunStatusGlyph {...p} status="running" />,
  Citation: (p) => <mola.Citation {...p} n={1} />,
  SourceList: (p) => <mola.SourceList {...p} sources={[{ id: 1, title: 'Doc', href: '#', domain: 'docs.cayuco.example' }]} />,
  Caret: (p) => <mola.Caret {...p} />,
  StreamingText: (p) => <mola.StreamingText {...p} text="Hello" />,
  Markdown: (p) => <mola.Markdown {...p} text="Hello" />,
  TokenUsage: (p) => <mola.TokenUsage {...p} input={1} output={2} />,
  ToolCall: (p) => <mola.ToolCall {...p} name="query" status="succeeded" />,
  ToolCallGroup: (p) => <mola.ToolCallGroup {...p} count={1} />,

  // Actions and display
  Button: (p) => <mola.Button {...p}>Run</mola.Button>,
  ButtonArrow: (p) => <mola.ButtonArrow {...p} />,
  IconButton: (p) => (
    <mola.IconButton {...p} label="Close">
      <svg />
    </mola.IconButton>
  ),
  Avatar: (p) => <mola.Avatar {...p} name="Ana Ruiz" />,
  AvatarGroup: (p) => (
    <mola.AvatarGroup {...p} label="Team">
      <mola.Avatar name="Ana Ruiz" />
    </mola.AvatarGroup>
  ),
  Code: (p) => <mola.Code {...p}>x</mola.Code>,
  CodeBlock: (p) => <mola.CodeBlock {...p} code="x" />,
  DescriptionList: (p) => <mola.DescriptionList {...p} items={[{ term: 'A', detail: 'B' }]} />,
  Sparkline: (p) => <mola.Sparkline {...p} values={[1, 2, 3]} />,
  Stat: (p) => <mola.Stat {...p} label="Runs" value="12" />,
  StatGroup: (p) => <mola.StatGroup {...p} />,
  Swatch: (p) => <mola.Swatch {...p} />,

  // Table
  Table: (p) => <mola.Table {...p} aria-label="Runs" />,
  TableBody: (p) => (
    <mola.Table aria-label="Runs">
      <mola.TableBody {...p} />
    </mola.Table>
  ),
  TableCaption: (p) => (
    <mola.Table>
      <mola.TableCaption {...p}>Runs</mola.TableCaption>
    </mola.Table>
  ),
  TableCell: (p) => (
    <mola.Table aria-label="Runs">
      <mola.TableBody>
        <mola.TableRow>
          <mola.TableCell {...p}>x</mola.TableCell>
        </mola.TableRow>
      </mola.TableBody>
    </mola.Table>
  ),
  TableCheckbox: (p) => <mola.TableCheckbox {...p} aria-label="Select" />,
  TableEmpty: (p) => (
    <mola.Table aria-label="Runs">
      <mola.TableBody>
        <mola.TableEmpty {...p} colSpan={1} />
      </mola.TableBody>
    </mola.Table>
  ),
  TableFooter: (p) => (
    <mola.Table aria-label="Runs">
      <mola.TableFooter {...p} />
    </mola.Table>
  ),
  TableHead: (p) => (
    <mola.Table aria-label="Runs">
      <mola.TableHeader>
        <mola.TableRow>
          <mola.TableHead {...p}>Name</mola.TableHead>
        </mola.TableRow>
      </mola.TableHeader>
    </mola.Table>
  ),
  TableHeader: (p) => (
    <mola.Table aria-label="Runs">
      <mola.TableHeader {...p} />
    </mola.Table>
  ),
  TableRow: (p) => (
    <mola.Table aria-label="Runs">
      <mola.TableBody>
        <mola.TableRow {...p} />
      </mola.TableBody>
    </mola.Table>
  ),
  DataTable: (p) => <mola.DataTable {...p} label="Runs" columns={columns} rows={rows} getRowId={(r) => r.id} />,
  DataTableColumnMenu: (p) => <mola.DataTableColumnMenu {...p} columns={columns} hidden={new Set()} onToggle={noop} />,
  StepList: (p) => <mola.StepList {...p} items={[{ title: 'One' }]} />,
  Timeline: (p) => <mola.Timeline {...p} label="Log" items={[{ title: 'One' }]} />,
  RelativeTime: (p) => <mola.RelativeTime {...p} date={today} now={today} />,

  // Feedback
  Badge: (p) => <mola.Badge {...p}>New</mola.Badge>,
  RecommendationBadge: (p) => <mola.RecommendationBadge {...p} />,
  StatusDot: (p) => <mola.StatusDot {...p} />,
  Callout: (p) => <mola.Callout {...p}>Note</mola.Callout>,
  Banner: (p) => <mola.Banner {...p}>Maintenance tonight</mola.Banner>,
  NotificationCentre: (p) => <mola.NotificationCentre {...p} defaultOpen notifications={[]} />,
  NotificationList: (p) => <mola.NotificationList {...p} notifications={[]} />,
  EmptyState: (p) => <mola.EmptyState {...p} title="Nothing" />,
  Placeholder: (p) => <mola.Placeholder {...p} name="Logo" alt="No logo" />,
  Meter: (p) => <mola.Meter {...p} label="Disk" value={10} />,
  Progress: (p) => <mola.Progress {...p} label="Upload" value={10} />,
  Skeleton: (p) => <mola.Skeleton {...p} />,
  SkeletonGroup: (p) => <mola.SkeletonGroup {...p} loading label="Loading" fallback={<mola.Skeleton />} />,
  SkeletonText: (p) => <mola.SkeletonText {...p} />,

  // Forms
  Checkbox: {
    plain: (p) => <mola.Checkbox {...p} aria-label="Agree" />,
    labelled: (p) => <mola.Checkbox {...p} label="Agree" />,
  },
  CheckboxGroup: (p) => <mola.CheckboxGroup {...p} legend="Pick" />,
  Chip: (p) => <mola.Chip {...p}>Failed</mola.Chip>,
  ChipGroup: (p) => <mola.ChipGroup {...p} legend="Status" />,
  Autocomplete: {
    plain: (p) => <mola.Autocomplete {...p} aria-label="Region" items={['EU', 'US']} />,
    labelled: (p) => <mola.Autocomplete {...p} label="Region" items={['EU', 'US']} />,
  },
  Combobox: {
    plain: (p) => <mola.Combobox {...p} aria-label="Region" items={options} />,
    labelled: (p) => <mola.Combobox {...p} label="Region" items={options} />,
  },
  Calendar: (p) => <mola.Calendar {...p} today={today} />,
  DatePicker: (p) => <mola.DatePicker {...p} aria-label="Due" today={today} />,
  DateRangePicker: (p) => <mola.DateRangePicker {...p} aria-label="Period" today={today} />,
  TimePicker: (p) => <mola.TimePicker {...p} aria-label="Run at" />,
  DateTimePicker: (p) => <mola.DateTimePicker {...p} aria-label="Deploy at" today={today} />,
  Label: (p) => <mola.Label {...p}>Name</mola.Label>,
  Input: {
    plain: (p) => <mola.Input {...p} aria-label="Name" />,
    labelled: (p) => <mola.Input {...p} aria-label="Name" leading="$" />,
  },
  Textarea: (p) => <mola.Textarea {...p} aria-label="Notes" />,
  SearchInput: (p) => <mola.SearchInput {...p} aria-label="Search" />,
  FileUpload: (p) => <mola.FileUpload {...p} />,
  Form: (p) => <mola.Form {...p} aria-label="Webhook" />,
  // The summary renders only while a field in its form has an error.
  FormErrorSummary: (p) => (
    <mola.Form aria-label="Webhook">
      <mola.FormErrorSummary {...p} />
      <mola.Field label="Name" error="Required.">
        {(control) => <mola.Input {...control} />}
      </mola.Field>
    </mola.Form>
  ),
  Fieldset: (p) => <mola.Fieldset {...p} legend="Retry delays" />,
  NumberInput: {
    plain: (p) => <mola.NumberInput {...p} aria-label="Count" />,
    labelled: (p) => <mola.NumberInput {...p} label="Count" />,
  },
  Radio: {
    plain: (p) => (
      <mola.RadioGroup label="Plan">
        <mola.Radio {...p} value="a" aria-label="A" />
      </mola.RadioGroup>
    ),
    labelled: (p) => (
      <mola.RadioGroup label="Plan">
        <mola.Radio {...p} value="a" label="A" />
      </mola.RadioGroup>
    ),
  },
  RadioGroup: (p) => <mola.RadioGroup {...p} label="Plan" />,
  SegmentedControl: (p) => <mola.SegmentedControl {...p} aria-label="View" options={options} />,
  Listbox: (p) => <mola.Listbox {...p} aria-label="Region" options={options} />,
  TagGroup: (p) => <mola.TagGroup {...p} aria-label="Labels" items={options} />,
  Select: {
    plain: (p) => <mola.Select {...p} aria-label="Region" items={options} />,
    labelled: (p) => <mola.Select {...p} label="Region" items={options} />,
  },
  SelectContent: (p) => (
    <mola.SelectRoot open items={options}>
      <mola.SelectTrigger aria-label="Region">
        <mola.SelectValue />
      </mola.SelectTrigger>
      <mola.SelectContent {...p}>
        <mola.SelectItem value="a">Alpha</mola.SelectItem>
      </mola.SelectContent>
    </mola.SelectRoot>
  ),
  SelectGroup: (p) => (
    <mola.SelectRoot open>
      <mola.SelectTrigger aria-label="Region" />
      <mola.SelectContent>
        <mola.SelectGroup {...p}>
          <mola.SelectGroupLabel>Group</mola.SelectGroupLabel>
          <mola.SelectItem value="a">Alpha</mola.SelectItem>
        </mola.SelectGroup>
      </mola.SelectContent>
    </mola.SelectRoot>
  ),
  SelectGroupLabel: (p) => (
    <mola.SelectRoot open>
      <mola.SelectTrigger aria-label="Region" />
      <mola.SelectContent>
        <mola.SelectGroup>
          <mola.SelectGroupLabel {...p}>Group</mola.SelectGroupLabel>
          <mola.SelectItem value="a">Alpha</mola.SelectItem>
        </mola.SelectGroup>
      </mola.SelectContent>
    </mola.SelectRoot>
  ),
  SelectItem: (p) => (
    <mola.SelectRoot open>
      <mola.SelectTrigger aria-label="Region" />
      <mola.SelectContent>
        <mola.SelectItem {...p} value="a">
          Alpha
        </mola.SelectItem>
      </mola.SelectContent>
    </mola.SelectRoot>
  ),
  SelectSeparator: (p) => (
    <mola.SelectRoot open>
      <mola.SelectTrigger aria-label="Region" />
      <mola.SelectContent>
        <mola.SelectItem value="a">Alpha</mola.SelectItem>
        <mola.SelectSeparator {...p} />
        <mola.SelectItem value="b">Beta</mola.SelectItem>
      </mola.SelectContent>
    </mola.SelectRoot>
  ),
  SelectTrigger: (p) => (
    <mola.SelectRoot>
      <mola.SelectTrigger {...p} aria-label="Region" />
    </mola.SelectRoot>
  ),
  SelectValue: (p) => (
    <mola.SelectRoot>
      <mola.SelectTrigger aria-label="Region">
        <mola.SelectValue {...p} />
      </mola.SelectTrigger>
    </mola.SelectRoot>
  ),
  Slider: (p) => <mola.Slider {...p} aria-label="Volume" defaultValue={10} />,
  Switch: {
    plain: (p) => <mola.Switch {...p} aria-label="On" />,
    labelled: (p) => <mola.Switch {...p} label="On" />,
  },

  // App shell and layout
  AppShell: (p) => (
    <mola.AppShell {...p} topbar={<mola.Topbar />} sidebar={<mola.Sidebar label="Main" />}>
      Work
    </mola.AppShell>
  ),
  SidebarToggle: (p) => (
    <mola.AppShell topbar={<mola.SidebarToggle {...p} />} sidebar={<mola.Sidebar label="Main" />}>
      Work
    </mola.AppShell>
  ),
  Topbar: (p) => <mola.Topbar {...p} />,
  NavItem: (p) => (
    <ul>
      <mola.NavItem {...p} href="#runs">
        Runs
      </mola.NavItem>
    </ul>
  ),
  NavSection: (p) => (
    <mola.NavSection {...p} title="Platform">
      <mola.NavItem href="#runs">Runs</mola.NavItem>
    </mola.NavSection>
  ),
  Sidebar: (p) => <mola.Sidebar {...p} label="Main" />,
  Container: (p) => <mola.Container {...p} />,
  Section: (p) => <mola.Section {...p} />,
  SectionHeader: (p) => <mola.SectionHeader {...p} title="Runs" />,
  Divider: (p) => <mola.Divider {...p} />,
  Grid: (p) => <mola.Grid {...p} />,
  PageHeader: (p) => <mola.PageHeader {...p} title="Runs" />,
  Panel: (p) => <mola.Panel {...p} />,
  Stack: (p) => <mola.Stack {...p} />,
  Inline: (p) => <mola.Inline {...p} />,
  RowBetween: (p) => <mola.RowBetween {...p} />,

  // Toolbar
  Toolbar: (p) => <mola.Toolbar {...p} aria-label="Format" />,
  ToolbarButton: (p) => (
    <mola.Toolbar aria-label="Format">
      <mola.ToolbarButton {...p}>Bold</mola.ToolbarButton>
    </mola.Toolbar>
  ),
  ToolbarGroup: (p) => (
    <mola.Toolbar aria-label="Format">
      <mola.ToolbarGroup {...p} />
    </mola.Toolbar>
  ),
  ToolbarInput: (p) => (
    <mola.Toolbar aria-label="Format">
      <mola.ToolbarInput {...p} aria-label="Find" />
    </mola.Toolbar>
  ),
  ToolbarOverflow: (p) => (
    <mola.Toolbar aria-label="Format">
      <mola.ToolbarOverflow {...p} items={[{ key: 'a', label: 'Archive', onSelect: noop }]} />
    </mola.Toolbar>
  ),
  ToolbarSeparator: (p) => (
    <mola.Toolbar aria-label="Format">
      <mola.ToolbarButton>Bold</mola.ToolbarButton>
      <mola.ToolbarSeparator {...p} />
      <mola.ToolbarButton>Italic</mola.ToolbarButton>
    </mola.Toolbar>
  ),
  ToolbarToggle: (p) => (
    <mola.Toolbar aria-label="Format">
      <mola.ToolbarToggleGroup aria-label="Style">
        <mola.ToolbarToggle {...p} value="bold">
          Bold
        </mola.ToolbarToggle>
      </mola.ToolbarToggleGroup>
    </mola.Toolbar>
  ),
  ToolbarToggleGroup: (p) => (
    <mola.Toolbar aria-label="Format">
      <mola.ToolbarToggleGroup {...p} aria-label="Style" />
    </mola.Toolbar>
  ),

  // Disclosure and navigation
  Accordion: (p) => <mola.Accordion {...p} />,
  AccordionItem: (p) => (
    <mola.Accordion>
      <mola.AccordionItem {...p} value="a" />
    </mola.Accordion>
  ),
  AccordionPanel: (p) => (
    <mola.Accordion defaultValue={['a']}>
      <mola.AccordionItem value="a">
        <mola.AccordionTrigger>A</mola.AccordionTrigger>
        <mola.AccordionPanel {...p}>Body</mola.AccordionPanel>
      </mola.AccordionItem>
    </mola.Accordion>
  ),
  AccordionTrigger: (p) => (
    <mola.Accordion>
      <mola.AccordionItem value="a">
        <mola.AccordionTrigger {...p}>A</mola.AccordionTrigger>
      </mola.AccordionItem>
    </mola.Accordion>
  ),
  Collapsible: (p) => <mola.Collapsible {...p} />,
  CollapsiblePanel: (p) => (
    <mola.Collapsible defaultOpen>
      <mola.CollapsibleTrigger>More</mola.CollapsibleTrigger>
      <mola.CollapsiblePanel {...p}>Body</mola.CollapsiblePanel>
    </mola.Collapsible>
  ),
  CollapsibleTrigger: (p) => (
    <mola.Collapsible>
      <mola.CollapsibleTrigger {...p}>More</mola.CollapsibleTrigger>
    </mola.Collapsible>
  ),
  Breadcrumb: (p) => <mola.Breadcrumb {...p} items={[{ label: 'Home', href: '/' }, { label: 'Here' }]} />,
  Link: (p) => (
    <mola.Link {...p} href="/runs">
      Runs
    </mola.Link>
  ),
  LinkButton: (p) => (
    <mola.LinkButton {...p} href="/runs">
      Open run
    </mola.LinkButton>
  ),
  Pagination: (p) => <mola.Pagination {...p} page={1} pageCount={3} onPageChange={noop} />,
  Stepper: (p) => (
    <mola.Stepper {...p} label="Steps" steps={[{ id: 'a', title: 'Basics' }]}>
      {() => null}
    </mola.Stepper>
  ),
  Tabs: (p) => <mola.Tabs {...p} />,
  Tree: (p) => <mola.Tree {...p} aria-label="Files" items={options} />,
  TabsList: (p) => (
    <mola.Tabs defaultValue="a">
      <mola.TabsList {...p}>
        <mola.TabsTab value="a">A</mola.TabsTab>
      </mola.TabsList>
    </mola.Tabs>
  ),
  TabsPanel: (p) => (
    <mola.Tabs defaultValue="a">
      <mola.TabsList>
        <mola.TabsTab value="a">A</mola.TabsTab>
      </mola.TabsList>
      <mola.TabsPanel {...p} value="a">
        Body
      </mola.TabsPanel>
    </mola.Tabs>
  ),
  TabsTab: (p) => (
    <mola.Tabs defaultValue="a">
      <mola.TabsList>
        <mola.TabsTab {...p} value="a">
          A
        </mola.TabsTab>
      </mola.TabsList>
    </mola.Tabs>
  ),

  // Overlays
  CommandPalette: (p) => <mola.CommandPalette {...p} defaultOpen groups={[]} />,
  AlertDialog: (p) => (
    <mola.AlertDialog {...p} defaultOpen title="Delete run?" description="It cannot be undone." confirmLabel="Delete run" onConfirm={noop} />
  ),
  DialogClose: (p) => (
    <mola.Dialog open>
      <mola.DialogContent title="Edit">
        <mola.DialogClose {...p}>Done</mola.DialogClose>
      </mola.DialogContent>
    </mola.Dialog>
  ),
  DialogContent: (p) => (
    <mola.Dialog open>
      <mola.DialogContent {...p} title="Edit" />
    </mola.Dialog>
  ),
  DialogTrigger: (p) => (
    <mola.Dialog>
      <mola.DialogTrigger {...p}>Open</mola.DialogTrigger>
    </mola.Dialog>
  ),
  DrawerClose: (p) => (
    <mola.Drawer open>
      <mola.DrawerContent title="Run">
        <mola.DrawerClose {...p}>Done</mola.DrawerClose>
      </mola.DrawerContent>
    </mola.Drawer>
  ),
  DrawerContent: (p) => (
    <mola.Drawer open>
      <mola.DrawerContent {...p} title="Run" />
    </mola.Drawer>
  ),
  DrawerTrigger: (p) => (
    <mola.Drawer>
      <mola.DrawerTrigger {...p}>Open</mola.DrawerTrigger>
    </mola.Drawer>
  ),
  MenuCheckboxItem: (p) => (
    <mola.Menu open>
      <mola.MenuTrigger>Actions</mola.MenuTrigger>
      <mola.MenuContent>
        <mola.MenuCheckboxItem {...p}>Wrap</mola.MenuCheckboxItem>
      </mola.MenuContent>
    </mola.Menu>
  ),
  MenuContent: (p) => (
    <mola.Menu open>
      <mola.MenuTrigger>Actions</mola.MenuTrigger>
      <mola.MenuContent {...p}>
        <mola.MenuItem>Edit</mola.MenuItem>
      </mola.MenuContent>
    </mola.Menu>
  ),
  MenuGroup: (p) => (
    <mola.Menu open>
      <mola.MenuTrigger>Actions</mola.MenuTrigger>
      <mola.MenuContent>
        <mola.MenuGroup {...p}>
          <mola.MenuGroupLabel>Run</mola.MenuGroupLabel>
          <mola.MenuItem>Edit</mola.MenuItem>
        </mola.MenuGroup>
      </mola.MenuContent>
    </mola.Menu>
  ),
  MenuGroupLabel: (p) => (
    <mola.Menu open>
      <mola.MenuTrigger>Actions</mola.MenuTrigger>
      <mola.MenuContent>
        <mola.MenuGroup>
          <mola.MenuGroupLabel {...p}>Run</mola.MenuGroupLabel>
          <mola.MenuItem>Edit</mola.MenuItem>
        </mola.MenuGroup>
      </mola.MenuContent>
    </mola.Menu>
  ),
  MenuItem: (p) => (
    <mola.Menu open>
      <mola.MenuTrigger>Actions</mola.MenuTrigger>
      <mola.MenuContent>
        <mola.MenuItem {...p}>Edit</mola.MenuItem>
      </mola.MenuContent>
    </mola.Menu>
  ),
  MenuRadioGroup: (p) => (
    <mola.Menu open>
      <mola.MenuTrigger>Actions</mola.MenuTrigger>
      <mola.MenuContent>
        <mola.MenuRadioGroup {...p}>
          <mola.MenuRadioItem value="a">A</mola.MenuRadioItem>
        </mola.MenuRadioGroup>
      </mola.MenuContent>
    </mola.Menu>
  ),
  MenuRadioItem: (p) => (
    <mola.Menu open>
      <mola.MenuTrigger>Actions</mola.MenuTrigger>
      <mola.MenuContent>
        <mola.MenuRadioGroup>
          <mola.MenuRadioItem {...p} value="a">
            A
          </mola.MenuRadioItem>
        </mola.MenuRadioGroup>
      </mola.MenuContent>
    </mola.Menu>
  ),
  MenuSeparator: (p) => (
    <mola.Menu open>
      <mola.MenuTrigger>Actions</mola.MenuTrigger>
      <mola.MenuContent>
        <mola.MenuItem>Edit</mola.MenuItem>
        <mola.MenuSeparator {...p} />
        <mola.MenuItem>Delete</mola.MenuItem>
      </mola.MenuContent>
    </mola.Menu>
  ),
  MenuShortcut: (p) => <mola.MenuShortcut {...p}>⌘E</mola.MenuShortcut>,
  MenuSubmenuTrigger: (p) => (
    <mola.Menu open>
      <mola.MenuTrigger>Actions</mola.MenuTrigger>
      <mola.MenuContent>
        <mola.MenuSubmenu>
          <mola.MenuSubmenuTrigger {...p}>Move</mola.MenuSubmenuTrigger>
        </mola.MenuSubmenu>
      </mola.MenuContent>
    </mola.Menu>
  ),
  MenuTrigger: (p) => (
    <mola.Menu>
      <mola.MenuTrigger {...p}>Actions</mola.MenuTrigger>
    </mola.Menu>
  ),
  PopoverClose: (p) => (
    <mola.Popover open>
      <mola.PopoverTrigger>Open</mola.PopoverTrigger>
      <mola.PopoverContent>
        <mola.PopoverClose {...p}>Done</mola.PopoverClose>
      </mola.PopoverContent>
    </mola.Popover>
  ),
  ShortcutsDialog: (p) => <mola.ShortcutsDialog {...p} defaultOpen />,
  PopoverContent: (p) => (
    <mola.Popover open>
      <mola.PopoverTrigger>Open</mola.PopoverTrigger>
      <mola.PopoverContent {...p}>Body</mola.PopoverContent>
    </mola.Popover>
  ),
  PopoverTrigger: (p) => (
    <mola.Popover>
      <mola.PopoverTrigger {...p}>Open</mola.PopoverTrigger>
    </mola.Popover>
  ),
  Tooltip: (p) => (
    <mola.Tooltip {...p} defaultOpen content="Close">
      <button type="button">x</button>
    </mola.Tooltip>
  ),

  // Typography
  Display: (p) => <mola.Display {...p}>Runs</mola.Display>,
  Heading: (p) => <mola.Heading {...p} level={2}>Runs</mola.Heading>,
  Kbd: (p) => <mola.Kbd {...p}>K</mola.Kbd>,
  KbdChord: (p) => <mola.KbdChord {...p} keys={['⌘', 'K']} />,
  Lead: (p) => <mola.Lead {...p}>Intro</mola.Lead>,
  Meta: (p) => <mola.Meta {...p}>Updated</mola.Meta>,
  Prose: (p) => <mola.Prose {...p} />,
  Pullquote: (p) => <mola.Pullquote {...p}>Said</mola.Pullquote>,
  Rotulo: (p) => <mola.Rotulo {...p}>Label</mola.Rotulo>,
  Text: (p) => <mola.Text {...p}>Body</mola.Text>,
}

/** Exported React components: capitalised functions (and memo/forwardRef objects), minus contexts. */
const components = Object.entries(mola)
  .filter(([name, value]) => /^[A-Z]/.test(name) && (typeof value === 'function' || (typeof value === 'object' && value !== null && '$$typeof' in value && !('Provider' in value))))
  .map(([name]) => name)
  .sort()

interface Seen {
  probe: Element | null
  ref: Element | null
  classed: Element | null
  forward: Forward
}

/** `<input data-slot="input">`, the way the docs name an element. */
function descriptor(el: Element | null): string | null {
  if (!el) return null
  const slot = el.getAttribute('data-slot')
  return `<${el.tagName.toLowerCase()}${slot ? ` data-slot="${slot}"` : ''}>`
}

async function mount(fixture: Fixture, name: string): Promise<Seen> {
  let refNode: Element | null = null
  const probe: Probe = {
    ref: (node) => {
      if (node) refNode = node
    },
    className: 'prop-bag-probe',
    'data-probe': name,
  }
  const view = render(fixture(probe))
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0))
  })
  const probeEl = document.querySelector(`[data-probe="${name}"]`)
  const classed = document.querySelector('.prop-bag-probe')
  const element = descriptor(probeEl)
  const classTarget = descriptor(classed)
  const seen: Seen = {
    probe: probeEl,
    ref: refNode,
    classed,
    forward: { element, ...(classed !== probeEl && classTarget ? { className: classTarget } : {}) },
  }
  view.unmount()
  return seen
}

/** What is wrong with where a component put the probe, or nothing. */
function problems({ probe, ref, classed }: Seen, onContent = false): string[] {
  const found: string[] = []
  if (!probe) found.push('data-* was dropped')
  if (!(ref instanceof Element)) found.push('ref reached no element')
  else if (probe && ref !== probe) found.push(`ref reached <${ref.tagName.toLowerCase()}> but data-* went to <${probe.tagName.toLowerCase()}>`)
  if (!classed) found.push('className was dropped')
  else if (onContent) {
    if (probe && !probe.contains(classed)) found.push('className went outside the element')
  } else if (probe && classed !== probe && !classed.contains(probe)) {
    found.push('className went to an element that is not the control or its box')
  }
  const slotted = onContent ? probe : classed
  if (slotted && !slotted.hasAttribute('data-slot')) found.push(`<${slotted.tagName.toLowerCase()}> has no data-slot`)
  return found
}

const observed: Record<string, Forward> = Object.fromEntries(Object.keys(EXEMPT).map((name) => [name, { element: null }]))

afterAll(() => {
  if (!process.env.WRITE_FORWARDS) return
  const sorted = Object.fromEntries(Object.entries(observed).sort(([a], [b]) => a.localeCompare(b)))
  const body = `/**
 * Where each exported component sends \`className\`, and where \`ref\` and the
 * other DOM props go (docs/adr/0010-prop-vocabulary.md). \`element\` takes
 * \`ref\`, \`id\`, \`data-*\` and the rest; \`className\` is named only when it goes
 * somewhere else (the box around a control, or the content inside a panel).
 * \`null\` is a component that renders no element of its own.
 *
 * Observed, not written: src/test/prop-bags.test.tsx renders every component
 * and fails when this file disagrees with what it saw. \`WRITE_FORWARDS=1 npx
 * vitest run src/test/prop-bags.test.tsx\` rewrites it. The agent manifest
 * publishes it with each component's props.
 */
export interface Forward {
  element: string | null
  className?: string
}

export const FORWARDS: Record<string, Forward> = {
${Object.entries(sorted)
  .map(([name, f]) => {
    const quote = (v: string | null) => (v === null ? 'null' : `'${v}'`)
    return `  ${name}: { element: ${quote(f.element)}${f.className ? `, className: ${quote(f.className)}` : ''} },`
  })
  .join('\n')}
}
`
  writeFileSync(resolve(import.meta.dirname, '../docs/usage/forwards.ts'), body)
})

describe('every exported component accepts ref, data-* and className', () => {
  it('forwards.ts names every component, exempt ones as rendering no element', () => {
    expect(Object.keys(FORWARDS).sort()).toEqual(components)
    for (const name of Object.keys(EXEMPT)) expect(FORWARDS[name], name).toEqual({ element: null })
  })

  it('has a fixture or an exemption for every export, and no stale ones', () => {
    const missing = components.filter((name) => !(name in FIXTURES) && !(name in EXEMPT))
    const stale = [...Object.keys(FIXTURES), ...Object.keys(EXEMPT)].filter((name) => !components.includes(name))
    expect({ missing, stale }).toEqual({ missing: [], stale: [] })
  })

  for (const name of components.filter((n) => n in FIXTURES)) {
    const fixture = FIXTURES[name]!
    it(name, async () => {
      if (typeof fixture === 'function') {
        const seen = await mount(fixture, name)
        observed[name] = seen.forward
        expect(problems(seen, name in CLASS_ON_CONTENT)).toEqual([])
        expect(seen.forward).toEqual(FORWARDS[name])
        return
      }
      const plain = await mount(fixture.plain, name)
      const labelled = await mount(fixture.labelled, name)
      observed[name] = plain.forward
      expect([...problems(plain), ...problems(labelled).map((p) => `with a label: ${p}`)]).toEqual([])
      expect(plain.forward).toEqual(FORWARDS[name])
      // The same element, by its slot, takes className with or without a label.
      expect(labelled.classed?.getAttribute('data-slot')).toBe(plain.classed?.getAttribute('data-slot'))
    })
  }
})
