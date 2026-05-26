'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import confetti from 'canvas-confetti'
import { Leaderboard, LeaderboardEntry } from '@/components/game/Leaderboard'

// MOCK DATA — replaced in Phase 5
const MOCK_PLAYERS: LeaderboardEntry[] = [
  { playerId: 'p1', displayName: 'Alice', avatarId: 3, totalScore: 9600, totalTimeMs: 85300 },
  { playerId: 'p2', displayName: 'Bob', avatarId: 7, totalScore: 8400, totalTimeMs: 78900 },
  { playerId: 'p3', displayName: 'Charlie', avatarId: 12, totalScore: 7200, totalTimeMs: 95100 },
  { playerId: 'p4', displayName: 'Diana', avatarId: 5, totalScore: 6100, totalTimeMs: 112200 },
]
const MOCK_HIGHLIGHT_PLAYER = 'p1'

export default function ResultsPage() {
  const router = useRouter()

  const sorted = [...MOCK_PLAYERS].sort((a, b) => {
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore
    return a.totalTimeMs - b.totalTimeMs
  })
  const winner = sorted[0]

  useEffect(() => {
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
  }, [])

  return (
    <main className="min-h-screen bg-brand-dark flex flex-col items-center px-4 py-12 gap-8">
      <div className="text-center">
        <h1 className="font-fredoka text-5xl text-brand-yellow mb-2">Game Over!</h1>
        <p className="text-white/60 text-lg">Final Results</p>
      </div>

      {/* Winner spotlight */}
      <div className="bg-brand-card rounded-2xl p-6 text-center border border-white/10 w-full max-w-sm">
        <p className="text-white/50 text-sm mb-3">🏆 Champion</p>
        <img
          src={`https://api.dicebear.com/9.x/fun-emoji/svg?seed=${winner.avatarId}`}
          alt={winner.displayName}
          width={128}
          height={128}
          loading="lazy"
          className="rounded-full w-32 h-32 mx-auto mb-3 ring-4 ring-brand-yellow"
        />
        <p className="font-fredoka text-3xl text-white">{winner.displayName}</p>
        <p className="font-fredoka text-2xl text-brand-yellow mt-1">
          {winner.totalScore.toLocaleString()} pts
        </p>
      </div>

      <Leaderboard entries={MOCK_PLAYERS} highlightPlayerId={MOCK_HIGHLIGHT_PLAYER} />

      <button
        type="button"
        onClick={() => router.push('/')}
        className="mt-4 rounded-2xl bg-brand-purple px-10 py-4 font-fredoka text-2xl text-white hover:bg-brand-purple/80 transition-colors"
      >
        Play Again
      </button>
    </main>
  )
}
