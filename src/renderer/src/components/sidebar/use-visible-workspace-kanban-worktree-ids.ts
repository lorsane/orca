import { useMemo } from 'react'
import { useAppStore } from '@/store'
import { getAgentStatusEpochNow } from '@/lib/agent-status-epoch-clock'
import { useLocalDayStart } from '@/lib/use-local-day-start'
import type { Repo } from '../../../../shared/repo-types'
import type { Worktree } from '../../../../shared/worktree/types'
import { computeVisibleWorktrees } from './visible-worktrees'
import { getWorktreeIdsWithLiveAgent } from '@/lib/worktree-activity-state'
import { getSettingsFocusedExecutionHostId } from '../../../../shared/execution-host'
import type { AppState } from '@/store/types'
import {
  EMPTY_PAIRED_DEVICE_IDS_BY_ENVIRONMENT,
  getPairedDeviceIdsByEnvironment
} from './workspace-creator-visibility'
import { getWorktreeHostIdentity } from '../../../../shared/worktree/host-qualified-identity'
import { getActiveSidebarWorkspaceId } from '../../../../shared/workspace-scope'
import {
  folderWorkspaceRowIdentity,
  folderWorkspaceToWorktree
} from '../../../../shared/folder-workspace-worktree'
import { toHiddenRowSet } from '../../../../shared/hidden-sidebar-rows'
import { isWorkspaceOnBoard } from '../../../../shared/workspace-board-membership'
import { useSidebarWorktreeFilters } from './worktree-list/listing/use-filters'
import { useSidebarHostVisibleScope } from './worktree-list/listing/use-host-visible-scope'
import { EMPTY_PROJECT_GROUPS } from './worktree-list/viewport/viewport-props'

type UseVisibleWorkspaceKanbanWorktreeIdsParams = {
  allWorktrees: readonly Worktree[]
  repoMap: Map<string, Repo>
}

const EMPTY_WORKTREE_ID_SET: ReadonlySet<string> = new Set()
const EMPTY_RUNTIME_ENVIRONMENTS: AppState['runtimeEnvironments'] = []
const EMPTY_RUNTIME_STATUS_BY_ENVIRONMENT_ID: AppState['runtimeStatusByEnvironmentId'] = new Map()

export type VisibleWorkspaceKanbanRows = {
  /** Host-qualified identities of every row the board may render. */
  visibleWorktreeIds: ReadonlySet<string>
  /** Visible folder workspaces projected into board-card shape. */
  folderBoardWorktrees: readonly Worktree[]
}

