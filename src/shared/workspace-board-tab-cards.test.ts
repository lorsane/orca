import { describe, expect, it } from 'vitest'
import type { Tab } from './tab-types'
import type { Worktree } from './worktree/types'
import {
  buildSidebarPinnedTabCards,
  expandWorkspaceBoardTabCards,
  getTabBoardCardLabel,
  parseTabBoardCardId,
  tabBoardCardId
} from './workspace-board-tab-cards'

function makeWorktree(overrides: Partial<Worktree> = {}): Worktree {
  return {
    id: 'repo-1::/tmp/wt',
    repoId: 'repo-1',
    path: '/tmp/wt',
    head: 'abc',
    branch: 'refs/heads/main',
    isBare: false,
    isMainWorktree: false,
    displayName: 'workspace',
    comment: '',
    linkedIssue: 7,
    linkedPR: null,
    linkedLinearIssue: 'ENG-1',
    isArchived: false,
    isUnread: true,
    isPinned: true,
    sortOrder: 5,
    lastActivityAt: 1_000,
    workspaceStatus: 'todo',
    linkedWorkItem: { provider: 'linear', type: 'issue', linearIdentifier: 'ENG-1' },
    ...overrides
  } as Worktree
}

function makeTab(overrides: Partial<Tab> = {}): Tab {
  return {
    id: 'tab-1',
    entityId: 'entity-1',
    groupId: 'group-1',
    worktreeId: 'repo-1::/tmp/wt',
    contentType: 'terminal',
    label: 'Terminal 1',
    customLabel: null,
    color: null,
    sortOrder: 0,
    createdAt: 500,
    ...overrides
  }
}

describe('tabBoardCardId', () => {
  it('round-trips a tab id and rejects anything else', () => {
    expect(parseTabBoardCardId(tabBoardCardId('tab-1'))).toBe('tab-1')
    expect(parseTabBoardCardId('repo-1::/tmp/wt')).toBeNull()
    expect(parseTabBoardCardId('folder:abc')).toBeNull()
    expect(parseTabBoardCardId('tab:')).toBeNull()
  })
})

describe('getTabBoardCardLabel', () => {
  it('prefers the user label, then the generated one, then the live title', () => {
    expect(getTabBoardCardLabel(makeTab({ customLabel: 'Ship it' }))).toBe('Ship it')
    expect(getTabBoardCardLabel(makeTab({ generatedLabel: 'Fix login' }))).toBe('Fix login')
    expect(getTabBoardCardLabel(makeTab())).toBe('Terminal 1')
    expect(getTabBoardCardLabel(makeTab({ label: '   ' }))).toBe('terminal')
  })
})

describe('expandWorkspaceBoardTabCards', () => {
  const workspace = makeWorktree()

  it('leaves a workspace with fewer than two tabs alone', () => {
    for (const tabs of [[], [makeTab()]]) {
      expect(
        expandWorkspaceBoardTabCards({
          worktrees: [workspace],
          tabsByWorkspaceId: { [workspace.id]: tabs },
          tabStatusByTabId: {}
        })
      ).toEqual([workspace])
    }
  })

  it('replaces a multi-tab workspace with one card per tab, in tab order', () => {
    const cards = expandWorkspaceBoardTabCards({
      worktrees: [workspace],
      tabsByWorkspaceId: {
        [workspace.id]: [
          makeTab({ id: 'tab-2', sortOrder: 2, label: 'Second' }),
          makeTab({ id: 'tab-1', sortOrder: 1, label: 'First' })
        ]
      },
      tabStatusByTabId: { 'tab-2': 'done' }
    })

    expect(cards.map((card) => card.id)).toEqual([tabBoardCardId('tab-1'), tabBoardCardId('tab-2')])
    expect(cards.map((card) => card.displayName)).toEqual(['First', 'Second'])
    // A tab without its own status inherits the workspace's.
    expect(cards.map((card) => card.workspaceStatus)).toEqual(['todo', 'done'])
    // Pin and unread stay workspace-level facts.
    expect(cards.every((card) => !card.isPinned && !card.isUnread)).toBe(true)
    expect(cards.every((card) => card.repoId === workspace.repoId)).toBe(true)
    // Why: a tab is not the workspace's task. Inherited, moving ONE tab card to
    // Done drove the board task sync and closed the whole workspace's issue.
    expect(cards.every((card) => card.linkedWorkItem === null)).toBe(true)
    expect(cards.every((card) => card.linkedLinearIssue === null)).toBe(true)
    expect(cards.every((card) => card.linkedIssue === null)).toBe(true)
  })

  it('dates a card by its own tab focus, not the workspace', () => {
    const [card] = expandWorkspaceBoardTabCards({
      worktrees: [workspace],
      tabsByWorkspaceId: {
        [workspace.id]: [
          makeTab({ id: 'tab-1', lastFocusedAt: 9_000 }),
          makeTab({ id: 'tab-2', sortOrder: 1 })
        ]
      },
      tabStatusByTabId: {}
    })
    expect(card?.lastActivityAt).toBe(9_000)
  })
})

describe('buildSidebarPinnedTabCards', () => {
  const workspace = makeWorktree()
  const owners = new Map([[workspace.id, workspace]])

  it('returns nothing when no tab is pinned', () => {
    expect(
      buildSidebarPinnedTabCards({
        pinnedTabIds: [],
        tabsByWorkspaceId: { [workspace.id]: [makeTab()] },
        ownerByWorkspaceId: owners,
        tabStatusByTabId: {}
      })
    ).toEqual([])
  })

  it('keeps tab order and carries the tab own board status', () => {
    const cards = buildSidebarPinnedTabCards({
      pinnedTabIds: ['tab-2', 'tab-1'],
      tabsByWorkspaceId: {
        [workspace.id]: [
          makeTab({ id: 'tab-2', sortOrder: 2, label: 'Second' }),
          makeTab({ id: 'tab-1', sortOrder: 1, label: 'First' }),
          makeTab({ id: 'tab-3', sortOrder: 3, label: 'Unpinned' })
        ]
      },
      ownerByWorkspaceId: owners,
      tabStatusByTabId: { 'tab-2': 'done' }
    })
    expect(cards.map((card) => card.displayName)).toEqual(['First', 'Second'])
    expect(cards.map((card) => card.workspaceStatus)).toEqual(['todo', 'done'])
  })

  it('drops a pinned id whose tab or owner is gone', () => {
    expect(
      buildSidebarPinnedTabCards({
        pinnedTabIds: ['ghost'],
        tabsByWorkspaceId: { [workspace.id]: [makeTab()] },
        ownerByWorkspaceId: owners,
        tabStatusByTabId: {}
      })
    ).toEqual([])
    expect(
      buildSidebarPinnedTabCards({
        pinnedTabIds: ['tab-1'],
        tabsByWorkspaceId: { 'other-workspace': [makeTab()] },
        ownerByWorkspaceId: owners,
        tabStatusByTabId: {}
      })
    ).toEqual([])
  })
})
