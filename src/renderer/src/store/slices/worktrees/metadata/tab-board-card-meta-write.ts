import type { WorktreeMeta } from '../../../../../../shared/worktree/meta-types'
import type { WorktreeSlice } from '../../worktree-helpers'
import type { WorktreeSliceGet } from '../listing/worktree-slice-types'
import { parseTabBoardCardId } from '../../../../../../shared/workspace-board-tab-cards'

/**
 * A board tab card owns only its board status. Everything else on it — pin,
 * unread, rename — is a projection of the workspace and is re-addressed there,
 * so a write through a card can never invent per-tab workspace metadata.
 *
 * Returns null when the id is not a tab card, so the caller falls through.
 */
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
  const { workspaceStatus, ...ownerUpdates } = updates
  if (workspaceStatus !== undefined) {
    get().setTabBoardStatus(tabId, workspaceStatus)
  }
  const ownerWorktreeId = get().getTab(tabId)?.worktreeId
  if (!ownerWorktreeId || Object.keys(ownerUpdates).length === 0) {
    return Promise.resolve({ ok: true })
  }
  return get().updateWorktreeMeta(ownerWorktreeId, ownerUpdates, options)
}