export function useVisibleWorkspaceKanbanWorktreeIds({
  allWorktrees,
  repoMap
}: UseVisibleWorkspaceKanbanWorktreeIdsParams): VisibleWorkspaceKanbanRows {
  const worktreesByRepo = useAppStore((s) => s.worktreesByRepo)
  const showSleepingWorkspaces = useAppStore((s) => s.showSleepingWorkspaces)
  const hideDefaultBranchWorkspace = useAppStore((s) => s.hideDefaultBranchWorkspace)
  const hideAutomationGeneratedWorkspaces = useAppStore((s) => s.hideAutomationGeneratedWorkspaces)
  const hideCliCreatedWorkspaces = useAppStore((s) => s.hideCliCreatedWorkspaces)
  const hideDetachedHeadWorkspaces = useAppStore((s) => s.hideDetachedHeadWorkspaces)
  const hideWorkspacesFromOtherDevices = useAppStore((s) => s.hideWorkspacesFromOtherDevices)
  const workspaceActivityWindow = useAppStore((s) => s.workspaceActivityWindow)
  const hiddenWorkspaceIdentities = useAppStore((s) => s.hiddenWorkspaceIdentities)
  const hiddenSidebarProjectIds = useAppStore((s) => s.hiddenSidebarProjectIds)
  const showHiddenSidebarRows = useAppStore((s) => s.showHiddenSidebarRows)
  const activeWorktreeId = useAppStore((s) =>
    getActiveSidebarWorkspaceId(s.activeWorkspaceKey, s.activeWorktreeId)
  )
  const dayStartAt = useLocalDayStart()
  const runtimeEnvironments = useAppStore((s) =>
    s.hideWorkspacesFromOtherDevices ? s.runtimeEnvironments : EMPTY_RUNTIME_ENVIRONMENTS
  )
  const runtimeStatusByEnvironmentId = useAppStore((s) =>
    s.hideWorkspacesFromOtherDevices
      ? s.runtimeStatusByEnvironmentId
      : EMPTY_RUNTIME_STATUS_BY_ENVIRONMENT_ID
  )
  const alwaysShowDefaultBranchWorkspace = useAppStore((s) => s.alwaysShowDefaultBranchWorkspace)
  const workspaceHostScope = useAppStore((s) => s.workspaceHostScope)
  const visibleWorkspaceHostIds = useAppStore((s) => s.visibleWorkspaceHostIds)
  const settings = useAppStore((s) => s.settings)
  const filterRepoIds = useAppStore((s) => s.filterRepoIds)
  const tabsByWorktree = useAppStore((s) => (!showSleepingWorkspaces ? s.tabsByWorktree : null))
  const ptyIdsByTabId = useAppStore((s) => (!showSleepingWorkspaces ? s.ptyIdsByTabId : null))
  const browserTabsByWorktree = useAppStore((s) =>
    !showSleepingWorkspaces ? s.browserTabsByWorktree : null
  )
  const agentStatusEpoch = useAppStore((s) => (!showSleepingWorkspaces ? s.agentStatusEpoch : 0))
  // Why: skip the clock entirely when the epoch is the opt-out sentinel, so a
  // sleeping-workspaces board cannot evict the sample the live boards share.
  const agentStatusNow = showSleepingWorkspaces ? 0 : getAgentStatusEpochNow(agentStatusEpoch)
  // Why snapshot on the epoch: the always-mounted drawer must not scan every
  // agent on unrelated store writes; membership changes advance this tick. Keep
  // the epoch itself in the deps — two bumps in one millisecond share a sample,
  // so `agentStatusNow` alone would not re-key the memo.
  const worktreeIdsWithLiveAgent = useMemo(() => {
    void agentStatusEpoch
    return !showSleepingWorkspaces
      ? getWorktreeIdsWithLiveAgent(
          useAppStore.getState().agentStatusByPaneKey,
          tabsByWorktree,
          agentStatusNow
        )
      : EMPTY_WORKTREE_ID_SET
  }, [agentStatusEpoch, agentStatusNow, showSleepingWorkspaces, tabsByWorktree])

  const pairedDeviceIdsByEnvironment = useMemo(
    () =>
      hideWorkspacesFromOtherDevices
        ? getPairedDeviceIdsByEnvironment(runtimeEnvironments, runtimeStatusByEnvironmentId)
        : EMPTY_PAIRED_DEVICE_IDS_BY_ENVIRONMENT,
    [hideWorkspacesFromOtherDevices, runtimeEnvironments, runtimeStatusByEnvironmentId]
  )
  // Why the sidebar's own scope hook: folder workspaces never flow through
  // computeVisibleWorktrees, and a second copy of their filter rules is how the
  // two surfaces drift.
  const { filterState } = useSidebarWorktreeFilters()
  const repos = useAppStore((s) => s.repos)
  const projectGroups = useAppStore((s) => s.projectGroups ?? EMPTY_PROJECT_GROUPS)
  const folderWorkspaces = useAppStore((s) => s.folderWorkspaces)
  const { visibleFolderWorkspacesForRows } = useSidebarHostVisibleScope({
    filterState,
    defaultHostId: getSettingsFocusedExecutionHostId(settings),
    repos,
    projectGroups,
    folderWorkspaces,
    pairedDeviceIdsByEnvironment
  })
  const boardExcluded = useAppStore((s) => s.boardExcludedWorkspaceIdentities)
  const boardIncluded = useAppStore((s) => s.boardIncludedWorkspaceIdentities)
  const boardExcludedSet = useMemo(() => toHiddenRowSet(boardExcluded), [boardExcluded])
  const boardIncludedSet = useMemo(() => toHiddenRowSet(boardIncluded), [boardIncluded])
  // Why the full catalog and not the visible slice: an explicitly included row
  // must reach the board even when a sidebar filter dropped it.
  const folderBoardWorktrees = useMemo(() => {
    const visibleIdentities = new Set(
      visibleFolderWorkspacesForRows.map(folderWorkspaceRowIdentity)
    )
    return folderWorkspaces
      .map(folderWorkspaceToWorktree)
      .filter((card) =>
        isWorkspaceOnBoard(
          getWorktreeHostIdentity(card),
          visibleIdentities.has(getWorktreeHostIdentity(card)),
          boardExcludedSet,
          boardIncludedSet
        )
      )
  }, [boardExcludedSet, boardIncludedSet, folderWorkspaces, visibleFolderWorkspacesForRows])

  const visibleWorktreeIds = useMemo(() => {
    // Why: the board has its own status ordering, but visibility must match
    // the sidebar filters exactly so hidden workspaces do not reappear here.
    const sortedIds = allWorktrees.map((worktree) => worktree.id)
    return new Set(
      computeVisibleWorktrees(worktreesByRepo, sortedIds, {
        filterRepoIds,
        showSleepingWorkspaces,
        tabsByWorktree,
        ptyIdsByTabId,
        browserTabsByWorktree,
        worktreeIdsWithLiveAgent,
        hideDefaultBranchWorkspace,
        hideAutomationGeneratedWorkspaces,
        hideCliCreatedWorkspaces,
        hideDetachedHeadWorkspaces,
        hideWorkspacesFromOtherDevices,
        workspaceActivityWindow,
        hiddenWorkspaceIdentities: showHiddenSidebarRows
          ? undefined
          : toHiddenRowSet(hiddenWorkspaceIdentities),
        hiddenSidebarProjectIds: showHiddenSidebarRows
          ? undefined
          : toHiddenRowSet(hiddenSidebarProjectIds),
        activityWindowNow: dayStartAt,
        activeWorktreeId,
        pairedDeviceIdsByEnvironment,
        alwaysShowDefaultBranchWorkspace,
        repoMap,
        workspaceHostScope,
        visibleWorkspaceHostIds,
        defaultHostId: getSettingsFocusedExecutionHostId(settings),
        worktreeLineageById: {},
        // Why: the board has no nested lineage presentation. Ancestor injection
        // would make filtered-out parents appear as ordinary cards.
        injectLineageAncestors: false
      }).map(getWorktreeHostIdentity)
    )
  }, [
    allWorktrees,
    browserTabsByWorktree,
    filterRepoIds,
    hideDefaultBranchWorkspace,
    hideAutomationGeneratedWorkspaces,
    hideCliCreatedWorkspaces,
    hideDetachedHeadWorkspaces,
    hideWorkspacesFromOtherDevices,
    workspaceActivityWindow,
    hiddenWorkspaceIdentities,
    hiddenSidebarProjectIds,
    showHiddenSidebarRows,
    activeWorktreeId,
    dayStartAt,
    alwaysShowDefaultBranchWorkspace,
    workspaceHostScope,
    visibleWorkspaceHostIds,
    settings,
    ptyIdsByTabId,
    repoMap,
    pairedDeviceIdsByEnvironment,
    showSleepingWorkspaces,
    tabsByWorktree,
    worktreeIdsWithLiveAgent,
    worktreesByRepo
  ])

  return useMemo(() => {
    const boardIdentities = new Set(folderBoardWorktrees.map(getWorktreeHostIdentity))
    for (const worktree of allWorktrees) {
      const identity = getWorktreeHostIdentity(worktree)
      if (
        isWorkspaceOnBoard(
          identity,
          visibleWorktreeIds.has(identity),
          boardExcludedSet,
          boardIncludedSet
        )
      ) {
        boardIdentities.add(identity)
      }
    }
    return { visibleWorktreeIds: boardIdentities, folderBoardWorktrees }
  }, [allWorktrees, boardExcludedSet, boardIncludedSet, folderBoardWorktrees, visibleWorktreeIds])
}
