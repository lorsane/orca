import { describe, expect, it } from 'vitest'
import type { FolderWorkspace } from '../../../../shared/folder-workspace-types'
import type { Worktree } from '../../../../shared/worktree/types'
import { folderWorkspaceKey } from '../../../../shared/workspace-scope'
import { buildStatusMutationWorktreeMap } from './status-mutation-worktree-map'

const worktree = { id: 'repo-1::/tmp/wt', repoId: 'repo-1' } as Worktree

const folderWorkspace = {
  id: 'fw-1',
  projectGroupId: 'group-1',
  name: 'research',
  folderPath: '/tmp/research',
  linkedTask: null,
  comment: '',
  isArchived: false,
  isUnread: false,
  isPinned: true,
  sortOrder: 0,
  workspaceStatus: 'todo',
  lastActivityAt: 0,
  createdAt: 0,
  updatedAt: 0
} as FolderWorkspace

describe('buildStatusMutationWorktreeMap', () => {
  it('resolves a folder workspace by its workspace key', () => {
    // Why it matters: every sidebar status mutation looks the dragged id up
    // here, and a miss returns silently — the drop appears to do nothing.
    const map = buildStatusMutationWorktreeMap(new Map([[worktree.id, worktree]]), [
      folderWorkspace
    ])
    expect(map.get(folderWorkspaceKey('fw-1'))?.displayName).toBe('research')
    expect(map.get(folderWorkspaceKey('fw-1'))?.workspaceStatus).toBe('todo')
  })

  it('keeps the git worktrees it was given', () => {
    const map = buildStatusMutationWorktreeMap(new Map([[worktree.id, worktree]]), [
      folderWorkspace
    ])
    expect(map.get(worktree.id)).toBe(worktree)
  })

  it('does not mutate the source map', () => {
    const source = new Map([[worktree.id, worktree]])
    buildStatusMutationWorktreeMap(source, [folderWorkspace])
    expect(source.size).toBe(1)
  })
})
