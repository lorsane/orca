import { useCallback } from 'react'
import { useAppStore } from '@/store'
import type { Worktree } from '../../../../shared/worktree/types'
import { getWorktreeHostIdentity } from '../../../../shared/worktree/host-qualified-identity'

/** Hide/unhide the right-clicked sidebar rows. Reversible and per-row, unlike
 *  archiving or the kind-based filter flags. */
export function useWorktreeRowHideAction(
  worktree: Worktree,
  contextWorktrees: readonly Worktree[]
): { isHidden: boolean; toggleHidden: () => void } {
  const setWorkspaceRowHidden = useAppStore((s) => s.setWorkspaceRowHidden)
  const isHidden = useAppStore((s) =>
    s.hiddenWorkspaceIdentities.includes(getWorktreeHostIdentity(worktree))
  )
  const toggleHidden = useCallback(() => {
    const rows = contextWorktrees.length > 0 ? contextWorktrees : [worktree]
    for (const row of rows) {
      setWorkspaceRowHidden(getWorktreeHostIdentity(row), !isHidden)
    }
  }, [contextWorktrees, isHidden, setWorkspaceRowHidden, worktree])
  return { isHidden, toggleHidden }
}
