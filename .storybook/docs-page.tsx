import { Controls, Description, Primary, Stories, Subtitle, Title, useOf } from '@storybook/addon-docs/blocks'

import { UsageFor } from '../src/docs/blocks/usage'

/**
 * Storybook's default autodocs page, with the Usage section from
 * src/docs/usage/guidance.ts between the description (what the component is
 * and the decisions behind it) and the first example. Guidance comes before
 * the examples because "should I use this at all?" is the first question.
 */
export function DocsPage() {
  const of = useOf('meta')
  const title = of.type === 'meta' ? of.preparedMeta.title : ''
  return (
    <>
      <Title />
      <Subtitle />
      <Description />
      <UsageFor title={title} />
      <Primary />
      <Controls />
      <Stories />
    </>
  )
}
