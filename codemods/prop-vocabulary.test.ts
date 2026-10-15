import { describe, expect, it } from 'vitest'

import { transform } from './prop-vocabulary'

const header = `import { Chip, Container, EmptyState, Heading, MenuItem, NavItem, Panel, Placeholder, Progress, Prose, StepList, StreamingText, TableEmpty, Text, Timeline } from '@demogar/mola-ui'\n`

function rewrite(body: string) {
  return transform(header + body).output.slice(header.length)
}

describe('prop-vocabulary', () => {
  it('renames props whose values carry over, literal or not', () => {
    expect(rewrite(`<Panel tone="ink" padding="lg" />`)).toBe(`<Panel layer="ink" padding="lg" />`)
    expect(rewrite(`<Container size={width} />`)).toBe(`<Container width={width} />`)
    expect(rewrite(`<Heading level={2} size={3}>T</Heading>`)).toBe(`<Heading level={2} visualLevel={3}>T</Heading>`)
    expect(rewrite(`<Timeline size='editorial' />`)).toBe(`<Timeline variant='editorial' />`)
    expect(rewrite(`<EmptyState variant="error" title="x" />`)).toBe(`<EmptyState kind="error" title="x" />`)
    expect(rewrite(`<TableEmpty variant="no-results" colSpan={3} />`)).toBe(`<TableEmpty kind="no-results" colSpan={3} />`)
    expect(rewrite(`<StreamingText tone="muted" text="" />`)).toBe(`<StreamingText variant="muted" text="" />`)
  })

  it('maps values, keeping the quote the author used', () => {
    expect(rewrite(`<Chip size='comfortable'>a</Chip><Chip size="default">b</Chip>`)).toBe(
      `<Chip size='md'>a</Chip><Chip size="sm">b</Chip>`,
    )
    expect(rewrite(`<Text size="base" /><Prose size="base" />`)).toBe(`<Text size="md" /><Prose size="md" />`)
    expect(rewrite(`<Progress tone="ink" />`)).toBe(`<Progress tone="neutral" />`)
    expect(rewrite(`<MenuItem tone="default">x</MenuItem>`)).toBe(`<MenuItem tone="neutral">x</MenuItem>`)
    expect(rewrite(`<NavItem countTone="attention">Runs</NavItem>`)).toBe(`<NavItem countTone="danger">Runs</NavItem>`)
    expect(rewrite(`<Placeholder tone="default" /><Placeholder tone="deep" />`)).toBe(
      `<Placeholder layer="shade" /><Placeholder layer="deep" />`,
    )
  })

  it('moves a value to another prop, or drops a value that was the default', () => {
    expect(rewrite(`<Text tone={2}>a</Text>`)).toBe(`<Text variant="secondary">a</Text>`)
    expect(rewrite(`<Text tone="muted">a</Text>`)).toBe(`<Text variant="muted">a</Text>`)
    expect(rewrite(`<Text as="span" tone="default">a</Text>`)).toBe(`<Text as="span">a</Text>`)
    expect(rewrite(`<StepList tone="inverse" items={i} />`)).toBe(`<StepList inverse items={i} />`)
    expect(rewrite(`<StepList items={i} tone="default" />`)).toBe(`<StepList items={i} />`)
  })

  it('leaves values that did not change alone', () => {
    const body = `<Text tone="danger" size="sm" /><Chip size="sm">a</Chip><Progress tone="success" />`
    expect(rewrite(body)).toBe(body)
  })

  it('reports a dynamic value it would have to guess at', () => {
    const { output, changes, manual } = transform(`${header}\n<Text tone={t} />\n<Placeholder tone={t} />`)
    expect(changes).toBe(0)
    expect(output).toBe(`${header}\n<Text tone={t} />\n<Placeholder tone={t} />`)
    expect(manual).toEqual(['3 Text tone', '4 Placeholder tone'])
  })

  it('follows an aliased import and leaves other packages alone', () => {
    expect(transform(`import { Panel as Card } from '@demogar/mola-ui'\n<Card tone="oro" />`).output).toContain('<Card layer="oro" />')
    const other = `import { Panel } from 'some-other-kit'\n<Panel tone="ink" />`
    expect(transform(other)).toEqual({ output: other, changes: 0, manual: [] })
  })

  it('does not touch a same-named prop on a component it has no rule for', () => {
    const input = `import { Badge, Callout } from '@demogar/mola-ui'\n<Badge tone="warn" variant="solid" /><Callout tone="info" />`
    expect(transform(input).output).toBe(input)
  })
})
