'use client'

import { useState, useEffect } from 'react'

/**
 * Returns seconds remaining (float). Returns totalMs/1000 when openedAt is null.
 * Ticks every 100 ms. Returns 0 when expired.
 */
export function useCountdown(openedAt: string | null, totalMs: number): number {
  const [remaining, setRemaining] = useState<number>(() => {
    if (!openedAt) return totalMs / 1000
    const elapsed = Date.now() - new Date(openedAt).getTime()
    return Math.max(0, (totalMs - elapsed) / 1000)
  })

  useEffect(() => {
    const calc = () => {
      if (!openedAt) return totalMs / 1000
      const elapsed = Date.now() - new Date(openedAt).getTime()
      return Math.max(0, (totalMs - elapsed) / 1000)
    }

    // Reset immediately when openedAt changes
    setRemaining(calc())

    if (!openedAt) return

    const interval = setInterval(() => {
      const r = calc()
      setRemaining(r)
      if (r <= 0) clearInterval(interval)
    }, 100)

    return () => clearInterval(interval)
  }, [openedAt, totalMs])

  return remaining
}
