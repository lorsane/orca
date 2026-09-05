import {
  DEFAULT_WORKSPACE_ACTIVITY_WINDOW,
  normalizeWorkspaceActivityWindow
} from './workspace-activity-window'
import type { PersistedUIState } from './persisted-ui-state-types'

/** Defaults for the sidebar's row-visibility preferences: which rows the user
 *  narrowed away by recency, and which they hid outright. */
export type SidebarRowVisibilityState = Pick<
  PersistedUIState,
  | 'workspaceActivityWindow'
  | 'hiddenWorkspaceIdentities'
  | 'hiddenSidebarProjectIds'
  | 'showHiddenSidebarRows'
>

export function createDefaultSidebarRowVisibilityState(): Pick<
  PersistedUIState,
  | 'workspaceActivityWindow'
  | 'hiddenWorkspaceIdentities'
  | 'hiddenSidebarProjectIds'
  | 'showHiddenSidebarRows'
> {
  return {
    workspaceActivityWindow: DEFAULT_WORKSPACE_ACTIVITY_WINDOW,
    hiddenWorkspaceIdentities: [],
    hiddenSidebarProjectIds: [],
    showHiddenSidebarRows: false
  }
}

/** Reads the same group back off a persisted mirror, degrading unknown values. */
export function hydrateSidebarRowVisibilityState(
  ui: Partial<PersistedUIState>
): Required<SidebarRowVisibilityState> {
  return {
    workspaceActivityWindow: normalizeWorkspaceActivityWindow(ui.workspaceActivityWindow),
    hiddenWorkspaceIdentities: [...(ui.hiddenWorkspaceIdentities ?? [])],
    hiddenSidebarProjectIds: [...(ui.hiddenSidebarProjectIds ?? [])],
    showHiddenSidebarRows: ui.showHiddenSidebarRows === true
  }
}
