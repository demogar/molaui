import { describe, expect, it } from 'vitest'

import { transform } from './skeleton-line-to-text'

describe('skeleton-line-to-text', () => {
  it('rewrites shape="line" on Skeleton and leaves everything else as written', () => {
    const input = `import { Skeleton, SkeletonText } from '@demogar/mola-ui'

export const Row = () => (
  <div>
    {/* the name */}
    <Skeleton shape='line' className="w-24" />
    <Skeleton shape={"line"}></Skeleton>
    <Skeleton shape="block" />
    <SkeletonText lines={2} />
  </div>
)
`
    const { output, changes } = transform(input)
    expect(changes).toBe(2)
    expect(output).toBe(input.replace(`shape='line'`, `shape='text'`).replace(`shape={"line"}`, `shape={"text"}`))
  })

  it('follows an aliased import', () => {
    const { output } = transform(`import { Skeleton as Bone } from '@demogar/mola-ui'\n<Bone shape="line" />`)
    expect(output).toContain('<Bone shape="text" />')
  })

  it('leaves a Skeleton from another package alone', () => {
    const input = `import { Skeleton } from 'some-other-kit'\n<Skeleton shape="line" />`
    expect(transform(input)).toEqual({ output: input, changes: 0, manual: [] })
  })

  it('reports a dynamic shape instead of guessing', () => {
    const input = `import { Skeleton } from '@demogar/mola-ui'\n\n<Skeleton shape={kind} />`
    expect(transform(input)).toEqual({ output: input, changes: 0, manual: [3] })
  })
})
