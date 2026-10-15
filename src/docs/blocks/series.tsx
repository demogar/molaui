import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/table'
import { useScrollEdge } from '../../lib/scroll-edge'
import { CHART_GROUNDS, SERIES, worstOnGrounds } from './dataviz'
import { decls } from './tokens-source'

const cell = 'rule-t p-3 text-start align-top'

/**
 * The series colours with the lowest contrast each reaches on any chart
 * ground, per theme, computed from tokens.css by the contract's resolver.
 */
export function SeriesTable() {
  const edge = useScrollEdge<HTMLDivElement>()
  return (
    <div
      ref={edge}
      role="region"
      aria-label="Series colours"
      tabIndex={0}
      className="sb-unstyled not-prose relative my-6 overflow-x-auto scroll-edge bg-cloth-pale font-ui text-sm text-ink shadow-cut"
    >
      <table className="w-full min-w-[36rem] border-collapse">
        <caption className="p-3 text-start text-sm text-ink-2">
          Lowest contrast on {CHART_GROUNDS.join(', ')}, computed from tokens.css. A mark owes 3:1.
        </caption>
        <thead>
          <tr className="bg-cloth-shade">
            <th scope="col" className="rotulo p-3 text-start">Series</th>
            <th scope="col" className="rotulo p-3 text-end">Light</th>
            <th scope="col" className="rotulo p-3 text-end">Dark</th>
            <th scope="col" className="rotulo p-3 text-start">When</th>
          </tr>
        </thead>
        <tbody>
          {SERIES.map((s) => (
            <tr key={s.token}>
              <th scope="row" className={`${cell} font-normal`}>
                <span className="flex items-center gap-2">
                  <span aria-hidden className="inline-block h-(--bar-w) w-6 shrink-0" style={{ background: `var(${s.token})` }} />
                  <span>
                    <span className="block text-ink">{s.name}</span>
                    <code className="literal text-xs text-ink-muted">{s.token}</code>
                  </span>
                </span>
              </th>
              <td className={`${cell} text-end tabular`}>{worstOnGrounds(s.token, 'light', decls).toFixed(2)}</td>
              <td className={`${cell} text-end tabular`}>{worstOnGrounds(s.token, 'dark', decls).toFixed(2)}</td>
              <td className={`${cell} text-ink-2`}>{s.job}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const WEEK = [
  { day: 'Mon', runs: 412, last: 380 },
  { day: 'Tue', runs: 468, last: 402 },
  { day: 'Wed', runs: 431, last: 455 },
  { day: 'Thu', runs: 520, last: 470 },
  { day: 'Fri', runs: 498, last: 461 },
  { day: 'Sat', runs: 233, last: 250 },
  { day: 'Sun', runs: 201, last: 214 },
]

/**
 * One chart drawn by the rules on the page: this week in ink, last week as a
 * dashed muted line, the latest point a gold square with an ink keyline, and
 * every series named at its end rather than in a legend. The numbers are in
 * a real table below, which is the chart's text alternative.
 */
export function RunsChart() {
  const width = 440
  const height = 200
  const pad = { top: 16, right: 84, bottom: 28, left: 40 }
  const max = 600
  const x = (i: number) => pad.left + (i / (WEEK.length - 1)) * (width - pad.left - pad.right)
  const y = (v: number) => pad.top + (1 - v / max) * (height - pad.top - pad.bottom)
  const line = (key: 'runs' | 'last') => WEEK.map((d, i) => `${x(i).toFixed(1)},${y(d[key]).toFixed(1)}`).join(' ')
  const lastRuns = WEEK.at(-1)!
  return (
    <figure className="sb-unstyled not-prose my-6 bg-cloth-pale p-4 font-ui text-ink shadow-cut">
      <svg viewBox={`0 0 ${width} ${height}`} className="block h-auto w-full max-w-2xl" role="img" aria-labelledby="runs-chart-title">
        <title id="runs-chart-title">Agent runs per day, this week against last week. The values are in the table below.</title>
        {[0, 200, 400, 600].map((v) => (
          <g key={v}>
            <line x1={pad.left} x2={width - pad.right} y1={y(v)} y2={y(v)} stroke="var(--keyline)" strokeWidth={1} />
            <text x={pad.left - 8} y={y(v)} textAnchor="end" dominantBaseline="middle" fontSize={11} fill="var(--ink-muted)" className="tabular">
              {v}
            </text>
          </g>
        ))}
        {WEEK.map((d, i) => (
          <text key={d.day} x={x(i)} y={height - 8} textAnchor="middle" fontSize={11} fill="var(--ink-muted)">
            {d.day}
          </text>
        ))}
        <polyline points={line('last')} fill="none" stroke="var(--ink-muted)" strokeWidth={1.5} strokeDasharray="4 3" />
        <polyline points={line('runs')} fill="none" stroke="var(--ink)" strokeWidth={2} strokeLinejoin="miter" />
        <rect x={x(WEEK.length - 1) - 3.5} y={y(lastRuns.runs) - 3.5} width={7} height={7} fill="var(--accent)" stroke="var(--ink)" strokeWidth={1} />
        {/* Each name sits on its own side of the two end points, so the labels never touch. */}
        <text
          x={x(WEEK.length - 1) + 10}
          y={y(lastRuns.runs) + (lastRuns.runs < lastRuns.last ? 8 : -8)}
          dominantBaseline="middle"
          fontSize={12}
          fontWeight={600}
          fill="var(--ink)"
        >
          This week
        </text>
        <text
          x={x(WEEK.length - 1) + 10}
          y={y(lastRuns.last) + (lastRuns.runs < lastRuns.last ? -8 : 8)}
          dominantBaseline="middle"
          fontSize={12}
          fill="var(--ink-muted)"
        >
          Last week
        </text>
      </svg>
      <Table className="mt-4" aria-label="Agent runs per day">
        <TableHeader>
          <TableRow>
            <TableHead>Day</TableHead>
            <TableHead numeric>This week</TableHead>
            <TableHead numeric>Last week</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {WEEK.map((d) => (
            <TableRow key={d.day}>
              <TableCell>{d.day}</TableCell>
              <TableCell numeric>{d.runs}</TableCell>
              <TableCell numeric>{d.last}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </figure>
  )
}
