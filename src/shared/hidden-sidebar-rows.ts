import type { ProjectGroup } from './project-group-types'

/**
 * User-hidden sidebar rows: individual workspaces and whole projects.
 *
 * Distinct from the filter flags, which describe a KIND of row. This is an
 * explicit per-row opt-out the user can undo, so a long-lived project that is
 * simply not interesting right now can leave the list without being archived.
 *
 * Workspaces are keyed by host-qualified identity (the key every other sidebar
 * set uses); projects by repo id or project-group id.
 */
export const EMPTY_HIDDEN_ROW_SET: ReadonlySet<string> = new Set()

export function toHiddenRowSet(ids: readonly string[] | undefined): ReadonlySet<string> {
  return ids && ids.length > 0 ? new Set(ids) : EMPTY_HIDDEN_ROW_SET
}

export function toggleHiddenRowId(ids: readonly string[], id: string, hidden: boolean): string[] {
  const has = ids.includes(id)
  if (hidden === has) {
    return ids as string[]
  }
  return hidden ? [...ids, id] : ids.filter((candidate) => candidate !== id)
}

/** A group is hidden by its own id or by any ancestor's — hiding a parent must
 *  not leave its nested groups behind. */
export function isHiddenProjectGroupId(
  groupId: string | null | undefined,
  hiddenProjectIds: ReadonlySet<string>,
  projectGroupsById: ReadonlyMap<string, ProjectGroup>
): boolean {
  if (!groupId || hiddenProjectIds.size === 0) {
    return false
  }
  const seen = new Set<string>()
  let currentId: string | null | undefined = groupId
  while (currentId && !seen.has(currentId)) {
    if (hiddenProjectIds.has(currentId)) {
      return true
    }
    seen.add(currentId)
    currentId = projectGroupsById.get(currentId)?.parentGroupId
  }
  return false
}

export function hasHiddenSidebarRows(
  hiddenWorkspaceIdentities: readonly string[],
  hiddenProjectIds: readonly string[]
): boolean {
  return hiddenWorkspaceIdentities.length > 0 || hiddenProjectIds.length > 0
}

/**
 * Hidden project ids widened to the repos those projects contain.
 *
 * Why: hiding a project GROUP only removed the group from the render list, and
 * the section emitter then treats a repo whose group it cannot find as one with
 * unfetched metadata and re-appends it at the top level. The group appeared to
 * flatten rather than hide. Hiding a group has to hide its repos too.
 */
export function expandHiddenSidebarProjectIds(args: {
  hiddenSidebarProjectIds: readonly string[]
  repos: readonly { id: string; projectGroupId?: string | null }[]
  projectGroups: readonly ProjectGroup[]
}): string[] {
  if (args.hiddenSidebarProjectIds.length === 0) {
    return []
  }
  const hidden = new Set(args.hiddenSidebarProjectIds)
  const projectGroupsById = new Map(args.projectGroups.map((group) => [group.id, group]))
  for (const repo of args.repos) {
    if (isHiddenProjectGroupId(repo.projectGroupId, hidden, projectGroupsById)) {
      hidden.add(repo.id)
    }
  }
  return [...hidden]
}
