export interface LockPackage {
  license?: string
  dev?: boolean
  dependencies?: Record<string, string>
  optionalDependencies?: Record<string, string>
}
export interface Lock {
  packages: Record<string, LockPackage>
}
export interface AuditVulnerability {
  name: string
  severity: string
  nodes: string[]
  via: Array<string | { url?: string; title?: string; severity?: string }>
}
export interface AuditReport {
  vulnerabilities: Record<string, AuditVulnerability>
}

export declare const BUNDLED: string[]
export declare const SHIPPED_LICENSES: string[]
export declare const TREE_LICENSES: string[]
export declare const ACCEPTED: Record<string, string>
export declare const FAILING: string[]
export declare function licenseAllowed(expression: string | undefined, allowed: readonly string[]): boolean
export declare function closure(lock: Lock, names: readonly string[]): Set<string>
export declare function shipped(
  lock: Lock,
  pkg: { dependencies?: Record<string, string>; peerDependencies?: Record<string, string> },
): Set<string>
export declare function judge(
  report: AuditReport,
  ships: Set<string>,
  accepted?: Record<string, string>,
): { failures: string[]; warnings: string[]; devOnly: number }
export declare function isRegistryFailure(output: string): boolean
