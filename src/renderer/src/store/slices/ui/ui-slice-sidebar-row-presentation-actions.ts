import type { UISlice, UISliceSet } from './ui-slice-contract'
import { DEFAULT_WORKSPACE_ACTIVITY_WINDOW } from '../../../../../shared/workspace-activity-window'
import { toggleHiddenRowId } from '../../../../../shared/hidden-sidebar-rows'
import { applyWorkspaceBoardMembership } from '../../../../../shared/workspace-board-membership'

/** How sidebar rows are narrowed and grouped: recency window, explicit hides,
 *  and whether the Pinned section splits into board-status lanes. */
export function createSidebarRowPresentationActions(
  set: UISliceSet
): Pick<
  UISlice,
  | 'workspaceActivityWindow'
  | 'setWorkspaceActivityWindow'
  | 'hiddenWorkspaceIdentities'
  | 'setWorkspaceRowHidden'
  | 'hiddenSidebarProjectIds'
  | 'setSidebarProjectHidden'
  | 'showHiddenSidebarRows'
  | 'setShowHiddenSidebarRows'
  | 'pinnedSectionGroupByStatus'
  | 'setPinnedSectionGroupByStatus'
  | 'unhideAllSidebarRows'
  | 'boardExcludedWorkspaceIdentities'
  | 'boardIncludedWorkspaceIdentities'
  | 'setWorkspaceBoardMembership'
  | 'resetWorkspaceBoardMembership'
  | 'tabBoardStatusByTabId'
  | 'setTabBoardStatus'
  | 'boardExpandsWorkspaceTabs'
  | 'setBoardExpandsWorkspaceTabs'
  | 'sidebarPinnedTabIds'
  | 'setTabSidebarPinned'
> {
  return {
    workspaceActivityWindow: DEFAULT_WORKSPACE_ACTIVITY_WINDOW,
    setWorkspaceActivityWindow: (v) => set({ workspaceActivityWindow: v }),
    hiddenWorkspaceIdentities: [],
    setWorkspaceRowHidden: (workspaceIdentity, hidden) =>
      set((s) => {
        const next = toggleHiddenRowId(s.hiddenWorkspaceIdentities, workspaceIdentity, hidden)
        return next === s.hiddenWorkspaceIdentities ? s : { hiddenWorkspaceIdentities: next }
      }),
    hiddenSidebarProjectIds: [],
    setSidebarProjectHidden: (projectId, hidden) =>
      set((s) => {
        const next = toggleHiddenRowId(s.hiddenSidebarProjectIds, projectId, hidden)
        return next === s.hiddenSidebarProjectIds ? s : { hiddenSidebarProjectIds: next }
      }),
    showHiddenSidebarRows: false,
    setShowHiddenSidebarRows: (v) => set({ showHiddenSidebarRows: v }),
    pinnedSectionGroupByStatus: true,
    setPinnedSectionGroupByStatus: (v) => set({ pinnedSectionGroupByStatus: v }),
    boardExcludedWorkspaceIdentities: [],
    boardIncludedWorkspaceIdentities: [],
    setWorkspaceBoardMembership: (workspaceIdentity, membership) =>
      set((s) => {
        const next = applyWorkspaceBoardMembership(
          workspaceIdentity,
          membership,
          s.boardExcludedWorkspaceIdentities,
          s.boardIncludedWorkspaceIdentities
        )
        return {
          boardExcludedWorkspaceIdentities: next.excluded,
          boardIncludedWorkspaceIdentities: next.included
        }
      }),
    resetWorkspaceBoardMembership: () =>
      set({ boardExcludedWorkspaceIdentities: [], boardIncludedWorkspaceIdentities: [] }),
    tabBoardStatusByTabId: {},
    setTabBoardStatus: (tabId, status) =>
      set((s) => {
        if (status === null) {
          if (!Object.hasOwn(s.tabBoardStatusByTabId, tabId)) {
            return s
          }
          const next = { ...s.tabBoardStatusByTabId }
          delete next[tabId]
          return { tabBoardStatusByTabId: next }
        }
        return s.tabBoardStatusByTabId[tabId] === status
          ? s
          : { tabBoardStatusByTabId: { ...s.tabBoardStatusByTabId, [tabId]: status } }
      }),
    boardExpandsWorkspaceTabs: true,
    setBoardExpandsWorkspaceTabs: (v) => set({ boardExpandsWorkspaceTabs: v }),
    sidebarPinnedTabIds: [],
    setTabSidebarPinned: (tabId, pinned) =>
      set((s) => {
        const next = toggleHiddenRowId(s.sidebarPinnedTabIds, tabId, pinned)
        return next === s.sidebarPinnedTabIds ? s : { sidebarPinnedTabIds: next }
      }),
    unhideAllSidebarRows: () =>
      set({
        hiddenWorkspaceIdentities: [],
        hiddenSidebarProjectIds: [],
        showHiddenSidebarRows: false
      })
  }
}
