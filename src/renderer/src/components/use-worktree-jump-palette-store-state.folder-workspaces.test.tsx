// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, renderHook } from '@testing-library/react'
import { useAppStore } from '@/store'
import type { FolderWorkspace } from '../../../shared/folder-workspace-types'
import { folderWorkspaceKey } from '../../../shared/workspace-scope'
import { makeRepo, makeWorktree } from './worktree-jump-palette-test-fixtures'
import { useWorktreeJumpPaletteStoreState } from './use-worktree-jump-palette-store-state'

const initialState = useAppStore.getInitialState()

const folderWorkspace = {
  id: 'fw-1',
  projectGroupId: 'group-1',
  name: 'research',
  folderPath: '/tmp/monorepo/research',
  linkedTask: null,
  comment: '',
  isArchived: false,
  isUnread: false,
  isPinned: false,
  sortOrder: 0,
  workspaceStatus: 'todo',
  lastActivityAt: 0,
  createdAt: 0,
  updatedAt: 0
} as FolderWorkspace

/**
 * The palette resolves everything — filters, search, host scope, activation —
 * from this one list. useAllWorktrees is git-only, so a folder workspace was
 * unreachable by Cmd+J entirely.
 */
describe('useWorktreeJumpPaletteStoreState folder workspaces', () => {
  beforeEach(() => {
    useAppStore.setState(initialState, true)
  })
  afterEach(() => {
    cleanup()
    useAppStore.setState(initialState, true)
  })

  const render = () =>
    renderHook(() => useWorktreeJumpPaletteStoreState({ visible: true, lingering: false }))

  it('offers folder workspaces alongside git worktrees', () => {
    const repo = makeRepo()
    const worktree = makeWorktree('wt-1', 'Feature')
    useAppStore.setState({
      repos: [repo],
      worktreesByRepo: { [repo.id]: [worktree] },
      folderWorkspaces: [folderWorkspace]
    })

    const ids = render().result.current.allWorktrees.map((candidate) => candidate.id)
    expect(ids).toContain(worktree.id)
    expect(ids).toContain(folderWorkspaceKey('fw-1'))
  })

  it('projects the folder workspace under its own name and path', () => {
    useAppStore.setState({ folderWorkspaces: [folderWorkspace] })

    const card = render().result.current.allWorktrees.find(
      (candidate) => candidate.id === folderWorkspaceKey('fw-1')
    )
    expect(card?.displayName).toBe('research')
    expect(card?.path).toBe('/tmp/monorepo/research')
  })

  it('reuses the git-only list untouched when there are no folder workspaces', () => {
    const repo = makeRepo()
    useAppStore.setState({
      repos: [repo],
      worktreesByRepo: { [repo.id]: [makeWorktree('wt-1', 'Feature')] },
      folderWorkspaces: []
    })
    expect(render().result.current.allWorktrees).toHaveLength(1)
  })
})
