import {
  DEFAULT_WORKSPACE_ACTIVITY_WINDOW,
  normalizeWorkspaceActivityWindow
} from './workspace-activity-window'
import type { PersistedUIState } from './persisted-ui-state-types'

/** Defaults for how sidebar rows are narrowed and grouped: recency, explicit
 *  hides, and whether the Pinned section splits into board-status lanes. */
export type SidebarRowPresentationState = Pick<
  PersistedUIState,
  | 'workspaceActivityWindow'
  | 'hiddenWorkspaceIdentities'
  | 'hiddenSidebarProjectIds'
  | 'showHiddenSidebarRows'
  | 'pinnedSectionGroupByStatus'
>

export function createDefaultSidebarRowPresentationState(): Pick<
  PersistedUIState,
  | 'workspaceActivityWindow'
  | 'hiddenWorkspaceIdentities'
  | 'hiddenSidebarProjectIds'
  | 'showHiddenSidebarRows'
  | 'pinnedSectionGroupByStatus'
> {
  return {
    workspaceActivityWindow: DEFAULT_WORKSPACE_ACTIVITY_WINDOW,
    hiddenWorkspaceIdentities: [],
    hiddenSidebarProjectIds: [],
    showHiddenSidebarRows: false,
    pinnedSectionGroupByStatus: true
  }
}

/** Reads the same group back off a persisted mirror, degrading unknown values. */
export function hydrateSidebarRowPresentationState(
  ui: Partial<PersistedUIState>
): Required<SidebarRowPresentationState> {
  return {
    workspaceActivityWindow: normalizeWorkspaceActivityWindow(ui.workspaceActivityWindow),
    hiddenWorkspaceIdentities: [...(ui.hiddenWorkspaceIdentities ?? [])],
    hiddenSidebarProjectIds: [...(ui.hiddenSidebarProjectIds ?? [])],
    showHiddenSidebarRows: ui.showHiddenSidebarRows === true,
    pinnedSectionGroupByStatus: ui.pinnedSectionGroupByStatus !== false
  }
}
