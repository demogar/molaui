import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Avatar, AvatarGroup, avatarLayer, initials } from './avatar'

describe('initials', () => {
  it.each([
    ['Ana Sofía Pérez', 'AP'],
    ['  docs  ', 'DO'],
    ['X', 'X'],
    ['', '?'],
  ])('%s → %s', (name, expected) => {
    expect(initials(name)).toBe(expected)
  })
})

describe('Avatar', () => {
  it('is an image named by the person', () => {
    render(<Avatar name="Ana Pérez" />)
    expect(screen.getByRole('img', { name: 'Ana Pérez' })).toHaveTextContent('AP')
  })

  it('picks the same layer for the same name every time', () => {
    expect(avatarLayer('Ana Pérez')).toBe(avatarLayer('  ana pérez '))
  })
})

describe('AvatarGroup', () => {
  it('collapses the overflow into a counted tile', () => {
    render(
      <AvatarGroup label="Reviewers" max={2}>
        <Avatar name="A B" />
        <Avatar name="C D" />
        <Avatar name="E F" />
        <Avatar name="G H" />
      </AvatarGroup>,
    )
    expect(screen.getByRole('group', { name: 'Reviewers' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: '2 more' })).toHaveTextContent('+2')
  })
})
