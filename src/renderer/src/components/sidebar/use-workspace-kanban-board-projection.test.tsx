// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, renderHook } from '@testing-library/react'
import { useAppStore } from '@/store'
import type { Tab } from '../../../../shared/tab-types'
import { tabBoardCardId } from '../../../../shared/workspace-board-tab-cards'
import { getWorktreeHostIdentity } from '../../../../shared/worktree/host-qualified-identity'
import { makeRepo, makeWorktree } from '../worktree-jump-palette-test-fixtures'
import { useWorkspaceKanbanBoardProjection } from './use-workspace-kanban-board-projection'

const initialState = useAppStore.getInitialState()
const statuses = [
  { id: 'todo', label: 'Todo' },
  { id: 'done', label: 'Done' }
]

function makeTab(id: string, worktreeId: string, overrides: Partial<Tab> = {}): Tab {
  return {
    id,
    entityId: id,
    groupId: 'group-1',
    worktreeId,
    contentType: 'terminal',
    label: id,
    customLabel: null,
    color: null,
    sortOrder: 0,
    createdAt: 0,
    ...overrides
  }
}

describe('useWorkspaceKanbanBoardProjection', () => {
  beforeEach(() => {
    useAppStore.setState(initialState, true)
  })
  afterEach(() => {
    cleanup()
    useAppStore.setState(initialState, true)
  })

  function render(worktrees: ReturnType<typeof makeWorktree>[], repo: ReturnType<typeof makeRepo>) {
    return renderHook(() =>
      useWorkspaceKanbanBoardProjection({
        activeWorktreeId: null,
        activeWorkspaceExecutionHostId: null,
        allWorktrees: worktrees,
        open: true,
        repoMap: new Map([[repo.id, repo]]),
        sortBy: 'manual',
        workspaceStatuses: statuses
      })
    )
  }

  it('replaces a multi-tab workspace with one card per tab, each on its own lane', () => {
    const repo = makeRepo()
    const workspace = makeWorktree('multi', 'Multi tab', { workspaceStatus: 'todo' })
    useAppStore.setState({
      worktreesByRepo: { [repo.id]: [workspace] },
      showSleepingWorkspaces: true,
      unifiedTabsByWorktree: {
        [workspace.id]: [
          makeTab('tab-a', workspace.id, { sortOrder: 0 }),
          makeTab('tab-b', workspace.id, { sortOrder: 1 })
        ]
      },
      tabBoardStatusByTabId: { 'tab-b': 'done' }
    })

    const { result } = render([workspace], repo)

    expect(result.current.boardWorktrees.map((card) => card.id)).toEqual([
      tabBoardCardId('tab-a'),
      tabBoardCardId('tab-b')
    ])
    expect(result.current.worktreesByStatus.get('todo')?.map((card) => card.id)).toEqual([
      tabBoardCardId('tab-a')
    ])
    expect(result.current.worktreesByStatus.get('done')?.map((card) => card.id)).toEqual([
      tabBoardCardId('tab-b')
    ])
  })

  it('keeps a single-tab workspace as one card', () => {
    const repo = makeRepo()
    const workspace = makeWorktree('single', 'Single tab', { workspaceStatus: 'todo' })
    useAppStore.setState({
      worktreesByRepo: { [repo.id]: [workspace] },
      showSleepingWorkspaces: true,
      unifiedTabsByWorktree: { [workspace.id]: [makeTab('only', workspace.id)] }
    })

    const { result } = render([workspace], repo)

    expect(result.current.boardWorktrees.map((card) => card.id)).toEqual([workspace.id])
  })

  it('drops a tab card the user removed from the board', () => {
    const repo = makeRepo()
    const workspace = makeWorktree('multi', 'Multi tab', { workspaceStatus: 'todo' })
    const tabs = [makeTab('tab-a', workspace.id), makeTab('tab-b', workspace.id, { sortOrder: 1 })]
    useAppStore.setState({
      worktreesByRepo: { [repo.id]: [workspace] },
      showSleepingWorkspaces: true,
      unifiedTabsByWorktree: { [workspace.id]: tabs },
      boardExcludedWorkspaceIdentities: [
        getWorktreeHostIdentity({ id: tabBoardCardId('tab-a'), hostId: workspace.hostId })
      ]
    })

    const { result } = render([workspace], repo)

    expect(result.current.boardWorktrees.map((card) => card.id)).toEqual([tabBoardCardId('tab-b')])
  })

  it('leaves the board on workspace cards when tab expansion is off', () => {
    const repo = makeRepo()
    const workspace = makeWorktree('multi', 'Multi tab', { workspaceStatus: 'todo' })
    useAppStore.setState({
      worktreesByRepo: { [repo.id]: [workspace] },
      showSleepingWorkspaces: true,
      unifiedTabsByWorktree: {
        [workspace.id]: [makeTab('tab-a', workspace.id), makeTab('tab-b', workspace.id)]
      },
      boardExpandsWorkspaceTabs: false
    })

    const { result } = render([workspace], repo)

    expect(result.current.boardWorktrees.map((card) => card.id)).toEqual([workspace.id])
  })

  it('indexes both the workspace and its tab cards so a sidebar drop can resolve either', () => {
    const repo = makeRepo()
    const workspace = makeWorktree('multi', 'Multi tab', { workspaceStatus: 'todo' })
    useAppStore.setState({
      worktreesByRepo: { [repo.id]: [workspace] },
      showSleepingWorkspaces: true,
      unifiedTabsByWorktree: {
        [workspace.id]: [makeTab('tab-a', workspace.id), makeTab('tab-b', workspace.id)]
      }
    })

    const { result } = render([workspace], repo)

    // Why the workspace id matters: a sidebar row dragged onto a lane is
    // addressed by workspace id, and expansion had removed it from the index.
    expect(result.current.worktreeById.get(workspace.id)?.id).toBe(workspace.id)
    expect(result.current.worktreeById.get(tabBoardCardId('tab-a'))?.id).toBe(
      tabBoardCardId('tab-a')
    )
  })

  it('marks the active tab card rather than a workspace card that is not rendered', () => {
    const repo = makeRepo()
    const workspace = makeWorktree('multi', 'Multi tab', { workspaceStatus: 'todo' })
    useAppStore.setState({
      worktreesByRepo: { [repo.id]: [workspace] },
      showSleepingWorkspaces: true,
      unifiedTabsByWorktree: {
        [workspace.id]: [makeTab('tab-a', workspace.id), makeTab('tab-b', workspace.id)]
      },
      groupsByWorktree: {
        [workspace.id]: [
          { id: 'group-1', worktreeId: workspace.id, activeTabId: 'tab-b', tabOrder: [] }
        ]
      },
      activeGroupIdByWorktree: { [workspace.id]: 'group-1' }
    })

    const { result } = renderHook(() =>
      useWorkspaceKanbanBoardProjection({
        activeWorktreeId: workspace.id,
        activeWorkspaceExecutionHostId: workspace.hostId ?? null,
        allWorktrees: [workspace],
        open: true,
        repoMap: new Map([[repo.id, repo]]),
        sortBy: 'manual',
        workspaceStatuses: statuses
      })
    )

    expect(result.current.activeWorktreeIdentity).toBe(
      getWorktreeHostIdentity({ id: tabBoardCardId('tab-b'), hostId: workspace.hostId })
    )
  })
})
