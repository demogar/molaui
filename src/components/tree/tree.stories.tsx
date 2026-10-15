import type { Meta, StoryObj } from '@storybook/react-vite'
import { FileCode, FileText, Folder } from 'lucide-react'
import { useState } from 'react'

import { Tree, type TreeNode } from './tree'
import { HardState, HardStates as HardStatesFrame } from '../../docs/blocks/hard-states'
import { DirectionProvider } from '../../lib/direction'

const files: TreeNode[] = [
  {
    value: 'src',
    label: 'src',
    icon: <Folder />,
    children: [
      {
        value: 'src/retention',
        label: 'retention',
        icon: <Folder />,
        children: [
          { value: 'src/retention/policy.ts', label: 'policy.ts', icon: <FileCode /> },
          { value: 'src/retention/schedule.ts', label: 'schedule.ts', icon: <FileCode /> },
        ],
      },
      {
        value: 'src/billing',
        label: 'billing',
        icon: <Folder />,
        children: [{ value: 'src/billing/invoice.ts', label: 'invoice.ts', icon: <FileCode /> }],
      },
      { value: 'src/index.ts', label: 'index.ts', icon: <FileCode /> },
    ],
  },
  {
    value: 'docs',
    label: 'docs',
    icon: <Folder />,
    children: [{ value: 'docs/retention.md', label: 'retention.md', icon: <FileText /> }],
  },
  { value: 'CHANGES.md', label: 'CHANGES.md', icon: <FileText /> },
]

const meta = {
  title: 'Components/Navigation/Tree',
  tags: ['experimental'],
  component: Tree,
  args: {
    'aria-label': 'Files changed',
    items: files,
    defaultExpanded: ['src', 'src/retention'],
    defaultValue: 'src/retention/policy.ts',
    className: 'w-full max-w-72',
  },
  parameters: {
    docs: {
      description: {
        component:
          'A hierarchy you move through and pick from: the files of a proposed change, the sections of a knowledge base. Base UI has no tree, so this is the WAI-ARIA APG tree view written out: one tab stop; ArrowUp and ArrowDown through the visible items; **ArrowRight opens a branch, then enters it; ArrowLeft closes it, then climbs to its parent** (mirrored in right-to-left); Home, End, `*` and type-ahead. **Selection does not follow focus**: choosing an item usually loads something, so the arrows only move and Enter, Space or a click selects. The selected item is the current location, a shade with an ink bar, as in the sidebar; branches use the one disclosure marker, the plus that turns into a cross.',
      },
    },
  },
} satisfies Meta<typeof Tree>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  name: 'Files changed',
}

const sections: TreeNode[] = [
  {
    value: 'start',
    label: 'Getting started',
    children: [
      { value: 'start/workspace', label: 'Create a workspace' },
      { value: 'start/invite', label: 'Invite your team' },
    ],
  },
  {
    value: 'agents',
    label: 'Agents',
    children: [
      { value: 'agents/guardrails', label: 'Guardrails' },
      { value: 'agents/tools', label: 'Tools an agent may call' },
      {
        value: 'agents/evals',
        label: 'Evaluations',
        children: [
          { value: 'agents/evals/sets', label: 'Evaluation sets' },
          { value: 'agents/evals/scoring', label: 'Scoring' },
        ],
      },
    ],
  },
  {
    value: 'billing',
    label: 'Billing',
    children: [
      { value: 'billing/plans', label: 'Plans' },
      { value: 'billing/invoices', label: 'Invoices' },
      { value: 'billing/legacy', label: 'Legacy plans (archived)', disabled: true },
    ],
  },
]

function KnowledgeBaseDemo() {
  const [page, setPage] = useState<string | null>('agents/guardrails')
  const [expanded, setExpanded] = useState<string[]>(['agents'])
  return (
    <div className="flex flex-wrap items-start gap-6">
      <nav aria-labelledby="kb-heading" className="w-full max-w-64">
        <h2 id="kb-heading" className="m-0 mb-2 rotulo text-ink-2">
          Knowledge base
        </h2>
        <Tree
          aria-labelledby="kb-heading"
          items={sections}
          value={page}
          onValueChange={setPage}
          expanded={expanded}
          onExpandedChange={setExpanded}
        />
      </nav>
      <p className="m-0 text-sm text-ink-2" aria-live="polite">
        Showing <span className="literal">{page ?? 'nothing'}</span>
      </p>
    </div>
  )
}

export const KnowledgeBase: Story = {
  name: 'Knowledge base',
  render: () => <KnowledgeBaseDemo />,
  parameters: {
    docs: {
      description: {
        story:
          'Controlled, as navigation usually is: `value` is the page shown and `expanded` the open sections, both the caller’s. Named by the visible heading through `aria-labelledby`. The archived page stays in the tree and in the tab order, and cannot be selected.',
      },
    },
  },
}

export const Collapsed: Story = {
  args: {
    defaultExpanded: [],
    defaultValue: null,
  },
  parameters: {
    docs: {
      description: {
        story: 'Every branch closed and nothing selected: Tab lands on the first item. A closed branch’s children are not rendered, so the page holds only what a person can see.',
      },
    },
  },
}

export const HardStates: Story = {
  name: 'Hard states',
  tags: ['hard-states', '!autodocs'],
  render: () => (
    <HardStatesFrame>
      <HardState state="long-label">
        <Tree
          aria-label="Knowledge base, long titles"
          className="w-full"
          defaultExpanded={['refunds']}
          defaultValue="refunds/partial"
          items={[
            {
              value: 'refunds',
              label: 'Refunds, chargebacks and disputed payments',
              children: [
                { value: 'refunds/partial', label: 'When an agent may issue a partial refund without asking a person' },
                { value: 'refunds/limits', label: 'Limits per account and per day' },
              ],
            },
          ]}
        />
      </HardState>
      <HardState state="rtl">
        <DirectionProvider direction="rtl">
          <Tree
            aria-label="الملفات المعدّلة"
            className="w-full max-w-72"
            defaultExpanded={['src']}
            defaultValue="src/policy"
            items={[
              {
                value: 'src',
                label: 'المصدر',
                icon: <Folder />,
                children: [
                  { value: 'src/policy', label: 'السياسة', icon: <FileCode /> },
                  { value: 'src/schedule', label: 'الجدول', icon: <FileCode /> },
                ],
              },
              { value: 'docs', label: 'المستندات', icon: <Folder />, children: [] },
            ]}
          />
        </DirectionProvider>
      </HardState>
      <HardState state="disabled">
        <Tree
          aria-label="Files changed, one locked"
          className="w-full max-w-72"
          defaultValue="src/index.ts"
          items={[
            { value: 'src/index.ts', label: 'index.ts', icon: <FileCode /> },
            { value: 'src/billing/invoice.ts', label: 'invoice.ts · locked by review', icon: <FileCode />, disabled: true },
          ]}
        />
      </HardState>
    </HardStatesFrame>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'A long title truncates on one line, as a row in a scrolling sidebar has to, and keeps its full text for type-ahead; in right to left the indent, the bar and the arrow keys mirror; a disabled item is shown and focusable, muted, and says why in its label. A tree has no error state: a branch whose children fail to load says so in what it shows.',
      },
    },
  },
}
