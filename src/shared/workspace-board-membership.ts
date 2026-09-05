/**
 * Per-row override of what the workspace board shows.
 *
 * The board's membership otherwise mirrors the sidebar filters exactly. This is
 * the explicit escape hatch in both directions: 'excluded' drops a visible row
 * from the board only, 'included' puts a row back on it even when a sidebar
 * filter hides it.
 */
export type WorkspaceBoardMembership = 'auto' | 'excluded' | 'included'

export function getWorkspaceBoardMembership(
  workspaceIdentity: string,
  excluded: readonly string[],
  included: readonly string[]
): WorkspaceBoardMembership {
  if (excluded.includes(workspaceIdentity)) {
    return 'excluded'
  }
  return included.includes(workspaceIdentity) ? 'included' : 'auto'
}

/** The two lists after moving one row to `membership`; a row is never in both. */
export function applyWorkspaceBoardMembership(
  workspaceIdentity: string,
  membership: WorkspaceBoardMembership,
  excluded: readonly string[],
  included: readonly string[]
): { excluded: string[]; included: string[] } {
  const withoutExcluded = excluded.filter((id) => id !== workspaceIdentity)
  const withoutIncluded = included.filter((id) => id !== workspaceIdentity)
  if (membership === 'excluded') {
    return { excluded: [...withoutExcluded, workspaceIdentity], included: withoutIncluded }
  }
  if (membership === 'included') {
    return { excluded: withoutExcluded, included: [...withoutIncluded, workspaceIdentity] }
  }
  return { excluded: withoutExcluded, included: withoutIncluded }
}

/** Board membership for one row, given what the sidebar filters already decided. */
export function isWorkspaceOnBoard(
  workspaceIdentity: string,
  sidebarVisible: boolean,
  excluded: ReadonlySet<string>,
  included: ReadonlySet<string>
): boolean {
  if (excluded.has(workspaceIdentity)) {
    return false
  }
  return sidebarVisible || included.has(workspaceIdentity)
}
