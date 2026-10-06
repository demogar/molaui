import { DirectionProvider } from '@base-ui/react/direction-provider'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'

import { ToastProvider } from '../../components/toast'
import { SettingsPage, type SettingsPageProps } from './settings-page'

function renderPage(props: SettingsPageProps = {}, dir: 'ltr' | 'rtl' = 'ltr') {
  return render(
    <DirectionProvider direction={dir}>
      <ToastProvider>
        <div dir={dir}>
          <a href="#overview">Overview</a>
          <SettingsPage saveDelay={0} {...props} />
        </div>
      </ToastProvider>
    </DirectionProvider>,
  )
}

const status = () => screen.getByRole('status')
const save = () => screen.getByRole('button', { name: 'Save changes' })

afterEach(() => {
  window.location.hash = ''
})

describe('SettingsPage', () => {
  it('opens clean: nothing to save, and says so', () => {
    renderPage()
    expect(status()).toHaveTextContent('No unsaved changes')
    expect(save()).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getByRole('link', { name: 'General' })).toHaveAttribute('aria-current', 'page')
  })

  it('counts unsaved changes in words as the form is edited, keyboard included', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.type(screen.getByRole('textbox', { name: /Workspace name/ }), ' team')
    expect(status()).toHaveTextContent('1 unsaved change')
    screen.getByRole('switch', { name: /Weekly evaluation digest/ }).focus()
    await user.keyboard(' ')
    expect(status()).toHaveTextContent('2 unsaved changes')
    expect(save()).not.toHaveAttribute('aria-disabled', 'true')
  })

  it('opens dirty with three changes', () => {
    renderPage({ defaultDraft: { defaultModel: 'cayuco-deep-3', monthlyLimit: 3000, weeklyDigest: false } })
    expect(status()).toHaveTextContent('3 unsaved changes')
  })

  it('validates on save: says what is wrong, focuses the first invalid field, and clears each error once fixed', async () => {
    const user = userEvent.setup()
    renderPage()
    const name = screen.getByRole('textbox', { name: /Workspace name/ })
    const slug = screen.getByRole('textbox', { name: /Slug/ })
    await user.clear(name)
    await user.clear(slug)
    await user.type(slug, 'Support Team')
    // Nothing is shouted while typing.
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()

    await user.click(save())
    const alerts = screen.getAllByRole('alert')
    expect(alerts.map((alert) => alert.textContent)).toEqual([
      'Enter a workspace name. It is shown in the switcher and on every run.',
      'Use lowercase letters, digits and single hyphens only, for example support-team.',
    ])
    await waitFor(() => expect(name).toHaveFocus())
    expect(name).toHaveAttribute('aria-invalid', 'true')
    expect(status()).toHaveTextContent('2 fields need fixing before you can save')

    await user.type(name, 'Support')
    expect(name).not.toHaveAttribute('aria-invalid')
    expect(status()).toHaveTextContent('1 field needs fixing before you can save')
  })

  it('opens with errors shown when asked to, as the validation story does', async () => {
    renderPage({ defaultDraft: { name: '', slug: 'Support Team', tokensPerRun: 250000 }, defaultValidated: true })
    expect(screen.getAllByRole('alert')).toHaveLength(3)
    expect(screen.getByText(/A run can use at most 200,000 tokens/)).toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('textbox', { name: /Workspace name/ })).toHaveFocus())
  })

  it('saves, confirms with a toast and keeps focus on Save', async () => {
    const user = userEvent.setup()
    renderPage({ defaultDraft: { monthlyLimit: 3000 } })
    await user.click(save())
    expect(await screen.findByText('Settings saved')).toBeInTheDocument()
    expect(status()).toHaveTextContent('No unsaved changes')
    expect(save()).toHaveFocus()
  })

  it('discards with an undo instead of a dialog', async () => {
    const user = userEvent.setup()
    renderPage({ defaultDraft: { name: 'Support team' } })
    const name = screen.getByRole('textbox', { name: /Workspace name/ })
    await user.click(screen.getByRole('button', { name: 'Discard' }))
    expect(name).toHaveValue('Support')
    expect(status()).toHaveTextContent('No unsaved changes')
    await user.click(await screen.findByRole('button', { name: 'Undo' }))
    expect(name).toHaveValue('Support team')
  })

  it('asks before following a link away while dirty; Keep editing keeps the changes', async () => {
    const user = userEvent.setup()
    renderPage({ defaultDraft: { name: 'Support team' } })
    await user.click(screen.getByRole('link', { name: 'Members' }))
    const dialog = await screen.findByRole('alertdialog', { name: 'Discard unsaved changes?' })
    expect(dialog).toHaveTextContent('You have 1 unsaved change to the Support settings.')
    await waitFor(() => expect(within(dialog).getByRole('button', { name: 'Keep editing' })).toHaveFocus())
    await user.keyboard('{Enter}')
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(window.location.hash).toBe('')
    expect(screen.getByRole('textbox', { name: /Workspace name/ })).toHaveValue('Support team')
  })

  it('guards links outside the page too, and Discard leaves', async () => {
    const user = userEvent.setup()
    renderPage({ defaultDraft: { name: 'Support team' } })
    await user.click(screen.getByRole('link', { name: 'Overview' }))
    const dialog = await screen.findByRole('alertdialog')
    await user.click(within(dialog).getByRole('button', { name: 'Discard changes' }))
    await waitFor(() => expect(window.location.hash).toBe('#overview'))
    expect(screen.getByRole('textbox', { name: /Workspace name/ })).toHaveValue('Support')
  })

  it('lets links through when there is nothing to lose', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('link', { name: 'Members' }))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(window.location.hash).toBe('#settings/members')
  })

  it('deletes the workspace only after its slug is typed, naming what is lost', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Delete workspace' }))
    const dialog = await screen.findByRole('alertdialog', { name: 'Delete the Support workspace?' })
    expect(dialog).toHaveTextContent('8 agents, 4 knowledge indexes (1,204 documents) and all run history')
    const confirm = within(dialog).getByRole('button', { name: 'Delete workspace' })
    expect(confirm).toBeDisabled()
    await user.type(within(dialog).getByRole('textbox'), 'support')
    expect(confirm).toBeEnabled()
    await user.keyboard('{Enter}')
    expect(await screen.findByText('Support deleted')).toBeInTheDocument()
  })

  it('works right to left: arrow keys still step the radio group and the number field', async () => {
    const user = userEvent.setup()
    renderPage({}, 'rtl')
    const pause = screen.getByRole('radio', { name: /Pause new runs/ })
    pause.focus()
    await user.keyboard('{ArrowDown}')
    expect(screen.getByRole('radio', { name: /Keep running and notify admins/ })).toBeChecked()
    const tokens = screen.getByRole('textbox', { name: /Token limit per run/ })
    tokens.focus()
    await user.keyboard('{ArrowUp}')
    expect(tokens).toHaveValue('41,000')
    expect(status()).toHaveTextContent('2 unsaved changes')
  })
})
