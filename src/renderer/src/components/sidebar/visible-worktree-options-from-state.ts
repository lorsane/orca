import type { Repo } from '../../../../shared/repo-types'
import type { useAppStore } from '@/store'
import { getWorktreeIdsWithLiveAgent } from '@/lib/worktree-activity-state'
import { getSettingsFocusedExecutionHostId } from '../../../../shared/execution-host'
import { getActiveSidebarWorkspaceId } from '../../../../shared/workspace-scope'
import { toHiddenRowSet } from '../../../../shared/hidden-sidebar-rows'
import {
  EMPTY_PAIRED_DEVICE_IDS_BY_ENVIRONMENT,
  getPairedDeviceIdsByEnvironment
} from './workspace-creator-visibility'
import type { VisibleWorktreeOptions } from './visible-worktrees'

/**
 * Compute the visible worktree IDs on-demand from the current Zustand store
 * state. Called by the App-level Cmd+1–9 handler (not a React hook — reads
 * store snapshot at call time).
 *
 * If WorktreeList is mounted, returns the exact IDs it rendered. Otherwise
 * recomputes the order the sidebar *would* render from the same row pipeline,
 * so a closed sidebar numbers workspaces the same way an open one does (#9497).
 */
export function buildVisibleWorktreeOptionsFromState(
  state: ReturnType<typeof useAppStore.getState>,
  repoMap: Map<string, Repo>
): VisibleWorktreeOptions {
  return {
    filterRepoIds: state.filterRepoIds,
    showSleepingWorkspaces: state.showSleepingWorkspaces,
    tabsByWorktree: state.tabsByWorktree,
    ptyIdsByTabId: state.ptyIdsByTabId,
    browserTabsByWorktree: state.browserTabsByWorktree,
    worktreeIdsWithLiveAgent: getWorktreeIdsWithLiveAgent(
      state.agentStatusByPaneKey,
      state.tabsByWorktree,
      Date.now()
    ),
    hideDefaultBranchWorkspace: state.hideDefaultBranchWorkspace,
    hideAutomationGeneratedWorkspaces: state.hideAutomationGeneratedWorkspaces,
    hideCliCreatedWorkspaces: state.hideCliCreatedWorkspaces,
    hideDetachedHeadWorkspaces: state.hideDetachedHeadWorkspaces,
    hideWorkspacesFromOtherDevices: state.hideWorkspacesFromOtherDevices,
    workspaceActivityWindow: state.workspaceActivityWindow,
    hiddenWorkspaceIdentities: state.showHiddenSidebarRows
      ? undefined
      : toHiddenRowSet(state.hiddenWorkspaceIdentities),
    hiddenSidebarProjectIds: state.showHiddenSidebarRows
      ? undefined
      : toHiddenRowSet(state.hiddenSidebarProjectIds),
    activeWorktreeId: getActiveSidebarWorkspaceId(state.activeWorkspaceKey, state.activeWorktreeId),
    pairedDeviceIdsByEnvironment: state.hideWorkspacesFromOtherDevices
      ? getPairedDeviceIdsByEnvironment(
          state.runtimeEnvironments,
          state.runtimeStatusByEnvironmentId
        )
      : EMPTY_PAIRED_DEVICE_IDS_BY_ENVIRONMENT,
    alwaysShowDefaultBranchWorkspace: state.alwaysShowDefaultBranchWorkspace,
    repoMap,
    workspaceHostScope: state.workspaceHostScope,
    visibleWorkspaceHostIds: state.visibleWorkspaceHostIds,
    defaultHostId: getSettingsFocusedExecutionHostId(state.settings),
    worktreeLineageById: state.worktreeLineageById
  }
}
