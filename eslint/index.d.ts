import type { ESLint, Linter } from 'eslint'

/** `@demogar/mola-ui/eslint`: Mola UI's design rules (the MCP `check_code` tool) as ESLint rules. */
declare const plugin: ESLint.Plugin & {
  rules: Record<'design-rules' | 'design-advice', NonNullable<ESLint.Plugin['rules']>[string]>
  configs: { recommended: Linter.Config }
}

export default plugin
