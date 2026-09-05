import { useCallback } from 'react'
import { useAppStore } from '@/store'
import type { Worktree } from '../../../../shared/worktree/types'
import { getWorktreeHostIdentity } from '../../../../shared/worktree/host-qualified-identity'
import { getWorkspaceBoardMembership } from '../../../../shared/workspace-board-membership'

/** Drop the right-clicked rows from the workspace board, or force them back on
 *  it when a sidebar filter would otherwise keep them off. */
export function useWorkspaceBoardMembershipAction(
  worktree: Worktree,
  contextWorktrees: readonly Worktree[]
): { isExcludedFromBoard: boolean; toggleBoardMembership: () => void } {
  const setWorkspaceBoardMembership = useAppStore((s) => s.setWorkspaceBoardMembership)
  const isExcludedFromBoard = useAppStore(
    (s) =>
      getWorkspaceBoardMembership(
        getWorktreeHostIdentity(worktree),
        s.boardExcludedWorkspaceIdentities,
        s.boardIncludedWorkspaceIdentities
      ) === 'excluded'
  )
  const toggleBoardMembership = useCallback(() => {
    const rows = contextWorktrees.length > 0 ? contextWorktrees : [worktree]
    for (const row of rows) {
      // Why 'included' and not 'auto': the row is only reachable here because
      // the user is looking at it, and "Show on board" must beat a filter.
      setWorkspaceBoardMembership(
        getWorktreeHostIdentity(row),
        isExcludedFromBoard ? 'included' : 'excluded'
      )
    }
  }, [contextWorktrees, isExcludedFromBoard, setWorkspaceBoardMembership, worktree])
  return { isExcludedFromBoard, toggleBoardMembership }
}
