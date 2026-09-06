import type { FolderWorkspace } from '../../../../shared/folder-workspace-types'
import type { Worktree } from '../../../../shared/worktree/types'
import { folderWorkspaceToWorktree } from '../../../../shared/folder-workspace-worktree'

/**
 * The worktree lookup every sidebar status mutation resolves ids through.
 *
 * Why widened: `useWorktreeMap` is built from `worktreesByRepo`, which holds git
 * worktrees only. A status move addressed by a `folder:` key found nothing and
 * returned silently, so dragging a folder workspace onto a board lane — or onto
 * a status section — did nothing at all.
 *
 * Deliberately separate from the map lineage rendering reads: that one must stay
 * the git-worktree topology.
 */
export function buildStatusMutationWorktreeMap(
  worktreeMap: ReadonlyMap<string, Worktree>,
  folderWorkspaces: readonly FolderWorkspace[]
): Map<string, Worktree> {
  const widened = new Map(worktreeMap)
  for (const folderWorkspace of folderWorkspaces) {
    const card = folderWorkspaceToWorktree(folderWorkspace)
    widened.set(card.id, card)
  }
  return widened
}
