import type { Meta, StoryObj } from '@storybook/react-vite'

import { Accordion, AccordionItem, AccordionPanel, AccordionTrigger, Collapsible, CollapsiblePanel, CollapsibleTrigger } from './accordion'
import { HardState, HardStates as HardStatesFrame } from '../../docs/blocks/hard-states'

const meta = {
  title: 'Components/Navigation/Accordion',
  tags: ['stable'],
  component: Accordion,
  parameters: {
    docs: {
      description: {
        component:
          'Sections of one document, opened one or several at a time. Ink rules close the list and decorative keylines separate rows — the heavy-top, light-rows rhythm inherited from the editorial step list. The marker is a **plus that turns into a cross**: a chevron says “this goes somewhere”, a plus says “there is more of this here”. Panels are `hiddenUntilFound`, so find-in-page opens the section that contains the match.',
      },
    },
  },
} satisfies Meta<typeof Accordion>

export default meta
type Story = StoryObj<typeof meta>

const faq = [
  ['What counts as a run?', 'One invocation of an agent, from the first model call to its final answer, including every tool call in between.'],
  ['Why did my run stop at 50 steps?', 'Every agent has a step budget. It protects against loops; raise it per agent in Settings → Limits.'],
  ['Are tool arguments stored?', 'Yes, for 30 days, so a failing call can be replayed. Fields marked secret are redacted before storage.'],
  ['Can I export a trace?', 'From any run: Actions → Export → Trace as JSON.'],
] as const

export const Default: Story = {
  render: () => (
    <Accordion className="max-w-xl" defaultValue={['q0']}>
      {faq.map(([q, a], i) => (
        <AccordionItem key={q} value={`q${i}`}>
          <AccordionTrigger>{q}</AccordionTrigger>
          <AccordionPanel>
            <p className="m-0 max-w-reading">{a}</p>
          </AccordionPanel>
        </AccordionItem>
      ))}
    </Accordion>
  ),
}

export const WithMeta: Story = {
  render: () => (
    <Accordion className="max-w-xl" multiple>
      <AccordionItem value="model">
        <AccordionTrigger meta="2 fields">Model</AccordionTrigger>
        <AccordionPanel>Provider, model id and temperature.</AccordionPanel>
      </AccordionItem>
      <AccordionItem value="tools">
        <AccordionTrigger meta="6 tools">Tools</AccordionTrigger>
        <AccordionPanel>search_kb, fetch_ticket, lookup_account, …</AccordionPanel>
      </AccordionItem>
      <AccordionItem value="limits">
        <AccordionTrigger meta="Defaults">Limits</AccordionTrigger>
        <AccordionPanel>50 steps · 120s wall clock · 64k tokens.</AccordionPanel>
      </AccordionItem>
    </Accordion>
  ),
  parameters: { docs: { description: { story: '`multiple` lets several sections stay open — for settings, where comparing two sections is the point.' } } },
}

export const SingleCollapsible: Story = {
  render: () => (
    <Collapsible className="max-w-xl">
      <CollapsibleTrigger>Raw response</CollapsibleTrigger>
      <CollapsiblePanel>
        <pre className="literal m-0 bg-cloth-pale p-3 text-ink-2 shadow-cut">{`{\n  "status": 200,\n  "results": 3\n}`}</pre>
      </CollapsiblePanel>
    </Collapsible>
  ),
}

export const HardStates: Story = {
  name: 'Hard states',
  tags: ['hard-states', '!autodocs'],
  render: () => (
    <HardStatesFrame>
      <HardState state="long-label">
        <Accordion defaultValue={['long']}>
          <AccordionItem value="long">
            <AccordionTrigger meta="12 fields">What happens to a run that is escalated to a person halfway through a refund?</AccordionTrigger>
            <AccordionPanel>
              <p className="m-0">It pauses, keeps every tool call so far, and resumes from the same step once the person answers.</p>
            </AccordionPanel>
          </AccordionItem>
        </Accordion>
      </HardState>
      <HardState state="rtl">
        <Accordion defaultValue={['model']}>
          <AccordionItem value="model">
            <AccordionTrigger meta="حقلان">النموذج</AccordionTrigger>
            <AccordionPanel>المزوّد ومعرّف النموذج ودرجة الحرارة.</AccordionPanel>
          </AccordionItem>
          <AccordionItem value="tools">
            <AccordionTrigger>الأدوات</AccordionTrigger>
            <AccordionPanel>أدوات البحث والجلب.</AccordionPanel>
          </AccordionItem>
        </Accordion>
      </HardState>
      <HardState state="disabled">
        <Accordion>
          <AccordionItem value="limits">
            <AccordionTrigger meta="Defaults">Limits</AccordionTrigger>
            <AccordionPanel>50 steps · 120s wall clock · 64k tokens.</AccordionPanel>
          </AccordionItem>
          <AccordionItem value="billing" disabled>
            <AccordionTrigger meta="Owners only">Billing</AccordionTrigger>
            <AccordionPanel>Plan and invoices.</AccordionPanel>
          </AccordionItem>
        </Accordion>
      </HardState>
    </HardStatesFrame>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'A question longer than the row wraps under its own chevron, with the meta kept beside it; in right to left the chevron and the meta change sides; a disabled section keeps its row, with muted ink and its reason as the meta. An accordion has no error state of its own: a section whose content failed shows that failure inside its panel.',
      },
    },
  },
}
