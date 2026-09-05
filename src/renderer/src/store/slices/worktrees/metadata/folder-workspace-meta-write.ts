import type { WorktreeMeta } from '../../../../../../shared/worktree/meta-types'
import type { WorktreeSlice } from '../../worktree-helpers'
import type { WorktreeSliceGet } from '../listing/worktree-slice-types'
import { parseWorkspaceKey } from '../../../../../../shared/workspace-scope'
import { getFolderWorkspaceMetaUpdates } from '../listing/detected-worktree-meta'
import { translate } from '@/i18n/i18n'

/**
 * Folder-workspace half of updateWorktreeMeta. Returns null when the id is not
 * a folder workspace, so the caller falls through to the git-worktree path.
 */
export async function applyFolderWorkspaceMetaWrite(
  get: WorktreeSliceGet,
  worktreeId: string,
  updates: Partial<WorktreeMeta>
): Promise<Awaited<ReturnType<WorktreeSlice['updateWorktreeMeta']>> | null> {
  const workspaceScope = parseWorkspaceKey(worktreeId)
  if (workspaceScope?.type !== 'folder') {
    return null
  }
  const folderUpdates = getFolderWorkspaceMetaUpdates(updates)
  if (Object.keys(folderUpdates).length === 0) {
    return { ok: true }
  }
  try {
    // Why: a rejected folder update reconciles the optimistic write away, so
    // reporting ok would show the dialog a save that silently undid itself.
    const updated = await get().updateFolderWorkspace(
      workspaceScope.folderWorkspaceId,
      folderUpdates
    )
    return updated
      ? { ok: true }
      : {
          ok: false,
          error: translate(
            'auto.store.slices.worktrees.a17f4d2e93',
            'Could not update this workspace.'
          )
        }
  } catch (err) {
    console.error('Failed to update folder workspace meta:', err)
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}
