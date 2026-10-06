import tokensCss from '../../styles/tokens.css?raw'
import { parseRootDeclarations } from '../../tokens/resolve'

/** tokens.css as written, parsed once, for every docs page that shows a value. */
export const decls = parseRootDeclarations(tokensCss)
export { tokensCss }
