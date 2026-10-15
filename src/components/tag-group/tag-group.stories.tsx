import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { Button } from '../button'
import { TagGroup, type TagGroupItem } from './tag-group'

const labels: TagGroupItem[] = [
  { value: 'billing', label: 'Billing' },
  { value: 'retention', label: 'Retention' },
  { value: 'pii', label: 'Contains PII' },
  { value: 'q3', label: 'Q3 review' },
  { value: 'eval', label: 'Evaluation set' },
]

const meta = {
  title: 'Components/Forms/Tag group',
  tags: ['experimental'],
  component: TagGroup,
  args: {
    'aria-label': 'Dataset labels',
    items: labels,
  },
  parameters: {
    docs: {
      description: {
        component:
          'A set of short values shown as tags, which can be **removed**, and **selected** when the set is also a choice. It is one tab stop: the group is a WAI-ARIA `grid` and each tag a focusable `row`, so the arrows move between tags and Tab leaves, instead of two tab stops per tag. **Delete** or **Backspace** removes the focused tag and focus moves to the one that took its place; the × is a real button named “Remove <label>”, for a pointer and a screen reader’s browse mode. A selected tag is a chosen value: the ink fill and a check, as on a checked chip.',
      },
    },
  },
} satisfies Meta<typeof TagGroup>

export default meta
type Story = StoryObj<typeof meta>

/** Read-only: no × and no selection, still one tab stop with arrow keys. */
export const Default: Story = {}

function RemovableDemo() {
  const [items, setItems] = useState(labels)
  return (
    <div className="flex max-w-md flex-col gap-3">
      <TagGroup
        aria-label="Dataset labels"
        items={items}
        onRemove={(value) => setItems((current) => current.filter((item) => item.value !== value))}
        empty="No labels. This dataset is not grouped anywhere."
      />
      <div>
        <Button variant="secondary" size="sm" onClick={() => setItems(labels)}>
          Restore labels
        </Button>
      </div>
    </div>
  )
}

export const Removable: Story = {
  render: () => <RemovableDemo />,
  parameters: {
    docs: {
      description: {
        story:
          'With `onRemove`, each tag has an × and answers Delete and Backspace. The group does not own the list: remove the item in your state, and focus moves to the tag that took its place, or to the group once it is empty, where `empty` says so in words.',
      },
    },
  },
}

export const Selectable: Story = {
  args: {
    'aria-label': 'Tools the agent may call',
    selectionMode: 'multiple',
    defaultValue: ['search', 'sql'],
    items: [
      { value: 'search', label: 'Search documents' },
      { value: 'sql', label: 'Query warehouse' },
      { value: 'email', label: 'Send email' },
      { value: 'refund', label: 'Issue refund', disabled: true },
    ],
  },
  parameters: {
    docs: {
      description: {
        story:
          'With `selectionMode="multiple"`, Space, Enter or a click toggles a tag. The chosen ones take the ink fill and a check; the locked one keeps its place and its name, on the shaded ground.',
      },
    },
  },
}

function SelectAndRemoveDemo() {
  const [items, setItems] = useState(labels.slice(0, 4))
  const [value, setValue] = useState<string[]>(['retention'])
  return (
    <TagGroup
      aria-label="Dataset labels"
      items={items}
      selectionMode="single"
      value={value}
      onValueChange={setValue}
      onRemove={(removed) => {
        setItems((current) => current.filter((item) => item.value !== removed))
        setValue((current) => current.filter((v) => v !== removed))
      }}
    />
  )
}

export const SelectAndRemove: Story = {
  name: 'Selectable and removable',
  render: () => <SelectAndRemoveDemo />,
  parameters: {
    docs: {
      description: {
        story:
          'Both at once, with one selection: the selected label is the one a report groups by. The × on the selected tag turns to cloth under the pointer, so it reads on the ink fill.',
      },
    },
  },
}

export const Empty: Story = {
  args: {
    items: [],
    empty: 'No labels yet.',
  },
}

export const Disabled: Story = {
  args: {
    disabled: true,
    onRemove: () => {},
  },
  parameters: {
    docs: {
      description: {
        story: 'A locked set keeps every tag readable and loses its × buttons: a remove button that does nothing is a broken promise.',
      },
    },
  },
}
