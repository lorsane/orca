import { describe, expect, it } from 'vitest'
import type { ProjectGroup } from './project-group-types'
import {
  expandHiddenSidebarProjectIds,
  hasHiddenSidebarRows,
  isHiddenProjectGroupId,
  toggleHiddenRowId,
  toHiddenRowSet
} from './hidden-sidebar-rows'

function makeGroup(id: string, parentGroupId: string | null): ProjectGroup {
  return {
    id,
    name: id,
    parentPath: `/tmp/${id}`,
    parentGroupId,
    createdFrom: 'folder-scan',
    tabOrder: 0,
    isCollapsed: false,
    color: null,
    createdAt: 0,
    updatedAt: 0
  }
}

describe('toHiddenRowSet', () => {
  it('shares one empty set so an untouched sidebar allocates nothing', () => {
    expect(toHiddenRowSet(undefined)).toBe(toHiddenRowSet([]))
  })
})

describe('toggleHiddenRowId', () => {
  it('returns the same array when the id is already in the wanted state', () => {
    const ids = ['a']
    expect(toggleHiddenRowId(ids, 'a', true)).toBe(ids)
    expect(toggleHiddenRowId(ids, 'b', false)).toBe(ids)
  })

  it('adds and removes without touching the rest', () => {
    expect(toggleHiddenRowId(['a'], 'b', true)).toEqual(['a', 'b'])
    expect(toggleHiddenRowId(['a', 'b'], 'a', false)).toEqual(['b'])
  })
})

describe('isHiddenProjectGroupId', () => {
  const groups = new Map([
    ['root', makeGroup('root', null)],
    ['child', makeGroup('child', 'root')],
    ['grandchild', makeGroup('grandchild', 'child')]
  ])

  it('hides a group through a hidden ancestor', () => {
    const hidden = new Set(['root'])
    expect(isHiddenProjectGroupId('grandchild', hidden, groups)).toBe(true)
    expect(isHiddenProjectGroupId('root', hidden, groups)).toBe(true)
  })

  it('leaves unrelated branches alone', () => {
    expect(isHiddenProjectGroupId('child', new Set(['grandchild']), groups)).toBe(false)
    expect(isHiddenProjectGroupId(null, new Set(['root']), groups)).toBe(false)
  })

  it('terminates on a parent cycle', () => {
    const cyclic = new Map([
      ['a', makeGroup('a', 'b')],
      ['b', makeGroup('b', 'a')]
    ])
    expect(isHiddenProjectGroupId('a', new Set(['c']), cyclic)).toBe(false)
  })
})

describe('hasHiddenSidebarRows', () => {
  it('is true when either list has an entry', () => {
    expect(hasHiddenSidebarRows([], [])).toBe(false)
    expect(hasHiddenSidebarRows(['w'], [])).toBe(true)
    expect(hasHiddenSidebarRows([], ['p'])).toBe(true)
  })
})

describe('expandHiddenSidebarProjectIds', () => {
  const groups = [makeGroup('root', null), makeGroup('child', 'root')]
  const repos = [
    { id: 'repo-in-root', projectGroupId: 'root' },
    { id: 'repo-in-child', projectGroupId: 'child' },
    { id: 'repo-loose', projectGroupId: null }
  ]

  it('adds the repos a hidden group contains, including nested ones', () => {
    // Why it matters: the section emitter re-appends a repo whose group it
    // cannot find, so hiding a group without its repos flattened it instead.
    const expanded = expandHiddenSidebarProjectIds({
      hiddenSidebarProjectIds: ['root'],
      repos,
      projectGroups: groups
    })
    expect(new Set(expanded)).toEqual(new Set(['root', 'repo-in-root', 'repo-in-child']))
  })

  it('leaves repos outside the hidden group alone, and short-circuits when nothing is hidden', () => {
    expect(
      expandHiddenSidebarProjectIds({ hiddenSidebarProjectIds: [], repos, projectGroups: groups })
    ).toEqual([])
    const expanded = expandHiddenSidebarProjectIds({
      hiddenSidebarProjectIds: ['child'],
      repos,
      projectGroups: groups
    })
    expect(expanded).not.toContain('repo-in-root')
    expect(expanded).not.toContain('repo-loose')
  })
})
