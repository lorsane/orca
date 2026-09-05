import { describe, expect, it } from 'vitest'
import {
  getWorkspaceActivityWindowStartAt,
  isWithinWorkspaceActivityWindow,
  normalizeWorkspaceActivityWindow
} from './workspace-activity-window'

const NOW = new Date(2026, 8, 5, 14, 30, 0).getTime()
const startOfToday = new Date(2026, 8, 5, 0, 0, 0, 0).getTime()
const startOfYesterday = new Date(2026, 8, 4, 0, 0, 0, 0).getTime()

describe('normalizeWorkspaceActivityWindow', () => {
  it('keeps known windows and degrades anything else to all', () => {
    expect(normalizeWorkspaceActivityWindow('today')).toBe('today')
    expect(normalizeWorkspaceActivityWindow('today-yesterday')).toBe('today-yesterday')
    expect(normalizeWorkspaceActivityWindow('last-week')).toBe('all')
    expect(normalizeWorkspaceActivityWindow(undefined)).toBe('all')
  })
})

describe('getWorkspaceActivityWindowStartAt', () => {
  it('returns null for the unfiltered window', () => {
    expect(getWorkspaceActivityWindowStartAt('all', NOW)).toBeNull()
  })

  it('bounds on local midnight, not on a rolling 24h offset', () => {
    expect(getWorkspaceActivityWindowStartAt('today', NOW)).toBe(startOfToday)
    expect(getWorkspaceActivityWindowStartAt('today-yesterday', NOW)).toBe(startOfYesterday)
  })
})

describe('isWithinWorkspaceActivityWindow', () => {
  it('admits everything when unfiltered', () => {
    expect(isWithinWorkspaceActivityWindow(0, 'all', NOW)).toBe(true)
    expect(isWithinWorkspaceActivityWindow(undefined, 'all', NOW)).toBe(true)
  })

  it('includes this morning but not last night', () => {
    expect(isWithinWorkspaceActivityWindow(startOfToday, 'today', NOW)).toBe(true)
    expect(isWithinWorkspaceActivityWindow(startOfToday - 1, 'today', NOW)).toBe(false)
  })

  it('extends to yesterday midnight for the two-day window', () => {
    expect(isWithinWorkspaceActivityWindow(startOfToday - 1, 'today-yesterday', NOW)).toBe(true)
    expect(isWithinWorkspaceActivityWindow(startOfYesterday, 'today-yesterday', NOW)).toBe(true)
    expect(isWithinWorkspaceActivityWindow(startOfYesterday - 1, 'today-yesterday', NOW)).toBe(
      false
    )
  })

  it('treats a missing timestamp as never active', () => {
    expect(isWithinWorkspaceActivityWindow(undefined, 'today', NOW)).toBe(false)
    expect(isWithinWorkspaceActivityWindow(null, 'today', NOW)).toBe(false)
  })
})
