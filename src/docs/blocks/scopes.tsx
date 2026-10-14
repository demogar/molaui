import { COLOR_SCOPES, SCOPES, type Scope } from '../../tokens/scopes'

/**
 * The colour scopes, read from src/tokens/scopes.ts, with the tokens in each.
 * The same module feeds the agent docs, the MCP server and the Figma scopes in
 * tokens/mola.tokens.json, and scopes.test.ts holds it to the pairings and to
 * what the components write, so this table cannot promise a use the code does
 * not keep.
 */
export function ScopeTable() {
  const tokensIn = (scope: Scope) => Object.keys(COLOR_SCOPES).filter((name) => COLOR_SCOPES[name]!.scopes.includes(scope))
  const cell = 'border-t border-keyline p-3 align-top text-start'
  return (
    <div className="sb-unstyled not-prose my-6 min-w-0 overflow-x-auto bg-cloth-pale font-ui text-sm text-ink shadow-cut">
      <table className="w-full min-w-[40rem] border-collapse">
        <caption className="sr-only">Colour scopes: what each is for, its Tailwind utilities, its Figma scopes and its tokens</caption>
        <thead>
          <tr className="bg-cloth-shade">
            <th scope="col" className="rotulo p-3 text-start">Scope</th>
            <th scope="col" className="rotulo p-3 text-start">What it is</th>
            <th scope="col" className="rotulo p-3 text-start">Utilities</th>
            <th scope="col" className="rotulo p-3 text-start">Tokens</th>
          </tr>
        </thead>
        <tbody>
          {(Object.keys(SCOPES) as Scope[]).map((scope) => (
            <tr key={scope}>
              <th scope="row" className={`${cell} font-semibold`}>
                <code className="literal text-ink">{scope}</code>
              </th>
              <td className={`${cell} text-ink-2`}>{SCOPES[scope].meaning.replace(/`/g, '')}</td>
              <td className={cell}>
                <code className="literal text-ink-2">{SCOPES[scope].tailwind.map((p) => `${p}-`).join(' ')}</code>
              </td>
              <td className={cell}>
                <code className="literal break-words text-ink-2">{tokensIn(scope).join(' ')}</code>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
