'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import confetti from 'canvas-confetti'
import { Leaderboard, LeaderboardEntry } from '@/components/game/Leaderboard'
import { useGameState } from '@/hooks/useGameState'

export default function ResultsPage() {
  const params = useParams()
  const router = useRouter()
  const code = params.code as string

  const { players, myPlayerId, loading } = useGameState(code)

  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  // Build and sort leaderboard
  const leaderboardEntries: LeaderboardEntry[] = players.map((p) => ({
    playerId: p.id,
    displayName: p.display_name,
    avatarId: p.avatar_id,
    totalScore: p.total_score,
    totalTimeMs: p.total_time_ms,
  }))

  const winner = leaderboardEntries[0]

  useEffect(() => {
    if (!winner) return
    let cancelled = false
    const end = Date.now() + 3000
    const frame = () => {
      if (cancelled || Date.now() > end) return
      confetti({
        particleCount: 6,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#6C3CF1', '#FFD600', '#ffffff'],
      })
      confetti({
        particleCount: 6,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#6C3CF1', '#FFD600', '#ffffff'],
      })
      requestAnimationFrame(frame)
    }
    requestAnimationFrame(frame)
    return () => { cancelled = true }
  }, [winner?.playerId])

  async function handlePlayAgain() {
    setCreating(true)
    setCreateError(null)
    try {
      const res = await fetch('/api/games', { method: 'POST' })
      if (!res.ok) throw new Error('Failed to create game')
      const { code: newCode, organiserToken } = await res.json()
      localStorage.setItem(`quizzicle-organiser-${newCode}`, organiserToken)
      router.push(`/game/${newCode}/lobby`)
    } catch {
      setCreateError('Could not create game — please try again.')
      setCreating(false)
    }
  }

  if (loading || !winner) {
    return (
      <main className="min-h-screen bg-brand-dark flex items-center justify-center">
        <p className="text-white/50 font-fredoka text-2xl">Loading results…</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-brand-dark flex flex-col items-center px-4 py-12 gap-8">
      <div className="text-center">
        <h1 className="font-fredoka text-5xl text-brand-yellow mb-2">Game Over!</h1>
        <p className="text-white/60 text-lg">Final Results</p>
      </div>

      {/* Winner spotlight */}
      <div className="bg-brand-card rounded-2xl p-6 text-center border border-white/10 w-full max-w-sm">
        <p className="text-white/50 text-sm mb-3">🏆 Champion</p>
        <Image
          src={`https://api.dicebear.com/9.x/fun-emoji/svg?seed=${winner.avatarId}`}
          alt={winner.displayName}
          width={128}
          height={128}
          className="rounded-full w-32 h-32 mx-auto mb-3 ring-4 ring-brand-yellow"
        />
        <p className="font-fredoka text-3xl text-white">{winner.displayName}</p>
        <p className="font-fredoka text-2xl text-brand-yellow mt-1">
          {winner.totalScore.toLocaleString()} pts
        </p>
      </div>

      <Leaderboard entries={leaderboardEntries} highlightPlayerId={myPlayerId ?? undefined} />

      {createError && (
        <p className="text-red-400 text-sm">{createError}</p>
      )}

      <button
        type="button"
        disabled={creating}
        onClick={handlePlayAgain}
        className="mt-4 rounded-2xl bg-brand-purple px-10 py-4 font-fredoka text-2xl text-white hover:bg-brand-purple/80 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {creating ? 'Creating…' : 'Play Again'}
      </button>
    </main>
  )
}
