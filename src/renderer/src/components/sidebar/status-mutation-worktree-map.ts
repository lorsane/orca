import type { FolderWorkspace } from '../../../../shared/folder-workspace-types'
import type { Worktree } from '../../../../shared/worktree/types'
import { folderWorkspaceToWorktree } from '../../../../shared/folder-workspace-worktree'

/**
 * The worktree lookup every sidebar status mutation resolves ids through.
 *
 * Why widened: `useWorktreeMap` is built from `worktreesByRepo`, which holds git
 * worktrees only. A status move addressed by a `folder:` or `tab:` key found
 * nothing and returned silently, so dragging a folder workspace or a pinned tab
 * onto a board lane — or onto a status section — did nothing at all.
 *
 * Deliberately separate from the map lineage rendering reads: that one must stay
 * the git-worktree topology.
 */
export function buildStatusMutationWorktreeMap(
  worktreeMap: ReadonlyMap<string, Worktree>,
  folderWorkspaces: readonly FolderWorkspace[],
  pinnedTabCards: readonly Worktree[] = []
): Map<string, Worktree> {
  const widened = new Map(worktreeMap)
  for (const folderWorkspace of folderWorkspaces) {
    const card = folderWorkspaceToWorktree(folderWorkspace)
    widened.set(card.id, card)
  }
  // Why pinned tab cards too: they are sidebar rows like any other, so dragging
  // one onto a board lane addresses it by its `tab:` id — which resolved to
  // nothing, and the drop returned silently.
  for (const card of pinnedTabCards) {
    widened.set(card.id, card)
  }
  return widened
}
