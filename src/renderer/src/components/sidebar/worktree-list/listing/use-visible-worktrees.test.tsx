// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, renderHook } from '@testing-library/react'
import { useAppStore } from '@/store'
import { LOCAL_EXECUTION_HOST_ID } from '../../../../../../shared/execution-host'
import { getWorktreeHostIdentity } from '../../../../../../shared/worktree/host-qualified-identity'
import { makeRepo, makeWorktree } from '../../../worktree-jump-palette-test-fixtures'
import { useVisibleSidebarWorktrees } from './use-visible-worktrees'
import type { SidebarWorktreeFilters } from './use-filters'
import type * as visibleWorktreesModule from '../../visible-worktrees'

const computeVisibleWorktreesCalls = { count: 0 }
vi.mock('../../visible-worktrees', async (importOriginal) => {
  const actual = await importOriginal<typeof visibleWorktreesModule>()
  return {
    ...actual,
    computeVisibleWorktrees: (
      ...args: Parameters<typeof actual.computeVisibleWorktrees>
    ): ReturnType<typeof actual.computeVisibleWorktrees> => {
      computeVisibleWorktreesCalls.count += 1
      return actual.computeVisibleWorktrees(...args)
    }
  }
})

const BASE_FILTER_STATE: SidebarWorktreeFilters['filterState'] = {
  showSleepingWorkspaces: true,
  filterRepoIds: [],
  hideDefaultBranchWorkspace: false,
  hideAutomationGeneratedWorkspaces: false,
  hideCliCreatedWorkspaces: false,
  hideDetachedHeadWorkspaces: false,
  hideWorkspacesFromOtherDevices: false,
  alwaysShowDefaultBranchWorkspace: true,
  visibleWorkspaceHostIds: null,
  workspaceHostScope: 'all',
  workspaceActivityWindow: 'all',
  hiddenWorkspaceIdentities: [],
  hiddenSidebarProjectIds: [],
  showHiddenSidebarRows: false
}

const initialState = useAppStore.getInitialState()

