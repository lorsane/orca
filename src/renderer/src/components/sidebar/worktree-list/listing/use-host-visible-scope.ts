import { useMemo } from 'react'
import { useAppStore } from '@/store'
import { useLocalDayStart } from '@/lib/use-local-day-start'
import { isWithinWorkspaceActivityWindow } from '../../../../../../shared/workspace-activity-window'
import {
  EMPTY_HIDDEN_ROW_SET,
  isHiddenProjectGroupId,
  toHiddenRowSet
} from '../../../../../../shared/hidden-sidebar-rows'
import { folderWorkspaceRowIdentity } from '../../../../../../shared/folder-workspace-worktree'
import {
  folderWorkspaceKey,
  getActiveSidebarWorkspaceId
} from '../../../../../../shared/workspace-scope'
import type { FolderWorkspace } from '../../../../../../shared/folder-workspace-types'
import type { ProjectGroup } from '../../../../../../shared/project-group-types'
import type { Repo } from '../../../../../../shared/repo-types'
import {
  getRepoExecutionHostId,
  type ExecutionHostId
} from '../../../../../../shared/execution-host'
import type { SidebarWorktreeFilters } from './use-filters'
import { filterFolderWorkspacesFromOtherDevices } from '../../workspace-creator-visibility'
import {
  filterFolderWorkspacesForVisibleHosts,
  filterProjectGroupsForVisibleHosts,
  getVisibleSidebarHostIdSet
} from './host-filtering'

// Narrows repos, project groups, and folder workspaces to the hosts (and devices) the
// current host filter admits.
export function useSidebarHostVisibleScope(args: {
  filterState: SidebarWorktreeFilters['filterState']
  defaultHostId: ExecutionHostId
  repos: readonly Repo[]
  projectGroups: readonly ProjectGroup[]
  folderWorkspaces: readonly FolderWorkspace[]
  pairedDeviceIdsByEnvironment: Parameters<typeof filterFolderWorkspacesFromOtherDevices>[1]
}) {
  const { filterState, defaultHostId, repos, projectGroups, folderWorkspaces } = args
  const {
    visibleWorkspaceHostIds,
    workspaceHostScope,
    hideWorkspacesFromOtherDevices,
    workspaceActivityWindow,
    hiddenWorkspaceIdentities,
    hiddenSidebarProjectIds,
    showHiddenSidebarRows
  } = filterState
  const hiddenProjectIdSet = useMemo(
    () => (showHiddenSidebarRows ? EMPTY_HIDDEN_ROW_SET : toHiddenRowSet(hiddenSidebarProjectIds)),
    [hiddenSidebarProjectIds, showHiddenSidebarRows]
  )
  const hiddenWorkspaceIdentitySet = useMemo(
    () =>
      showHiddenSidebarRows ? EMPTY_HIDDEN_ROW_SET : toHiddenRowSet(hiddenWorkspaceIdentities),
    [hiddenWorkspaceIdentities, showHiddenSidebarRows]
  )
  const projectGroupsById = useMemo(
    () => new Map(projectGroups.map((group) => [group.id, group])),
    [projectGroups]
  )
  const activeSidebarWorkspaceId = useAppStore((s) =>
    getActiveSidebarWorkspaceId(s.activeWorkspaceKey, s.activeWorktreeId)
  )
  const dayStartAt = useLocalDayStart()
  const visibleHostIdSet = useMemo(
    () => getVisibleSidebarHostIdSet(visibleWorkspaceHostIds, workspaceHostScope),
    [visibleWorkspaceHostIds, workspaceHostScope]
  )
  const visibleReposForRows = useMemo(() => {
    const shownRepos =
      hiddenProjectIdSet.size > 0 ? repos.filter((repo) => !hiddenProjectIdSet.has(repo.id)) : repos
    if (!visibleHostIdSet) {
      return shownRepos
    }
    return shownRepos.filter((repo) => {
      const hostId =
        repo.connectionId || repo.executionHostId ? getRepoExecutionHostId(repo) : defaultHostId
      return visibleHostIdSet.has(hostId)
    })
  }, [defaultHostId, hiddenProjectIdSet, repos, visibleHostIdSet])
  const visibleProjectGroupsForRows = useMemo(() => {
    const hostVisible = filterProjectGroupsForVisibleHosts(
      projectGroups,
      visibleHostIdSet,
      defaultHostId
    )
    return hiddenProjectIdSet.size > 0
      ? hostVisible.filter(
          (group) => !isHiddenProjectGroupId(group.id, hiddenProjectIdSet, projectGroupsById)
        )
      : hostVisible
  }, [defaultHostId, hiddenProjectIdSet, projectGroups, projectGroupsById, visibleHostIdSet])
  const visibleFolderWorkspacesForRows = useMemo(() => {
    const hostVisibleWorkspaces = filterFolderWorkspacesForVisibleHosts(
      folderWorkspaces,
      projectGroups,
      visibleHostIdSet,
      defaultHostId
    )
    const deviceVisibleWorkspaces = hideWorkspacesFromOtherDevices
      ? filterFolderWorkspacesFromOtherDevices(
          hostVisibleWorkspaces,
          args.pairedDeviceIdsByEnvironment
        )
      : hostVisibleWorkspaces
    const shownWorkspaces =
      hiddenWorkspaceIdentitySet.size > 0 || hiddenProjectIdSet.size > 0
        ? deviceVisibleWorkspaces.filter(
            (workspace) =>
              !hiddenWorkspaceIdentitySet.has(folderWorkspaceRowIdentity(workspace)) &&
              !isHiddenProjectGroupId(
                workspace.projectGroupId,
                hiddenProjectIdSet,
                projectGroupsById
              )
          )
        : deviceVisibleWorkspaces
    if (!workspaceActivityWindow || workspaceActivityWindow === 'all') {
      return shownWorkspaces
    }
    return shownWorkspaces.filter(
      (workspace) =>
        folderWorkspaceKey(workspace.id) === activeSidebarWorkspaceId ||
        isWithinWorkspaceActivityWindow(
          workspace.lastActivityAt,
          workspaceActivityWindow,
          dayStartAt
        )
    )
  }, [
    activeSidebarWorkspaceId,
    dayStartAt,
    hiddenProjectIdSet,
    hiddenWorkspaceIdentitySet,
    projectGroupsById,
    workspaceActivityWindow,
    args.pairedDeviceIdsByEnvironment,
    defaultHostId,
    folderWorkspaces,
    hideWorkspacesFromOtherDevices,
    projectGroups,
    visibleHostIdSet
  ])

  return { visibleReposForRows, visibleProjectGroupsForRows, visibleFolderWorkspacesForRows }
}
