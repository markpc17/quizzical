'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { RoundWinnerBanner } from '@/components/game/RoundWinnerBanner'
import { Leaderboard, LeaderboardEntry } from '@/components/game/Leaderboard'

// MOCK DATA — replaced in Phase 5
const MOCK_ROUND_NUMBER = 2

const MOCK_PLAYERS: LeaderboardEntry[] = [
  { playerId: 'p1', displayName: 'Alice', avatarId: 3, totalScore: 4800, totalTimeMs: 42300 },
  { playerId: 'p2', displayName: 'Bob', avatarId: 7, totalScore: 4200, totalTimeMs: 38900 },
  { playerId: 'p3', displayName: 'Charlie', avatarId: 12, totalScore: 3600, totalTimeMs: 55100 },
  { playerId: 'p4', displayName: 'Diana', avatarId: 5, totalScore: 3100, totalTimeMs: 61200 },
]

export default function RoundEndPage() {
  const params = useParams()
  const router = useRouter()
  const code = params.code as string

  const [showBanner, setShowBanner] = useState(true)
  const [isOrganiser, setIsOrganiser] = useState(false)
  const [advancing, setAdvancing] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(`quizzicle-organiser-${code}`)
    setIsOrganiser(!!stored)
  }, [code])

  const sorted = [...MOCK_PLAYERS].sort((a, b) => {
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore
    return a.totalTimeMs - b.totalTimeMs
  })
  const winner = sorted[0]

  async function handleContinue() {
    setAdvancing(true)
    try {
      const organiserToken = localStorage.getItem(`quizzicle-organiser-${code}`)
      const res = await fetch(`/api/games/${code}/next`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organiserToken }),
      })
      if (res.ok) {
        const { state } = await res.json()
        if (state === 'game_over') {
          router.push(`/game/${code}/results`)
        } else {
          router.push(`/game/${code}/play`)
        }
      }
    } catch {
      setAdvancing(false)
    }
  }

  return (
    <main className="min-h-screen bg-brand-dark flex flex-col items-center px-4 py-8 gap-8">
      {showBanner && (
        <RoundWinnerBanner
          roundNumber={MOCK_ROUND_NUMBER}
          winner={winner}
          allPlayers={MOCK_PLAYERS}
          onContinue={handleContinue}
          isOrganiser={isOrganiser}
        />
      )}

      <h2 className="font-fredoka text-3xl text-white mt-4">Leaderboard</h2>
      <Leaderboard entries={MOCK_PLAYERS} />

      <button
        type="button"
        onClick={() => setShowBanner(true)}
        className="mt-2 rounded-lg bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20 transition-colors"
      >
        Show Round Summary
      </button>
    </main>
  )
}
