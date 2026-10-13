import { Controls, Description, Primary, Stories, Subtitle, Title, useOf } from '@storybook/addon-docs/blocks'
import type * as React from 'react'

import { AnatomySection } from '../src/docs/blocks/anatomy'
import {
  AccessibilitySection,
  EveryExampleHeading,
  ExamplesHeading,
  RelatedSection,
  SummaryStatus,
} from '../src/docs/blocks/page'
import { UsageFor } from '../src/docs/blocks/usage'
import { pageData, SECTIONS, type PageData, type SectionId } from '../src/docs/usage/contract'
import { isShowcase } from '../src/docs/usage/showcases'

/**
 * Every component page has the same sections in the same order, so a reader
 * always knows where to look. The order is not written here: it is SECTIONS
 * in src/docs/usage/contract.ts, and this page renders whatever that list
 * says, in that order. usage.test.ts holds every component page to the same
 * list, so a section that would render empty fails a test instead.
 *
 * The component's own description (the decisions behind it, from the stories
 * meta) sits with the summary, because it says what the thing is.
 *
 * A showcase or a pattern documents how parts fit together, not when to pick
 * one, so it keeps Storybook's plain page: description, then its stories.
 */
const RENDER: Record<SectionId, (page: PageData) => React.ReactNode> = {
  summary: (page) => (
    <>
      <SummaryStatus page={page} />
      <Description />
    </>
  ),
  usage: (page) => <UsageFor title={page.title} />,
  anatomy: (page) => <AnatomySection page={page} />,
  examples: () => (
    <>
      <ExamplesHeading />
      <Primary />
      <Controls />
      <Stories title={<EveryExampleHeading />} />
    </>
  ),
  accessibility: (page) => <AccessibilitySection page={page} />,
  related: (page) => <RelatedSection page={page} />,
}

export function DocsPage() {
  const of = useOf('meta')
  const meta = of.type === 'meta' ? of.preparedMeta : undefined
  const title = meta?.title ?? ''
  if (isShowcase(title)) {
    return (
      <>
        <Title />
        <Subtitle />
        <Description />
        <Primary />
        <Controls />
        <Stories />
      </>
    )
  }
  const page = pageData(title, meta?.tags)
  return (
    <>
      <Title />
      <Subtitle />
      {SECTIONS.map((section) => (
        <div key={section.id} data-section={section.id}>
          {RENDER[section.id](page)}
        </div>
      ))}
    </>
  )
}
