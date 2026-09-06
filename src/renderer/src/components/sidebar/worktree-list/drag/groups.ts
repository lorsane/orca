import { ALL_GROUP_KEY, PINNED_GROUP_KEY } from '../grouping/group-keys'
import { getNaturalWorktreeIds } from '../../natural-worktree-ids'
import type { HostSectionRow } from '../../host-section-rows'
import type { WorktreeDragGroup } from '../../worktree-manual-order'
import { folderWorkspaceKey } from '../../../../../../shared/workspace-scope'

export function getWorktreeDragGroups(rows: HostSectionRow[]): WorktreeDragGroup[] {
  const groups: WorktreeDragGroup[] = []
  let current: { key: string; ids: string[] } | null = null
  const naturalWorktreeIds = getNaturalWorktreeIds(rows)

  for (const row of rows) {
    if (row.type === 'header') {
      current = { key: row.key, ids: [] }
      groups.push({ key: current.key, worktreeIds: current.ids })
      continue
    }
    // Why folder workspaces belong here: without a drag group they have no
    // source key, and use-pointer-drag refuses to start — which is why a pinned
    // folder workspace could not be dragged onto the board at all.
    if (row.type === 'folder-workspace') {
      current?.ids.push(folderWorkspaceKey(row.folderWorkspace.id))
      continue
    }
    if (
      row.type === 'host-header' ||
      row.type === 'imported-worktrees-card' ||
      row.type === 'new-external-worktrees-inbox' ||
      row.type === 'pending-creation'
    ) {
      continue
    }
    if (row.sectionKey === PINNED_GROUP_KEY && naturalWorktreeIds.has(row.worktree.id)) {
      continue
    }
    if (!current) {
      current = { key: ALL_GROUP_KEY, ids: [] }
      groups.push({ key: current.key, worktreeIds: current.ids })
    }
    current.ids.push(row.worktree.id)
  }

  return groups.filter((group) => group.worktreeIds.length > 0)
}

export function getWorktreeDragIndexes(rows: readonly HostSectionRow[]): {
  groupKeyByRowKey: Map<string, string>
  groupIndexByRowKey: Map<string, number>
} {
  const groupKeyByRowKey = new Map<string, string>()
  const groupIndexByRowKey = new Map<string, number>()
  const groupIndexes = new Map<string, number>()
  const naturalWorktreeIds = getNaturalWorktreeIds(rows)
  // Why tracked: a folder-workspace row carries no sectionKey of its own, so its
  // group is the section it was emitted under.
  let currentSectionKey: string | null = null
  for (const row of rows) {
    if (row.type === 'header') {
      currentSectionKey = row.key
      groupIndexes.set(row.key, 0)
      continue
    }
    if (row.type === 'folder-workspace') {
      if (!currentSectionKey) {
        continue
      }
      const folderIndex = groupIndexes.get(currentSectionKey) ?? 0
      const folderRowKey = folderWorkspaceKey(row.folderWorkspace.id)
      groupKeyByRowKey.set(folderRowKey, currentSectionKey)
      groupIndexByRowKey.set(folderRowKey, folderIndex)
      groupIndexes.set(currentSectionKey, folderIndex + 1)
      continue
    }
    if (row.type !== 'item') {
      continue
    }
    if (row.sectionKey === PINNED_GROUP_KEY && naturalWorktreeIds.has(row.worktree.id)) {
      continue
    }
    // Why the header key and not row.sectionKey: pinned status lanes give each
    // lane its own header while their rows keep the one pinned sectionKey, and
    // getWorktreeDragGroups keys groups by header. Reading sectionKey here left
    // the drag with a source group that no group had, so reordering inside
    // Pinned silently did nothing — and split the folder/item index counters.
    const sectionKey = currentSectionKey ?? row.sectionKey
    const index = groupIndexes.get(sectionKey) ?? 0
    groupKeyByRowKey.set(row.rowKey, sectionKey)
    groupIndexByRowKey.set(row.rowKey, index)
    groupIndexes.set(sectionKey, index + 1)
  }
  return { groupKeyByRowKey, groupIndexByRowKey }
}
