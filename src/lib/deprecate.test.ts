import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { deprecate, resetDeprecations } from './deprecate'

const OLD_TONE = { what: '<Badge tone="warning">', instead: '<Badge tone="warn">', removal: '1.0.0' }

describe('deprecate', () => {
  let warn: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    resetDeprecations()
    warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    warn.mockRestore()
    vi.unstubAllEnvs()
  })

  it('says what is deprecated, what to use instead and when it goes', () => {
    deprecate('badge-tone-warning', OLD_TONE)
    expect(warn).toHaveBeenCalledWith(
      '[mola-ui] <Badge tone="warning"> is deprecated and will be removed in 1.0.0. Use <Badge tone="warn"> instead.',
    )
  })

  it('warns once per id, not once per render', () => {
    for (let i = 0; i < 5; i++) deprecate('badge-tone-warning', OLD_TONE)
    deprecate('another', { what: 'X', instead: 'Y', removal: '1.0.0' })
    expect(warn).toHaveBeenCalledTimes(2)
  })

  it('is silent in production', () => {
    vi.stubEnv('NODE_ENV', 'production')
    deprecate('badge-tone-warning', OLD_TONE)
    expect(warn).not.toHaveBeenCalled()
  })
})
