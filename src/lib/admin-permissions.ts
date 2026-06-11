import type { AdminRole } from '@/lib/db/schema/auth/tables'

// Which admin sidebar sections (by their menu id) each role may access.
// 'super_admin' (and the ADMIN_WALLETS / is_admin owner) get everything.
export const ROLE_SECTIONS: Record<AdminRole, string[]> = {
  super_admin: ['*'],
  finance_admin: ['general', 'finance', 'affiliate'],
  market_manager: ['general', 'trending', 'social', 'categories', 'market-context'],
  content_manager: ['general', 'categories', 'social', 'events', 'theme'],
  moderator: ['general', 'support', 'users', 'social'],
  risk_analyst: ['general', 'events', 'market-context'],
  support_agent: ['general', 'support'],
}

export type AllowedSections = Set<string> | '*'

/**
 * Resolve the set of admin sections a user may access.
 * Returns '*' for full access (super admin / is_admin owner).
 */
export function getAllowedSections(roles: AdminRole[], hasFullAccess: boolean): AllowedSections {
  if (hasFullAccess || roles.includes('super_admin')) {
    return '*'
  }

  const sections = new Set<string>()
  for (const role of roles) {
    for (const section of ROLE_SECTIONS[role] ?? []) {
      sections.add(section)
    }
  }
  return sections
}

/** True if the user may access a given section id. */
export function canAccessSection(allowed: AllowedSections, sectionId: string): boolean {
  return allowed === '*' || allowed.has(sectionId)
}

/** Serialize for passing to client components ('*' or an array of ids). */
export function serializeAllowedSections(allowed: AllowedSections): '*' | string[] {
  return allowed === '*' ? '*' : Array.from(allowed)
}
