import { describe, expect, it, vi } from 'vitest'
import type { WorktreeSliceGet } from '../listing/worktree-slice-types'
import { applyTabBoardCardOwnUpdates } from './tab-board-card-meta-write'

function makeGet() {
  const setTabBoardStatus = vi.fn()
  const setTabCustomLabel = vi.fn()
  const get = (() => ({ setTabBoardStatus, setTabCustomLabel })) as unknown as WorktreeSliceGet
  return { get, setTabBoardStatus, setTabCustomLabel }
}

describe('applyTabBoardCardOwnUpdates', () => {
  it('writes the board status to the tab, not the workspace', () => {
    const { get, setTabBoardStatus } = makeGet()
    const owner = applyTabBoardCardOwnUpdates(get, 'tab-1', { workspaceStatus: 'done' })
    expect(setTabBoardStatus).toHaveBeenCalledWith('tab-1', 'done')
    expect(owner).toEqual({})
  })

  it('renames the tab itself', () => {
    // Why: the card shows the tab's name, so routing the rename to the workspace
    // changed something the card never displays and looked like a no-op.
    const { get, setTabCustomLabel } = makeGet()
    applyTabBoardCardOwnUpdates(get, 'tab-1', { displayName: '  Deploy  ' })
    expect(setTabCustomLabel).toHaveBeenCalledWith('tab-1', 'Deploy')
  })

  it('clears the override when the name is blanked', () => {
    const { get, setTabCustomLabel } = makeGet()
    applyTabBoardCardOwnUpdates(get, 'tab-1', { displayName: '   ' })
    expect(setTabCustomLabel).toHaveBeenCalledWith('tab-1', null)
  })

  it('leaves everything else for the owning workspace', () => {
    const { get, setTabBoardStatus, setTabCustomLabel } = makeGet()
    const owner = applyTabBoardCardOwnUpdates(get, 'tab-1', { isPinned: true, comment: 'note' })
    expect(owner).toEqual({ isPinned: true, comment: 'note' })
    expect(setTabBoardStatus).not.toHaveBeenCalled()
    expect(setTabCustomLabel).not.toHaveBeenCalled()
  })
})
