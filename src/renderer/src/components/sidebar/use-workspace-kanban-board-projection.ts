import { useLayoutEffect, useMemo } from 'react'
import { useAppStore } from '@/store'
import { useVisibleWorkspaceKanbanWorktreeIds } from './use-visible-workspace-kanban-worktree-ids'
import { groupWorkspaceKanbanWorktrees } from './workspace-kanban-worktree-groups'
import { buildWorkspaceKanbanLaneViews } from './workspace-kanban-search'
import { useWorkspaceKanbanSearch } from './use-workspace-kanban-search'
import { registerWorkspaceKanbanSidebarDropGroups } from './workspace-kanban-sidebar-drop'
import { buildUnambiguousWorktreeIdIndex } from './worktree-unambiguous-id-index'
import {
  expandWorkspaceBoardTabCards,
  parseTabBoardCardId,
  tabBoardCardId
} from '../../../../shared/workspace-board-tab-cards'
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
  // Mirrors getActiveTab without pulling the whole tabs slice into this memo.
  const activeTabId = useAppStore((s) => {
    const workspaceId = args.activeWorktreeId
    if (!workspaceId) {
      return null
    }
    // Why defaulted: the board renders under mocked stores where these slices
    // are absent, and an unguarded index throws out of the selector.
    const groupId = s.activeGroupIdByWorktree?.[workspaceId]
    return (
      (s.groupsByWorktree?.[workspaceId] ?? []).find((group) => group.id === groupId)
        ?.activeTabId ?? null
    )
  })
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
  //
  // Why BOTH the workspaces and their tab cards: expansion replaces a multi-tab
  // workspace with tab cards, so indexing only the expansion dropped that
  // workspace's own id — and a sidebar row dragged onto a lane resolved to
  // nothing at all.
  const worktreeById = useMemo(() => {
    // Why only the TAB cards are added: expansion passes a workspace with fewer
    // than two tabs through unchanged, so concatenating its whole output would
    // list every such workspace twice — and the index drops duplicate ids as
    // ambiguous, silently removing the very rows a drop needs to resolve.
    const tabCards = boardExpandsWorkspaceTabs
      ? expandWorkspaceBoardTabCards({
          worktrees: boardSourceWorktrees,
          tabsByWorkspaceId: unifiedTabsByWorktree,
          tabStatusByTabId: tabBoardStatusByTabId
        }).filter((card) => parseTabBoardCardId(card.id) !== null)
      : []
    return buildUnambiguousWorktreeIdIndex([...boardSourceWorktrees, ...tabCards])
  }, [
    boardExpandsWorkspaceTabs,
    boardSourceWorktrees,
    tabBoardStatusByTabId,
    unifiedTabsByWorktree
  ])
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
  // Why resolved against the rendered cards: once a workspace expands into tab
  // cards its own identity is no longer on the board, so highlighting it marked
  // nothing at all. Fall back to the workspace when its tab card is not shown.
  const activeWorktreeIdentity = useMemo(() => {
    if (!args.activeWorktreeId) {
      return null
    }
    const host = args.activeWorkspaceExecutionHostId ?? undefined
    const workspaceIdentity = composeWorktreeHostIdentity(host, args.activeWorktreeId)
    if (!activeTabId) {
      return workspaceIdentity
    }
    const tabIdentity = composeWorktreeHostIdentity(host, tabBoardCardId(activeTabId))
    return boardCardIdentities.has(tabIdentity) ? tabIdentity : workspaceIdentity
  }, [activeTabId, args.activeWorkspaceExecutionHostId, args.activeWorktreeId, boardCardIdentities])
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
