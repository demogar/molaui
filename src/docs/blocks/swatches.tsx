import { contrast, toHex } from '../../tokens/color'
import { resolveColor, type ThemeName } from '../../tokens/resolve'
import { decls } from './tokens-source'

function resolved(name: string, theme: ThemeName) {
  const raw = decls.get(name)
  if (!raw) return null
  try {
    return resolveColor(raw, theme, decls)
  } catch {
    return null
  }
}

function Ratio({ fg, bg, theme }: { fg: string; bg: string; theme: ThemeName }) {
  const a = resolved(fg, theme)
  const b = resolved(bg, theme)
  if (!a || !b) return null
  const r = contrast(a, b)
  const verdict = r >= 7 ? 'AAA' : r >= 4.5 ? 'AA' : r >= 3 ? 'UI' : '—'
  return (
    <span className="tabular">
      {r.toFixed(2)}
      <span className="ml-1.5 rotulo text-ink-muted">{verdict}</span>
    </span>
  )
}

export interface SwatchSpec {
  token: string
  /** What it is for, in one line. */
  role: string
  /** The ground its contrast is reported against. */
  on?: string
}

/**
 * A row of swatches, each painted from the live CSS variable and labelled with
 * the value the resolver computes from tokens.css — so a swatch whose label
 * disagrees with its paint is a bug in the resolver, and the contract test
 * would already have caught it.
 */
export function SwatchGrid({ swatches }: { swatches: SwatchSpec[] }) {
  return (
    <div className="sb-unstyled not-prose my-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {swatches.map(({ token, role, on = '--cloth' }) => (
        <figure key={token} className="m-0 bg-cloth-pale shadow-cut">
          <div className="grid h-24 grid-cols-2">
            <div data-theme="light" style={{ background: `var(${token})` }} />
            <div data-theme="dark" style={{ background: `var(${token})` }} />
          </div>
          <figcaption className="grid gap-1.5 p-3.5 text-sm">
            <code className="literal font-semibold text-ink">{token}</code>
            <span className="text-ink-2">{role}</span>
            <dl className="m-0 grid grid-cols-[auto_1fr_auto] gap-x-3 gap-y-0.5 text-xs text-ink-muted">
              {(['light', 'dark'] as const).map((theme) => {
                const rgb = resolved(token, theme)
                return (
                  <div key={theme} className="contents">
                    <dt className="rotulo self-center">{theme}</dt>
                    <dd className="m-0 literal text-ink-2">{rgb ? toHex(rgb) : 'translucent'}</dd>
                    <dd className="m-0 text-right">
                      <Ratio fg={token} bg={on} theme={theme} />
                    </dd>
                  </div>
                )
              })}
            </dl>
            <span className="text-2xs text-ink-muted">ratio against {on}</span>
          </figcaption>
        </figure>
      ))}
    </div>
  )
}

/** Foreground-on-ground pairings, rendered as real text so the eye can check the number. */
export function PairingTable({ pairs }: { pairs: [fg: string, bg: string][] }) {
  return (
    <div className="sb-unstyled not-prose my-6 overflow-x-auto shadow-cut">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-cloth-shade text-left">
            <th className="rotulo p-3 font-semibold">Pairing</th>
            <th className="rotulo p-3 font-semibold">Light</th>
            <th className="rotulo p-3 font-semibold">Dark</th>
          </tr>
        </thead>
        <tbody>
          {pairs.map(([fg, bg]) => (
            <tr key={fg + bg} className="border-t border-keyline">
              <td className="p-3">
                <code className="literal">{fg}</code> <span className="text-ink-muted">on</span>{' '}
                <code className="literal">{bg}</code>
              </td>
              {(['light', 'dark'] as const).map((theme) => (
                <td key={theme} className="p-0">
                  <div
                    data-theme={theme}
                    className="flex items-center justify-between gap-3 p-3"
                    style={{ background: `var(${bg})`, color: `var(${fg})` }}
                  >
                    <span className="font-semibold">Run succeeded</span>
                    <span className="text-xs">
                      <Ratio fg={fg} bg={bg} theme={theme} />
                    </span>
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
