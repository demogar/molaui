import { Badge } from '../../components/badge'
import { Button } from '../../components/button'
import { Field, Input } from '../../components/field'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/table'
import { DENSITIES, densityValue } from './tokens-source'

const RUNS = [
  { id: 'run_8f2a', status: 'Running', tokens: '1,204' },
  { id: 'run_77c1', status: 'Passed', tokens: '18,930' },
  { id: 'run_0b9e', status: 'Failed', tokens: '402' },
] as const

const TONE = { Running: 'info', Passed: 'success', Failed: 'danger' } as const

/**
 * The same components, unchanged, inside three `data-density` frames. Nothing
 * here takes a size: the field, the buttons, the badges and the table rows
 * re-scale because the frame redefines the tokens they are written in. The
 * caption under each frame is read from tokens.css, so it names the values
 * that frame is actually drawn at.
 */
export function DensitySpecimen() {
  return (
    <div className="sb-unstyled not-prose my-6 grid gap-6 font-ui text-ink lg:grid-cols-3">
      {DENSITIES.map((d) => (
        <figure key={d} className="m-0 grid min-w-0 content-start gap-2">
          <div data-density={d} className="grid min-w-0 gap-4 bg-cloth-pale p-4 shadow-cut">
            <Field label="Agent name" hint="Shown in the run log.">
              {(control) => <Input {...control} defaultValue="Triage bot" />}
            </Field>
            <div className="flex flex-wrap gap-2">
              <Button>Run agent</Button>
              <Button variant="secondary">Filter</Button>
            </div>
            <Table aria-label={`Recent runs, ${d}`}>
              <TableHeader>
                <TableRow>
                  <TableHead>Run</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead numeric>Tokens</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {RUNS.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <span className="literal">{r.id}</span>
                    </TableCell>
                    <TableCell>
                      <Badge tone={TONE[r.status]} dot>
                        {r.status}
                      </Badge>
                    </TableCell>
                    <TableCell numeric>{r.tokens}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <figcaption className="rotulo text-ink-muted">
            {d}: controls {densityValue('--control-h', d)}, rows {densityValue('--row-h', d)}, body {densityValue('--text-base', d)}
          </figcaption>
        </figure>
      ))}
    </div>
  )
}
