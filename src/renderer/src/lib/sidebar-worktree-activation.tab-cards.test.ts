import { beforeEach, describe, expect, it, vi } from 'vitest'

const activateAndRevealWorktree = vi.fn()
const activateAndRevealFolderWorkspace = vi.fn()
const activateTab = vi.fn()
const getTab = vi.fn()

vi.mock('@/lib/worktree-activation', () => ({
  activateAndRevealWorktree: (...args: unknown[]) => activateAndRevealWorktree(...args),
  activateAndRevealFolderWorkspace: (...args: unknown[]) =>
    activateAndRevealFolderWorkspace(...args)
}))
vi.mock('@/store', () => ({
  useAppStore: { getState: () => ({ getTab, activateTab }) }
}))
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }))
vi.mock('@/i18n/i18n', () => ({ translate: (_key: string, fallback: string) => fallback }))

import { activateWorktreeFromSidebar } from './sidebar-worktree-activation'

/**
 * A pinned tab row addresses one tab. activateAndRevealWorktree resolves through
 * getKnownWorktreeById, which knows `worktree:` and `folder:` but not `tab:` —
 * so clicking such a row used to do nothing at all.
 */
describe('activateWorktreeFromSidebar for a pinned tab card', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('activates the owning worktree and then focuses the tab', async () => {
    getTab.mockReturnValue({ worktreeId: 'repo-1::/tmp/wt' })

    await activateWorktreeFromSidebar('tab:tab-1', 'local')

    expect(activateAndRevealWorktree).toHaveBeenCalledWith(
      'repo-1::/tmp/wt',
      expect.objectContaining({ executionHostId: 'local' })
    )
    expect(activateTab).toHaveBeenCalledWith('tab-1', { worktreeId: 'repo-1::/tmp/wt' })
  })

  it('routes a tab that lives in a folder workspace through the folder path', async () => {
    getTab.mockReturnValue({ worktreeId: 'folder:fw-1' })

    await activateWorktreeFromSidebar('tab:tab-2')

    expect(activateAndRevealFolderWorkspace).toHaveBeenCalledWith('fw-1')
    expect(activateAndRevealWorktree).not.toHaveBeenCalled()
    expect(activateTab).toHaveBeenCalledWith('tab-2', { worktreeId: 'folder:fw-1' })
  })

  it('does nothing when the tab is gone', async () => {
    getTab.mockReturnValue(undefined)

    await activateWorktreeFromSidebar('tab:missing')

    expect(activateAndRevealWorktree).not.toHaveBeenCalled()
    expect(activateTab).not.toHaveBeenCalled()
  })
})
