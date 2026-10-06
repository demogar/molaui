import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { DescriptionList } from './description-list'

describe('DescriptionList', () => {
  it('groups each term with its value', () => {
    const { container } = render(
      <DescriptionList
        items={[
          { term: 'Model', detail: 'cayuco-deep-3', literal: true },
          { term: 'Cost', detail: '$0.42' },
        ]}
      />,
    )
    expect(container.querySelectorAll('dl > div')).toHaveLength(2)
    expect(screen.getAllByRole('term').map((t) => t.textContent)).toEqual(['Model', 'Cost'])
    expect(screen.getByText('cayuco-deep-3')).toHaveClass('literal')
  })
})
