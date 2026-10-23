import { DENSITIES, densityValue, toPx } from './tokens-source'

/**
 * Spacing and density, read from the stylesheets rather than restated. Each
 * value is what tokens.css (or theme.css, for the comfortable type scale)
 * declares for that density, so this page cannot quote a number the CSS no
 * longer has.
 */

const METRICS: { name: string; label: string }[] = [
  { name: '--spacing', label: 'Spacing unit' },
  { name: '--control-h', label: 'Control height' },
  { name: '--control-h-sm', label: 'Small control' },
  { name: '--control-h-lg', label: 'Large control' },
  { name: '--control-px', label: 'Control padding, inline' },
  { name: '--row-h', label: 'Table row height' },
  { name: '--icon', label: 'Default icon' },
  { name: '--text-2xs', label: 'Category label text' },
  { name: '--text-xs', label: 'Small text' },
  { name: '--text-sm', label: 'Secondary text' },
  { name: '--text-base', label: 'Body text' },
  { name: '--text-lg', label: 'Lead text' },
  { name: '--text-xl', label: 'Section heading' },
]

function px(value: string | undefined) {
  if (!value) return '—'
  const n = toPx(value)
  if (n === null) return value
  return value.endsWith('rem') ? `${value} (${n}px)` : value
}

/** `only` picks rows by token name, in METRICS order, for a page that needs a short table. */
export function DensityMetrics({ only }: { only?: string[] } = {}) {
  const metrics = only ? METRICS.filter((m) => only.includes(m.name)) : METRICS
  const cell = 'border-t border-keyline p-3 text-start align-top'
  return (
    <div className="sb-unstyled not-prose relative my-6 overflow-x-auto bg-cloth-pale font-ui text-sm text-ink shadow-cut">
      <table className="w-full min-w-[36rem] border-collapse">
        <caption className="sr-only">What each density sets, read from tokens.css</caption>
        <thead>
          <tr className="bg-cloth-shade">
            <th scope="col" className="etiqueta text-xs p-3 text-start">Metric</th>
            {DENSITIES.map((d) => (
              <th key={d} scope="col" className="etiqueta text-xs p-3 text-start">
                {d}
                {d === 'comfortable' ? ' (default)' : ''}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {metrics.map((m) => {
            const values = DENSITIES.map((d) => densityValue(m.name, d))
            return (
              <tr key={m.name}>
                <th scope="row" className={`${cell} font-normal`}>
                  <span className="block text-ink">{m.label}</span>
                  <code className="literal text-xs text-ink-muted">{m.name}</code>
                </th>
                {values.map((v, i) => (
                  <td key={DENSITIES[i]} className={`${cell} tabular text-ink`}>
                    {px(v)}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/** The steps the components use most, in Tailwind's multiples of the unit. */
const STEPS = [0.5, 1, 1.5, 2, 3, 4, 6, 8]

/**
 * The spacing steps drawn at their real size in each density: the bars are
 * painted from the live `--spacing` inside a `data-density` frame, and the
 * numbers beside them are computed from tokens.css. If the two ever
 * disagreed, the bar would be the one telling the truth.
 */
export function SpacingRuler() {
  return (
    <div className="sb-unstyled not-prose my-6 grid gap-4 font-ui text-sm text-ink md:grid-cols-3">
      {DENSITIES.map((d) => {
        const unit = toPx(densityValue('--spacing', d) ?? '') ?? 4
        return (
          <figure key={d} data-density={d} className="m-0 bg-cloth-pale p-4 shadow-cut">
            <figcaption className="rotulo mb-3 text-ink-muted">
              {d}, unit {unit}px
            </figcaption>
            <ul className="m-0 grid list-none gap-2 p-0">
              {STEPS.map((n) => (
                <li key={n} className="m-0 grid grid-cols-[6rem_1fr] items-center gap-3">
                  <span className="tabular text-xs text-ink-2">
                    {n} · {+(n * unit).toFixed(2)}px
                  </span>
                  <span aria-hidden className="block h-3 bg-ink" style={{ width: `calc(var(--spacing) * ${n})` }} />
                </li>
              ))}
            </ul>
          </figure>
        )
      })}
    </div>
  )
}
