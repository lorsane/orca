import {
  DEFAULT_WORKSPACE_ACTIVITY_WINDOW,
  normalizeWorkspaceActivityWindow
} from './workspace-activity-window'
import type { PersistedUIState } from './persisted-ui-state-types'

/** Defaults for how workspace rows are narrowed, grouped and routed to the
 *  board: recency, explicit hides, pinned lanes, and per-row board overrides. */
export type WorkspaceRowPresentationState = Pick<
  PersistedUIState,
  | 'workspaceActivityWindow'
  | 'hiddenWorkspaceIdentities'
  | 'hiddenSidebarProjectIds'
  | 'showHiddenSidebarRows'
  | 'pinnedSectionGroupByStatus'
  | 'boardExcludedWorkspaceIdentities'
  | 'boardIncludedWorkspaceIdentities'
>

export function createDefaultWorkspaceRowPresentationState(): Pick<
  PersistedUIState,
  | 'workspaceActivityWindow'
  | 'hiddenWorkspaceIdentities'
  | 'hiddenSidebarProjectIds'
  | 'showHiddenSidebarRows'
  | 'pinnedSectionGroupByStatus'
  | 'boardExcludedWorkspaceIdentities'
  | 'boardIncludedWorkspaceIdentities'
> {
  return {
    workspaceActivityWindow: DEFAULT_WORKSPACE_ACTIVITY_WINDOW,
    hiddenWorkspaceIdentities: [],
    hiddenSidebarProjectIds: [],
    showHiddenSidebarRows: false,
    pinnedSectionGroupByStatus: true,
    boardExcludedWorkspaceIdentities: [],
    boardIncludedWorkspaceIdentities: []
  }
}

/** Reads the same group back off a persisted mirror, degrading unknown values. */
export function hydrateWorkspaceRowPresentationState(
  ui: Partial<PersistedUIState>
): Required<WorkspaceRowPresentationState> {
  return {
    workspaceActivityWindow: normalizeWorkspaceActivityWindow(ui.workspaceActivityWindow),
    hiddenWorkspaceIdentities: [...(ui.hiddenWorkspaceIdentities ?? [])],
    hiddenSidebarProjectIds: [...(ui.hiddenSidebarProjectIds ?? [])],
    showHiddenSidebarRows: ui.showHiddenSidebarRows === true,
    pinnedSectionGroupByStatus: ui.pinnedSectionGroupByStatus !== false,
    boardExcludedWorkspaceIdentities: [...(ui.boardExcludedWorkspaceIdentities ?? [])],
    boardIncludedWorkspaceIdentities: [...(ui.boardIncludedWorkspaceIdentities ?? [])]
  }
}
