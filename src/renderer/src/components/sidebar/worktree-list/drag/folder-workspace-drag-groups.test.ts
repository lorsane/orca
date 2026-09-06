import { describe, expect, it } from 'vitest'
import type { HostSectionRow } from '../../host-section-rows'
import { getWorktreeDragGroups, getWorktreeDragIndexes } from './groups'

/**
 * A folder-workspace row is the only workspace row without a sectionKey of its
 * own, so it used to be skipped when the drag groups were built. Without a
 * source group, use-pointer-drag refuses to start the drag — which is why a
 * pinned folder workspace could not be dragged onto the workspace board.
 */
const folderRow = (id: string): HostSectionRow =>
  ({
    type: 'folder-workspace',
    key: `folder-workspace:${id}`,
    folderWorkspace: { id },
    projectGroup: { id: 'group-1' },
    depth: 0,
    groupDepth: 0
  }) as unknown as HostSectionRow

const headerRow = (key: string): HostSectionRow =>
  ({ type: 'header', key, label: key, count: 1, tone: '' }) as unknown as HostSectionRow

describe('folder workspaces in the sidebar drag model', () => {
  it('joins the drag group of the section it was emitted under', () => {
    const groups = getWorktreeDragGroups([headerRow('pinned:todo'), folderRow('fw-1')])
    expect(groups).toEqual([{ key: 'pinned:todo', worktreeIds: ['folder:fw-1'] }])
  })

  it('gets a source group key, which is what lets the drag start at all', () => {
    const { groupKeyByRowKey, groupIndexByRowKey } = getWorktreeDragIndexes([
      headerRow('pinned:todo'),
      folderRow('fw-1'),
      folderRow('fw-2')
    ])
    expect(groupKeyByRowKey.get('folder:fw-1')).toBe('pinned:todo')
    expect(groupIndexByRowKey.get('folder:fw-1')).toBe(0)
    expect(groupIndexByRowKey.get('folder:fw-2')).toBe(1)
  })

  it('ignores a folder row that precedes any section header', () => {
    const { groupKeyByRowKey } = getWorktreeDragIndexes([folderRow('orphan')])
    expect(groupKeyByRowKey.has('folder:orphan')).toBe(false)
  })
})

const itemRow = (id: string, sectionKey: string): HostSectionRow =>
  ({
    type: 'item',
    rowKey: `${sectionKey}:${id}`,
    sectionKey,
    worktree: { id },
    repo: undefined,
    depth: 0,
    groupDepth: 0,
    lineageTrail: [],
    isLastLineageChild: false,
    lineageChildCount: 0
  }) as unknown as HostSectionRow

describe('pinned status lanes in the sidebar drag model', () => {
  // Why: lane headers carry `pinned:<status>` while their rows keep the single
  // `pinned` sectionKey. Keying the index off sectionKey handed the drag a
  // source group no group had, so reordering inside Pinned did nothing.
  it('keys a pinned row by its lane header, matching the drag groups', () => {
    const rows = [
      headerRow('pinned:todo'),
      itemRow('wt-1', 'pinned'),
      folderRow('fw-1'),
      headerRow('pinned:done'),
      itemRow('wt-2', 'pinned')
    ]
    const { groupKeyByRowKey } = getWorktreeDragIndexes(rows)
    const groups = getWorktreeDragGroups(rows)

    expect(groupKeyByRowKey.get('pinned:wt-1')).toBe('pinned:todo')
    expect(groupKeyByRowKey.get('pinned:wt-2')).toBe('pinned:done')
    for (const [, key] of groupKeyByRowKey) {
      expect(groups.some((group) => group.key === key)).toBe(true)
    }
  })

  it('shares one index counter between folder and worktree rows in a lane', () => {
    const { groupIndexByRowKey } = getWorktreeDragIndexes([
      headerRow('pinned:todo'),
      itemRow('wt-1', 'pinned'),
      folderRow('fw-1'),
      itemRow('wt-2', 'pinned')
    ])
    expect([
      groupIndexByRowKey.get('pinned:wt-1'),
      groupIndexByRowKey.get('folder:fw-1'),
      groupIndexByRowKey.get('pinned:wt-2')
    ]).toEqual([0, 1, 2])
  })
})