describe('useVisibleSidebarWorktrees', () => {
  beforeEach(() => {
    useAppStore.setState(initialState, true)
  })

  afterEach(() => {
    cleanup()
    useAppStore.setState(initialState, true)
  })

  it('projects both host rows through the primary sidebar pipeline', () => {
    const local = makeWorktree('shared', 'Local workspace', { hostId: 'local' })
    const ssh = makeWorktree('shared', 'SSH workspace', { hostId: 'ssh:box' })
    const repo = makeRepo()
    useAppStore.setState({ worktreesByRepo: { [repo.id]: [local, ssh] } })

    const { result } = renderHook(() =>
      useVisibleSidebarWorktrees({
        filterState: { ...BASE_FILTER_STATE },
        sortBy: 'recent',
        sortedIds: [local.id, ssh.id],
        repoMap: new Map([[repo.id, repo]]),
        worktreeLineageById: {},
        defaultHostId: LOCAL_EXECUTION_HOST_ID,
        agentSendTargetWorktreeId: null
      })
    )

    expect(result.current.visibleWorktrees.map(getWorktreeHostIdentity)).toEqual([
      getWorktreeHostIdentity(local),
      getWorktreeHostIdentity(ssh)
    ])
  })

  it('does not expand one host-filtered collision into both rows', () => {
    const local = makeWorktree('shared', 'Local workspace', { hostId: 'local' })
    const ssh = makeWorktree('shared', 'SSH workspace', { hostId: 'ssh:box' })
    const repo = makeRepo()
    useAppStore.setState({ worktreesByRepo: { [repo.id]: [local, ssh] } })

    const { result } = renderHook(() =>
      useVisibleSidebarWorktrees({
        filterState: { ...BASE_FILTER_STATE, visibleWorkspaceHostIds: ['ssh:box'] },
        sortBy: 'recent',
        sortedIds: [local.id, ssh.id],
        repoMap: new Map([[repo.id, repo]]),
        worktreeLineageById: {},
        defaultHostId: LOCAL_EXECUTION_HOST_ID,
        agentSendTargetWorktreeId: null
      })
    )

    expect(result.current.visibleWorktrees.map(getWorktreeHostIdentity)).toEqual([
      getWorktreeHostIdentity(ssh)
    ])
  })
  it('does not rescan every worktree when a settings write leaves the focused host unchanged', () => {
    const repo = makeRepo()
    const worktree = makeWorktree('alpha', 'Alpha workspace', { hostId: 'local' })
    useAppStore.setState({ worktreesByRepo: { [repo.id]: [worktree] } })

    const baseArgs = {
      filterState: { ...BASE_FILTER_STATE },
      sortBy: 'recent',
      sortedIds: [worktree.id],
      repoMap: new Map([[repo.id, repo]]),
      worktreeLineageById: {},
      defaultHostId: LOCAL_EXECUTION_HOST_ID,
      agentSendTargetWorktreeId: null
    } as Parameters<typeof useVisibleSidebarWorktrees>[0]
    // Why the extra `settings`: it is the pre-fix memo key. Passing it keeps
    // this test red against the old hook, which re-keyed the whole scan on the
    // settings object identity.
    const withSettings = (
      settings: ReturnType<typeof useAppStore.getState>['settings']
    ): Parameters<typeof useVisibleSidebarWorktrees>[0] => Object.assign({}, baseArgs, { settings })

    computeVisibleWorktreesCalls.count = 0
    const { result, rerender } = renderHook(
      (args: Parameters<typeof useVisibleSidebarWorktrees>[0]) => useVisibleSidebarWorktrees(args),
      { initialProps: withSettings(useAppStore.getState().settings) }
    )
    const initialVisible = result.current.visibleWorktrees
    const callsAfterFirstRender = computeVisibleWorktreesCalls.count
    expect(callsAfterFirstRender).toBe(1)

    // A settings write that does not move the focused execution host.
    const nextSettings = {
      ...useAppStore.getState().settings,
      sidebarWidth: 321
    } as ReturnType<typeof useAppStore.getState>['settings']
    useAppStore.setState({ settings: nextSettings })
    rerender(withSettings(nextSettings))

    expect(computeVisibleWorktreesCalls.count).toBe(callsAfterFirstRender)
    expect(result.current.visibleWorktrees).toBe(initialVisible)

    // A write that does move it still recomputes.
    rerender(Object.assign({}, withSettings(nextSettings), { defaultHostId: 'runtime:other' }))
    expect(computeVisibleWorktreesCalls.count).toBe(callsAfterFirstRender + 1)
  })

  it('narrows to the activity window and keeps the focused workspace visible', () => {
    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)
    const fresh = makeWorktree('fresh', 'Touched today', {
      lastActivityAt: startOfToday.getTime() + 60_000
    })
    const stale = makeWorktree('stale', 'Touched last week', {
      lastActivityAt: startOfToday.getTime() - 7 * 24 * 60 * 60 * 1000
    })
    const staleButFocused = makeWorktree('focused', 'Open but idle', {
      lastActivityAt: startOfToday.getTime() - 7 * 24 * 60 * 60 * 1000
    })
    const repo = makeRepo()
    useAppStore.setState({
      worktreesByRepo: { [repo.id]: [fresh, stale, staleButFocused] },
      // Why: activation does not bump lastActivityAt, so the focused row would
      // otherwise vanish out from under the user.
      activeWorktreeId: staleButFocused.id
    })

    const { result } = renderHook(() =>
      useVisibleSidebarWorktrees({
        filterState: {
          ...BASE_FILTER_STATE,
          workspaceActivityWindow: 'today'
        },
        sortBy: 'recent',
        sortedIds: [fresh.id, stale.id, staleButFocused.id],
        repoMap: new Map([[repo.id, repo]]),
        worktreeLineageById: {},
        defaultHostId: LOCAL_EXECUTION_HOST_ID,
        agentSendTargetWorktreeId: null
      })
    )

    expect(result.current.visibleWorktrees.map((worktree) => worktree.id)).toEqual([
      fresh.id,
      staleButFocused.id
    ])
  })

  it('drops hidden rows and hidden projects, and reveals them on demand', () => {
    const repo = makeRepo()
    const kept = makeWorktree('kept', 'Kept workspace')
    const hidden = makeWorktree('hidden', 'Hidden workspace')
    useAppStore.setState({ worktreesByRepo: { [repo.id]: [kept, hidden] } })

    const render = (filterState: SidebarWorktreeFilters['filterState']) =>
      renderHook(() =>
        useVisibleSidebarWorktrees({
          filterState,
          sortBy: 'recent',
          sortedIds: [kept.id, hidden.id],
          repoMap: new Map([[repo.id, repo]]),
          worktreeLineageById: {},
          defaultHostId: LOCAL_EXECUTION_HOST_ID,
          agentSendTargetWorktreeId: null
        })
      )

    const hiddenState: SidebarWorktreeFilters['filterState'] = {
      ...BASE_FILTER_STATE,
      hiddenWorkspaceIdentities: [getWorktreeHostIdentity(hidden)]
    }
    expect(render(hiddenState).result.current.visibleWorktrees.map((w) => w.id)).toEqual([kept.id])

    // Why: revealing must not clear the hide list — that is the only way back
    // to a row whose "Unhide" lives in its own context menu.
    expect(
      render({ ...hiddenState, showHiddenSidebarRows: true }).result.current.visibleWorktrees.map(
        (w) => w.id
      )
    ).toEqual([kept.id, hidden.id])

    expect(
      render({
        ...BASE_FILTER_STATE,
        hiddenSidebarProjectIds: [repo.id]
      }).result.current.visibleWorktrees
    ).toEqual([])
  })

  it('keeps an explicitly hidden parent hidden, despite lineage ancestor injection', () => {
    const repo = makeRepo()
    const parent = makeWorktree('parent', 'Parent workspace')
    const child = makeWorktree('child', 'Child workspace')
    useAppStore.setState({ worktreesByRepo: { [repo.id]: [parent, child] } })

    const { result } = renderHook(() =>
      useVisibleSidebarWorktrees({
        filterState: {
          ...BASE_FILTER_STATE,
          hiddenWorkspaceIdentities: [getWorktreeHostIdentity(parent)]
        },
        sortBy: 'recent',
        sortedIds: [parent.id, child.id],
        repoMap: new Map([[repo.id, repo]]),
        // Why lineage: ancestor injection bypasses the KIND filters so a child
        // never orphans, and it used to undo an explicit per-row hide too.
        worktreeLineageById: { [child.id]: { parentWorktreeId: parent.id } as never },
        defaultHostId: LOCAL_EXECUTION_HOST_ID,
        agentSendTargetWorktreeId: null
      })
    )

    expect(result.current.visibleWorktrees.map((w) => w.id)).toEqual([child.id])
  })
})
