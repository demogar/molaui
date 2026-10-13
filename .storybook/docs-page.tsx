import { Controls, Description, Primary, Stories, Subtitle, Title, useOf } from '@storybook/addon-docs/blocks'
import type * as React from 'react'

import { AnatomySection } from '../src/docs/blocks/anatomy'
import { ChangesSection } from '../src/docs/blocks/changes'
import {
  AccessibilitySection,
  EveryExampleHeading,
  ExamplesHeading,
  RelatedSection,
  SummaryStatus,
} from '../src/docs/blocks/page'
import { PatternAccessibility, PatternGuide } from '../src/docs/blocks/pattern'
import { UsageFor } from '../src/docs/blocks/usage'
import { pageData, SECTIONS, type PageData, type SectionId } from '../src/docs/usage/contract'
import { isPattern, isShowcase } from '../src/docs/usage/showcases'

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
 * A pattern is a whole screen: its page adds its guidance (src/docs/blocks/
 * pattern.tsx) around the stories. A showcase documents how one layer's parts
 * fit together, not when to pick one, so it keeps Storybook's plain page:
 * description, then its stories.
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
  changes: (page) => <ChangesSection page={page} />,
}

export function DocsPage() {
  const of = useOf('meta')
  const meta = of.type === 'meta' ? of.preparedMeta : undefined
  const title = meta?.title ?? ''
  if (isPattern(title)) {
    return (
      <>
        <Title />
        <Subtitle />
        <PatternGuide title={title} />
        <Description />
        <ExamplesHeading />
        <Primary />
        <Stories title={<EveryExampleHeading />} />
        <PatternAccessibility title={title} />
      </>
    )
  }
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
