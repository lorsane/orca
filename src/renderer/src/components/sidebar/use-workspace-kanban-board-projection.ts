import { useLayoutEffect, useMemo } from 'react'
import { useAppStore } from '@/store'
import { useVisibleWorkspaceKanbanWorktreeIds } from './use-visible-workspace-kanban-worktree-ids'
import { groupWorkspaceKanbanWorktrees } from './workspace-kanban-worktree-groups'
import { buildWorkspaceKanbanLaneViews } from './workspace-kanban-search'
import { useWorkspaceKanbanSearch } from './use-workspace-kanban-search'
import { registerWorkspaceKanbanSidebarDropGroups } from './workspace-kanban-sidebar-drop'
import { buildUnambiguousWorktreeIdIndex } from './worktree-unambiguous-id-index'
import { expandWorkspaceBoardTabCards } from '../../../../shared/workspace-board-tab-cards'
import {
  composeWorktreeHostIdentity,
  getWorktreeHostIdentity
} from '../../../../shared/worktree/host-qualified-identity'
import type { Worktree } from '../../../../shared/worktree/types'
import type { ExecutionHostId } from '../../../../shared/execution-host'
import type { WorktreeDragGroup } from './worktree-manual-order'
import type { useRepoMap } from '@/store/selectors'

export function useWorkspaceKanbanBoardProjection(args: {
  activeWorktreeId: string | null
  activeWorkspaceExecutionHostId: ExecutionHostId | null
  allWorktrees: readonly Worktree[]
  open: boolean
  repoMap: ReturnType<typeof useRepoMap>
  sortBy: ReturnType<typeof useAppStore.getState>['sortBy']
  workspaceStatuses: ReturnType<typeof useAppStore.getState>['workspaceStatuses']
}) {
  const unifiedTabsByWorktree = useAppStore((s) => s.unifiedTabsByWorktree)
  const tabBoardStatusByTabId = useAppStore((s) => s.tabBoardStatusByTabId)
  const boardExpandsWorkspaceTabs = useAppStore((s) => s.boardExpandsWorkspaceTabs)
  const boardExcluded = useAppStore((s) => s.boardExcludedWorkspaceIdentities)
  const boardExcludedSet = useMemo(() => new Set(boardExcluded), [boardExcluded])
  const { visibleWorktreeIds, folderBoardWorktrees } = useVisibleWorkspaceKanbanWorktreeIds({
    allWorktrees: args.allWorktrees,
    repoMap: args.repoMap
  })
  // Folder workspaces are board cards too: they carry their own workspaceStatus
  // and updateWorktreeMeta already routes writes on their `folder:` key.
  const boardSourceWorktrees = useMemo(
    () =>
      folderBoardWorktrees.length > 0
        ? [...args.allWorktrees, ...folderBoardWorktrees]
        : args.allWorktrees,
    [args.allWorktrees, folderBoardWorktrees]
  )
  // Expansion runs after workspace-level visibility so a tab card can never
  // outlive the workspace filter that hid its owner.
  const visibleBoardWorktrees = useMemo(
    () =>
      boardSourceWorktrees.filter((worktree) =>
        visibleWorktreeIds.has(getWorktreeHostIdentity(worktree))
      ),
    [boardSourceWorktrees, visibleWorktreeIds]
  )
  const boardCards = useMemo(() => {
    if (!boardExpandsWorkspaceTabs) {
      return visibleBoardWorktrees
    }
    const expanded = expandWorkspaceBoardTabCards({
      worktrees: visibleBoardWorktrees,
      tabsByWorkspaceId: unifiedTabsByWorktree,
      tabStatusByTabId: tabBoardStatusByTabId
    })
    return boardExcludedSet.size > 0
      ? expanded.filter((card) => !boardExcludedSet.has(getWorktreeHostIdentity(card)))
      : expanded
  }, [
    boardExcludedSet,
    boardExpandsWorkspaceTabs,
    tabBoardStatusByTabId,
    unifiedTabsByWorktree,
    visibleBoardWorktrees
  ])
  const boardCardIdentities = useMemo(
    () => new Set(boardCards.map(getWorktreeHostIdentity)),
    [boardCards]
  )
  const worktreesByStatus = useMemo(
    () =>
      groupWorkspaceKanbanWorktrees({
        worktrees: boardCards,
        visibleWorktreeIds: boardCardIdentities,
        workspaceStatuses: args.workspaceStatuses,
        sortBy: args.sortBy
      }),
    [boardCards, boardCardIdentities, args.sortBy, args.workspaceStatuses]
  )
  // Why the unfiltered source: a status drop can target a workspace the board
  // is not currently showing, and the index is how the drop resolves its card.
  const worktreeById = useMemo(
    () =>
      buildUnambiguousWorktreeIdIndex(
        boardExpandsWorkspaceTabs
          ? expandWorkspaceBoardTabCards({
              worktrees: boardSourceWorktrees,
              tabsByWorkspaceId: unifiedTabsByWorktree,
              tabStatusByTabId: tabBoardStatusByTabId
            })
          : boardSourceWorktrees
      ),
    [boardExpandsWorkspaceTabs, boardSourceWorktrees, tabBoardStatusByTabId, unifiedTabsByWorktree]
  )
  const boardWorktrees = useMemo(
    () => args.workspaceStatuses.flatMap((status) => worktreesByStatus.get(status.id) ?? []),
    [args.workspaceStatuses, worktreesByStatus]
  )
  const boardDragGroups = useMemo<WorktreeDragGroup[]>(
    () =>
      args.workspaceStatuses.map((status) => ({
        key: status.id,
        worktreeIds: (worktreesByStatus.get(status.id) ?? []).map((worktree) => worktree.id)
      })),
    [args.workspaceStatuses, worktreesByStatus]
  )
  useLayoutEffect(() => {
    if (!args.open) {
      return
    }
    return registerWorkspaceKanbanSidebarDropGroups(boardDragGroups)
  }, [args.open, boardDragGroups])
  const laneFullWorktreeIds = useMemo(
    () => new Map(boardDragGroups.map((group) => [group.key, group.worktreeIds])),
    [boardDragGroups]
  )
  const search = useWorkspaceKanbanSearch({
    open: args.open,
    worktrees: boardWorktrees,
    repoMap: args.repoMap
  })
  const laneViews = useMemo(
    () =>
      buildWorkspaceKanbanLaneViews({
        worktreesByStatus,
        matchingWorktreeIds: search.matchingWorktreeIds
      }),
    [search.matchingWorktreeIds, worktreesByStatus]
  )
  const renderedBoardWorktrees = useMemo(
    () =>
      search.matchingWorktreeIds
        ? boardWorktrees.filter((worktree) =>
            search.matchingWorktreeIds?.has(getWorktreeHostIdentity(worktree))
          )
        : boardWorktrees,
    [boardWorktrees, search.matchingWorktreeIds]
  )
  const activeWorktreeIdentity = args.activeWorktreeId
    ? composeWorktreeHostIdentity(
        args.activeWorkspaceExecutionHostId ?? undefined,
        args.activeWorktreeId
      )
    : null
  return {
    activeWorktreeIdentity,
    boardDragGroups,
    boardWorktrees,
    laneFullWorktreeIds,
    laneViews,
    renderedBoardWorktrees,
    search,
    worktreeById,
    worktreesByStatus
  }
}
