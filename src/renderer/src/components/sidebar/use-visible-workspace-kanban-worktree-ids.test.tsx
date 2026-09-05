// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, renderHook } from '@testing-library/react'
import { useAppStore } from '@/store'
import { getWorktreeHostIdentity } from '../../../../shared/worktree/host-qualified-identity'
import { makeRepo, makeWorktree } from '../worktree-jump-palette-test-fixtures'
import { useVisibleWorkspaceKanbanWorktreeIds } from './use-visible-workspace-kanban-worktree-ids'
import { folderWorkspaceKey } from '../../../../shared/workspace-scope'
import { folderWorkspaceRowIdentity } from '../../../../shared/folder-workspace-worktree'
import type { FolderWorkspace } from '../../../../shared/folder-workspace-types'
import type { ProjectGroup } from '../../../../shared/project-group-types'

function makeProjectGroup(): ProjectGroup {
  return {
    id: 'group-1',
    name: 'monorepo',
    parentPath: '/tmp/monorepo',
    parentGroupId: null,
    createdFrom: 'folder-scan',
    tabOrder: 0,
    isCollapsed: false,
    color: null,
    createdAt: 0,
    updatedAt: 0
  }
}

function makeFolderWorkspace(overrides: Partial<FolderWorkspace> = {}): FolderWorkspace {
  return {
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
    updatedAt: 0,
    ...overrides
  }
}

const initialState = useAppStore.getInitialState()

describe('useVisibleWorkspaceKanbanWorktreeIds', () => {
  beforeEach(() => {
    useAppStore.setState(initialState, true)
  })

  afterEach(() => {
    cleanup()
    useAppStore.setState(initialState, true)
  })

  it('keeps a single-host filter host-qualified when workspace ids collide', () => {
    const local = makeWorktree('shared', 'Local workspace', { hostId: 'local' })
    const ssh = makeWorktree('shared', 'SSH workspace', { hostId: 'ssh:box' })
    const repo = makeRepo()
    useAppStore.setState({
      worktreesByRepo: { [repo.id]: [local, ssh] },
      showSleepingWorkspaces: true,
      visibleWorkspaceHostIds: ['local']
    })

    const { result } = renderHook(() =>
      useVisibleWorkspaceKanbanWorktreeIds({
        allWorktrees: [local, ssh],
        repoMap: new Map([[repo.id, repo]])
      })
    )

    expect(result.current.visibleWorktreeIds).toEqual(new Set([getWorktreeHostIdentity(local)]))
  })

  it('puts folder workspaces on the board with their own status', () => {
    const group = makeProjectGroup()
    const folderWorkspace = makeFolderWorkspace({ workspaceStatus: 'in-progress' })
    useAppStore.setState({
      worktreesByRepo: {},
      projectGroups: [group],
      folderWorkspaces: [folderWorkspace],
      showSleepingWorkspaces: true
    })

    const { result } = renderHook(() =>
      useVisibleWorkspaceKanbanWorktreeIds({ allWorktrees: [], repoMap: new Map() })
    )

    const [card] = result.current.folderBoardWorktrees
    expect(card?.id).toBe(folderWorkspaceKey(folderWorkspace.id))
    expect(card?.workspaceStatus).toBe('in-progress')
    expect(result.current.visibleWorktreeIds.has(getWorktreeHostIdentity(card!))).toBe(true)
  })

  it('drops folder workspaces the activity window excludes', () => {
    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)
    useAppStore.setState({
      worktreesByRepo: {},
      projectGroups: [makeProjectGroup()],
      folderWorkspaces: [
        makeFolderWorkspace({ id: 'fresh', lastActivityAt: startOfToday.getTime() + 60_000 }),
        makeFolderWorkspace({ id: 'stale', lastActivityAt: startOfToday.getTime() - 60_000 })
      ],
      showSleepingWorkspaces: true,
      workspaceActivityWindow: 'today'
    })

    const { result } = renderHook(() =>
      useVisibleWorkspaceKanbanWorktreeIds({ allWorktrees: [], repoMap: new Map() })
    )

    expect(result.current.folderBoardWorktrees.map((card) => card.id)).toEqual([
      folderWorkspaceKey('fresh')
    ])
  })

  it('drops a hidden folder workspace and a hidden project group', () => {
    const group = makeProjectGroup()
    const folderWorkspace = makeFolderWorkspace()
    const hiddenIdentity = folderWorkspaceRowIdentity(folderWorkspace)
    useAppStore.setState({
      worktreesByRepo: {},
      projectGroups: [group],
      folderWorkspaces: [folderWorkspace],
      showSleepingWorkspaces: true,
      hiddenWorkspaceIdentities: [hiddenIdentity]
    })

    const { result, rerender } = renderHook(() =>
      useVisibleWorkspaceKanbanWorktreeIds({ allWorktrees: [], repoMap: new Map() })
    )
    expect(result.current.folderBoardWorktrees).toEqual([])

    useAppStore.setState({ hiddenWorkspaceIdentities: [], hiddenSidebarProjectIds: [group.id] })
    rerender()
    expect(result.current.folderBoardWorktrees).toEqual([])

    useAppStore.setState({ hiddenSidebarProjectIds: [], showHiddenSidebarRows: false })
    rerender()
    expect(result.current.folderBoardWorktrees).toHaveLength(1)
  })

  it('honours per-row board overrides in both directions', () => {
    const repo = makeRepo()
    const shown = makeWorktree('shown', 'On the board')
    const removed = makeWorktree('removed', 'Taken off the board')
    useAppStore.setState({
      worktreesByRepo: { [repo.id]: [shown, removed] },
      showSleepingWorkspaces: true,
      boardExcludedWorkspaceIdentities: [getWorktreeHostIdentity(removed)]
    })

    const { result, rerender } = renderHook(() =>
      useVisibleWorkspaceKanbanWorktreeIds({
        allWorktrees: [shown, removed],
        repoMap: new Map([[repo.id, repo]])
      })
    )
    expect([...result.current.visibleWorktreeIds]).toEqual([getWorktreeHostIdentity(shown)])

    // A sidebar filter that hides everything still cannot beat an explicit include.
    useAppStore.setState({
      boardExcludedWorkspaceIdentities: [],
      boardIncludedWorkspaceIdentities: [getWorktreeHostIdentity(removed)],
      hiddenSidebarProjectIds: [repo.id]
    })
    rerender()
    expect([...result.current.visibleWorktreeIds]).toEqual([getWorktreeHostIdentity(removed)])
  })
})
