import { describe, expect, it } from 'vitest'
import {
  applyWorkspaceBoardMembership,
  getWorkspaceBoardMembership,
  isWorkspaceOnBoard
} from './workspace-board-membership'

describe('getWorkspaceBoardMembership', () => {
  it('reads excluded before included so the lists cannot both win', () => {
    expect(getWorkspaceBoardMembership('a', ['a'], ['a'])).toBe('excluded')
    expect(getWorkspaceBoardMembership('a', [], ['a'])).toBe('included')
    expect(getWorkspaceBoardMembership('a', [], [])).toBe('auto')
  })
})

describe('applyWorkspaceBoardMembership', () => {
  it('moves a row between the lists without leaving it in both', () => {
    expect(applyWorkspaceBoardMembership('a', 'excluded', [], ['a'])).toEqual({
      excluded: ['a'],
      included: []
    })
    expect(applyWorkspaceBoardMembership('a', 'included', ['a'], [])).toEqual({
      excluded: [],
      included: ['a']
    })
    expect(applyWorkspaceBoardMembership('a', 'auto', ['a'], ['a'])).toEqual({
      excluded: [],
      included: []
    })
  })

  it('leaves other rows untouched', () => {
    expect(applyWorkspaceBoardMembership('a', 'excluded', ['b'], ['c'])).toEqual({
      excluded: ['b', 'a'],
      included: ['c']
    })
  })
})

describe('isWorkspaceOnBoard', () => {
  const none: ReadonlySet<string> = new Set()

  it('follows the sidebar when nothing is overridden', () => {
    expect(isWorkspaceOnBoard('a', true, none, none)).toBe(true)
    expect(isWorkspaceOnBoard('a', false, none, none)).toBe(false)
  })

  it('drops an excluded row even when the sidebar shows it', () => {
    expect(isWorkspaceOnBoard('a', true, new Set(['a']), none)).toBe(false)
  })

  it('keeps an included row even when a sidebar filter hides it', () => {
    expect(isWorkspaceOnBoard('a', false, none, new Set(['a']))).toBe(true)
  })

  it('lets exclusion win over inclusion', () => {
    expect(isWorkspaceOnBoard('a', true, new Set(['a']), new Set(['a']))).toBe(false)
  })
})
