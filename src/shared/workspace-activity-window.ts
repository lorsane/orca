/**
 * Recency filter for workspace navigation: "active today", "today + yesterday".
 *
 * Why local midnight and not a rolling 24h/48h window: the user asks for "what
 * I touched today", which is a calendar question. A rolling window silently
 * drops this morning's work as the day wears on.
 */
export const WORKSPACE_ACTIVITY_WINDOWS = ['all', 'today', 'today-yesterday'] as const

export type WorkspaceActivityWindow = (typeof WORKSPACE_ACTIVITY_WINDOWS)[number]

export const DEFAULT_WORKSPACE_ACTIVITY_WINDOW: WorkspaceActivityWindow = 'all'

export function normalizeWorkspaceActivityWindow(value: unknown): WorkspaceActivityWindow {
  return WORKSPACE_ACTIVITY_WINDOWS.includes(value as WorkspaceActivityWindow)
    ? (value as WorkspaceActivityWindow)
    : DEFAULT_WORKSPACE_ACTIVITY_WINDOW
}

/** Inclusive lower bound in epoch ms, or null when the window admits everything. */
export function getWorkspaceActivityWindowStartAt(
  window: WorkspaceActivityWindow,
  now: number
): number | null {
  if (window === 'all') {
    return null
  }
  const midnight = new Date(now)
  midnight.setHours(0, 0, 0, 0)
  const startOfToday = midnight.getTime()
  if (window === 'today') {
    return startOfToday
  }
  // Why re-derive instead of subtracting 24h: DST days are 23 or 25 hours long.
  midnight.setDate(midnight.getDate() - 1)
  return midnight.getTime()
}

export function isWithinWorkspaceActivityWindow(
  lastActivityAt: number | null | undefined,
  window: WorkspaceActivityWindow,
  now: number
): boolean {
  const startAt = getWorkspaceActivityWindowStartAt(window, now)
  if (startAt === null) {
    return true
  }
  return typeof lastActivityAt === 'number' && lastActivityAt >= startAt
}
