import { useEffect, useState } from 'react'

function startOfLocalDay(now: number): number {
  const midnight = new Date(now)
  midnight.setHours(0, 0, 0, 0)
  return midnight.getTime()
}

/**
 * Local midnight of the current day, re-published when the day rolls over.
 *
 * Why a hook and not `Date.now()` inline: calendar-day filters must stay pure
 * across re-renders yet still refresh at midnight without a user gesture.
 */
export function useLocalDayStart(): number {
  const [dayStartAt, setDayStartAt] = useState(() => startOfLocalDay(Date.now()))

  useEffect(() => {
    // Why re-derive from the wall clock each tick: a suspended machine can wake
    // several days later, and DST days are not 24h long.
    let timer: ReturnType<typeof setTimeout>
    const schedule = (): void => {
      const now = Date.now()
      const current = startOfLocalDay(now)
      setDayStartAt((previous) => (previous === current ? previous : current))
      const nextMidnight = new Date(current)
      nextMidnight.setDate(nextMidnight.getDate() + 1)
      timer = setTimeout(schedule, Math.max(1000, nextMidnight.getTime() - now))
    }
    schedule()
    return () => clearTimeout(timer)
  }, [])

  return dayStartAt
}
