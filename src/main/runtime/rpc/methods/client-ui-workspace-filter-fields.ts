import { z } from 'zod'
import { WORKSPACE_ACTIVITY_WINDOWS } from '../../../../shared/workspace-activity-window'

export const ClientUiWorkspaceFilterFields = {
  hideDefaultBranchWorkspace: z.boolean().optional(),
  hideAutomationGeneratedWorkspaces: z.boolean().optional(),
  hideCliCreatedWorkspaces: z.boolean().optional(),
  hideDetachedHeadWorkspaces: z.boolean().optional(),
  hideWorkspacesFromOtherDevices: z.boolean().optional(),
  workspaceActivityWindow: z.enum(WORKSPACE_ACTIVITY_WINDOWS).optional(),
  alwaysShowDefaultBranchWorkspace: z.boolean().optional(),
  filterRepoIds: z.array(z.string()).optional()
}
