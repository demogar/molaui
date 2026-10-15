import type { Meta, StoryObj } from '@storybook/react-vite'
import { BookOpen } from 'lucide-react'
import * as React from 'react'

import { HardState, HardStates as HardStatesFrame } from '../../docs/blocks/hard-states'
import { MessagesProvider } from '../../lib/messages'
import { Text } from '../typography'
import { Link, LinkButton } from './link'

const meta = {
  title: 'Components/Navigation/Link',
  tags: ['experimental'],
  component: Link,
  args: { href: '#', children: 'run history' },
  parameters: {
    docs: {
      description: {
        component:
          'A link goes somewhere; a button does something. `Link` is text, underlined in a sentence (`inline`) or set on its own in the UI face (`standalone`). `LinkButton` is an `<a>` cut like a Button, for the main way forward when it is a navigation. Both take `render` for your router’s link, as NavItem and Breadcrumb do, so there is no router dependency. `external` (or `target="_blank"`) opens a new tab and says so twice: the up-right arrow for the eye and a hidden “(opens in a new tab)” for a screen reader, from `messages.link.newTab`.',
      },
    },
  },
} satisfies Meta<typeof Link>

export default meta
type Story = StoryObj<typeof meta>

/** In a sentence the link is underlined, because colour alone cannot pick it out of the words around it. */
export const Inline: Story = {
  render: (args) => (
    <Text className="max-w-reading">
      Runs older than 30 days move to cold storage. Open the <Link {...args} /> to restore one before it is deleted.
    </Text>
  ),
}

/** On its own, under a list or in a card's foot, a link needs no underline until hover: its place says what it is. */
export const Standalone: Story = {
  args: { variant: 'standalone', children: 'View all runs' },
}

/** A new tab is said, not only drawn: the arrow mirrors in a right-to-left page, and the hidden cue is read after the label. */
export const External: Story = {
  render: () => (
    <div className="flex flex-col items-start gap-3">
      <Text className="max-w-reading">
        Cayuco follows the <Link href="https://www.w3.org/TR/WCAG22/" external>WCAG 2.2 guidelines</Link> for every screen.
      </Text>
      <Link variant="standalone" href="https://www.w3.org/WAI/ARIA/apg/" external>
        Read the ARIA patterns
      </Link>
    </div>
  ),
}

/** LinkButton takes Button's variants and sizes. The arrow is for a link that moves you on; external links get the up-right arrow instead. */
export const Buttons: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <LinkButton href="#" withArrow>
        Open run
      </LinkButton>
      <LinkButton href="#" variant="secondary" icon={<BookOpen />}>
        Read the guide
      </LinkButton>
      <LinkButton href="https://www.w3.org/WAI/" variant="ghost" size="sm" external>
        Accessibility basics
      </LinkButton>
    </div>
  ),
}

/**
 * Your router's link, through `render`: an element, or a function that
 * receives the props (`href`, the classes, `ref`, handlers) and returns one.
 * Here a stand-in router keeps the click and shows where it went.
 */
export const RouterLink: Story = {
  render: function Render() {
    const [path, setPath] = React.useState('/runs')
    const RouterAnchor = ({ to, ...props }: React.ComponentProps<'a'> & { to: string }) => (
      <a
        {...props}
        href={to}
        onClick={(event) => {
          event.preventDefault()
          setPath(to)
        }}
      />
    )
    return (
      <div className="flex flex-col items-start gap-3">
        <div className="flex flex-wrap items-center gap-4">
          <Link variant="standalone" render={(props) => <RouterAnchor {...props} to="/runs/4182" />}>
            Run #4182
          </Link>
          <LinkButton variant="secondary" size="sm" render={<RouterAnchor to="/agents/knowledge-agent" />}>
            Open agent
          </LinkButton>
        </div>
        <Text variant="muted" size="sm">
          Router at <code className="literal">{path}</code>
        </Text>
      </div>
    )
  },
}

/** The new-tab cue in the provider's words, here Spanish. */
export const Translated: Story = {
  render: () => (
    <MessagesProvider locale="es-PA" messages={{ link: { newTab: '(se abre en una pestaña nueva)' } }}>
      <Text className="max-w-reading" lang="es">
        Cayuco sigue las <Link href="https://www.w3.org/TR/WCAG22/" external>pautas WCAG 2.2</Link> en cada pantalla.
      </Text>
    </MessagesProvider>
  ),
}

export const HardStates: Story = {
  name: 'Hard states',
  tags: ['hard-states', '!autodocs'],
  render: () => (
    <HardStatesFrame>
      <HardState state="long-label">
        <div className="flex max-w-reading flex-col items-start gap-3">
          <Text>
            Open the <Link href="#">full trace of every step the knowledge agent took before it stopped</Link> to see
            where it went wrong.
          </Text>
          <LinkButton href="#" variant="secondary" withArrow className="h-auto min-h-(--button-h) max-w-full whitespace-normal py-1 text-start">
            Open the run history for the knowledge agent
          </LinkButton>
        </div>
      </HardState>
      <HardState state="rtl">
        <div className="flex flex-col items-start gap-3">
          <Text>
            افتح <Link href="#">سجل التشغيل</Link> لاستعادة تشغيل قبل حذفه.
          </Text>
          <Link variant="standalone" href="https://www.w3.org/WAI/" external messages={{ newTab: '(يفتح في علامة تبويب جديدة)' }}>
            إرشادات الوصول
          </Link>
          <LinkButton href="#" withArrow>
            فتح التشغيل
          </LinkButton>
        </div>
      </HardState>
    </HardStatesFrame>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'An inline link wraps with the sentence it sits in; a LinkButton with a sentence-length label takes a second line rather than running off a phone. In right to left the new-tab arrow and the button arrow change sides. There is no disabled cell, because a link cannot be disabled, and no error cell, because a link only goes somewhere.',
      },
    },
  },
}
