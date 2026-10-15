import { Badge, Button, Container, Field, Inline, Input, SegmentedControl, Stack } from '@demogar/mola-ui'
import { useState } from 'react'

// Edit anything here. Layout comes from Mola's own components rather than
// utility classes: the compiled stylesheet holds only the utilities the
// components use, so a class written here may have no CSS behind it.
//
// Theme and density are attributes on <html>, so the two switches set them
// there, as your app would.
export function App() {
  const [theme, setTheme] = useState('system')
  const [density, setDensity] = useState('comfortable')

  function chooseTheme(next) {
    setTheme(next)
    if (next === 'system') delete document.documentElement.dataset.theme
    else document.documentElement.dataset.theme = next
  }

  function chooseDensity(next) {
    setDensity(next)
    document.documentElement.dataset.density = next
  }

  return (
    <Container>
      <Stack gap="lg" style={{ paddingBlock: '2rem' }}>
        <Inline>
          <SegmentedControl
            aria-label="Theme"
            size="sm"
            value={theme}
            onValueChange={chooseTheme}
            options={[
              { value: 'system', label: 'System' },
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
            ]}
          />
          <SegmentedControl
            aria-label="Density"
            size="sm"
            value={density}
            onValueChange={chooseDensity}
            options={[
              { value: 'compact', label: 'Compact' },
              { value: 'comfortable', label: 'Comfortable' },
              { value: 'spacious', label: 'Spacious' },
            ]}
          />
        </Inline>
        <form onSubmit={(event) => event.preventDefault()}>
          <Stack>
            <Field label="Agent name" required hint="Shown in the Cayuco run log.">
              {(control) => <Input {...control} name="name" defaultValue="Triage bot" />}
            </Field>
            <Inline>
              <Button type="submit">Run agent</Button>
              <Badge tone="success" dot>
                Ready
              </Badge>
            </Inline>
          </Stack>
        </form>
      </Stack>
    </Container>
  )
}
