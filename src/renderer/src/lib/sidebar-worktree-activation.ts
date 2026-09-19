import {
  activateAndRevealFolderWorkspace,
  activateAndRevealWorktree
} from '@/lib/worktree-activation'
import { parseWorkspaceKey } from '../../../shared/workspace-scope'
import { parseTabBoardCardId } from '../../../shared/workspace-board-tab-cards'
import { toast } from 'sonner'
import { translate } from '@/i18n/i18n'
import type { ExecutionHostId } from '../../../shared/execution-host'

export async function activateWorktreeFromSidebar(
  worktreeId: string,
  executionHostId?: ExecutionHostId
): Promise<void> {
  // Why first, and why it recurses: a pinned tab row addresses one tab, whose
  // owner may itself be a folder workspace. activateAndRevealWorktree below
  // resolves through getKnownWorktreeById, which knows `worktree:` and `folder:`
  // but not `tab:` — so it returned false and the click did nothing at all.
  const tabCardTabId = parseTabBoardCardId(worktreeId)
  if (tabCardTabId) {
    const { useAppStore } = await import('@/store')
    const ownerWorktreeId = useAppStore.getState().getTab(tabCardTabId)?.worktreeId
    if (!ownerWorktreeId) {
      return
    }
    await activateWorktreeFromSidebar(ownerWorktreeId, executionHostId)
    useAppStore.getState().activateTab(tabCardTabId, { worktreeId: ownerWorktreeId })
    return
  }
  const workspaceScope = parseWorkspaceKey(worktreeId)
  if (workspaceScope?.type === 'folder') {
    if (executionHostId) {
      activateAndRevealFolderWorkspace(workspaceScope.folderWorkspaceId, {
        executionHostId
      })
    } else {
      activateAndRevealFolderWorkspace(workspaceScope.folderWorkspaceId)
    }
    return
  }
  // Keep navigation independent from an optional runtime wake IPC.
  activateAndRevealWorktree(worktreeId, {
    revealInSidebar: false,
    ...(executionHostId ? { executionHostId } : {})
  })

  if (typeof window !== 'undefined' && window.api?.ephemeralVm?.resumeWorkspace) {
    try {
      const runtime = await window.api.ephemeralVm.resumeWorkspace({ workspaceId: worktreeId })
      if (runtime?.runtimeEnvironmentId) {
        const store = (await import('@/store')).useAppStore
        store.getState().setRuntimeEnvironments(await window.api.runtimeEnvironments.list())
        await store.getState().refreshRuntimeEnvironmentStatus(runtime.runtimeEnvironmentId)
      }
    } catch (error) {
      toast.error(
        translate(
          'auto.lib.sidebarWorktreeActivation.wakeEphemeralVmFailed',
          'Failed to wake ephemeral VM workspace'
        ),
        {
          description: error instanceof Error ? error.message : String(error)
        }
      )
    }
  }
}
