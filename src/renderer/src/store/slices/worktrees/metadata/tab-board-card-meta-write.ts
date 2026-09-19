import type { WorktreeMeta } from '../../../../../../shared/worktree/meta-types'
import type { WorktreeSlice } from '../../worktree-helpers'
import type { WorktreeSliceGet } from '../listing/worktree-slice-types'
import { parseTabBoardCardId } from '../../../../../../shared/workspace-board-tab-cards'

/**
 * A tab card owns its board status and its name; the rest — pin, unread, links —
 * is a projection of the workspace and is re-addressed there, so a write through
 * a card can never invent per-tab workspace metadata.
 *
 * Returns null when the id is not a tab card, so the caller falls through.
 */
/**
 * Applies the facts a tab card owns and returns what is left for the workspace.
 * Shared so the single and batch write paths cannot drift apart.
 */
export function applyTabBoardCardOwnUpdates(
  get: WorktreeSliceGet,
  tabId: string,
  updates: Partial<WorktreeMeta>
): Partial<WorktreeMeta> {
  const { workspaceStatus, displayName, ...ownerUpdates } = updates
  if (workspaceStatus !== undefined) {
    get().setTabBoardStatus(tabId, workspaceStatus)
  }
  // Why the tab's own label: the card shows the tab name, so renaming it through
  // the workspace renamed something the card never displays — the rename looked
  // like it did nothing. An empty name clears the override back to the live title.
  if (displayName !== undefined) {
    get().setTabCustomLabel(tabId, displayName.trim() || null)
  }
  return ownerUpdates
}

export function applyTabBoardCardMetaWrite(
  get: WorktreeSliceGet,
  worktreeId: string,
  updates: Partial<WorktreeMeta>,
  options?: Parameters<WorktreeSlice['updateWorktreeMeta']>[2]
): ReturnType<WorktreeSlice['updateWorktreeMeta']> | null {
  const tabId = parseTabBoardCardId(worktreeId)
  if (!tabId) {
    return null
  }
  const ownerUpdates = applyTabBoardCardOwnUpdates(get, tabId, updates)
  const ownerWorktreeId = get().getTab(tabId)?.worktreeId
  if (!ownerWorktreeId || Object.keys(ownerUpdates).length === 0) {
    return Promise.resolve({ ok: true })
  }
  return get().updateWorktreeMeta(ownerWorktreeId, ownerUpdates, options)
}
