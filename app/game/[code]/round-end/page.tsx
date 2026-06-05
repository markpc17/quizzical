'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { RoundWinnerBanner } from '@/components/game/RoundWinnerBanner'
import { Leaderboard, LeaderboardEntry } from '@/components/game/Leaderboard'
import { useGameState } from '@/hooks/useGameState'

export default function RoundEndPage() {
  const params = useParams()
  const router = useRouter()
  const code = params.code as string

  const { game, players, currentRound, roundWinner, isOrganiser, loading } = useGameState(code)

  const [showBanner, setShowBanner] = useState(true)
  const [advancing, setAdvancing] = useState(false)

  // Auto-navigate when next round starts
  useEffect(() => {
    if (game?.status === 'round_active') {
      router.push(`/game/${code}/play`)
    } else if (game?.status === 'finished') {
      router.push(`/game/${code}/results`)
    }
  }, [game?.status, code, router])

  // Build leaderboard entries from players
  const leaderboardEntries: LeaderboardEntry[] = players.map((p) => ({
    playerId: p.id,
    displayName: p.display_name,
    avatarId: p.avatar_id,
    totalScore: p.total_score,
    totalTimeMs: p.total_time_ms,
  }))

  // Map roundWinner Player → LeaderboardEntry for the banner
  const winnerEntry: LeaderboardEntry | null = roundWinner
    ? {
        playerId: roundWinner.id,
        displayName: roundWinner.display_name,
        avatarId: roundWinner.avatar_id,
        totalScore: roundWinner.total_score,
        totalTimeMs: roundWinner.total_time_ms,
      }
    : leaderboardEntries[0] ?? null

  async function handleContinue() {
    setAdvancing(true)
    try {
      const organiserToken = localStorage.getItem(`quizzicle-organiser-${code}`)
      const res = await fetch(`/api/games/${code}/next`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organiserToken }),
      })
      if (!res.ok) {
        setAdvancing(false)
      }
      // Realtime update drives navigation via the useEffect above
    } catch {
      setAdvancing(false)
    }
  }

  if (loading || leaderboardEntries.length === 0) {
    return (
      <main className="min-h-screen bg-brand-dark flex items-center justify-center">
        <p className="text-white/50 font-fredoka text-2xl">Loading…</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-brand-dark flex flex-col items-center px-4 py-8 gap-8">
      {showBanner && winnerEntry && (
        <RoundWinnerBanner
          roundNumber={currentRound?.round_number ?? game?.current_round ?? 1}
          winner={winnerEntry}
          allPlayers={leaderboardEntries}
          onContinue={handleContinue}
          onDismiss={() => setShowBanner(false)}
          isOrganiser={isOrganiser}
        />
      )}

      <h2 className="font-fredoka text-3xl text-white mt-4">
        Round {currentRound?.round_number ?? game?.current_round ?? 1} of {game?.total_rounds ?? 5} — Leaderboard
      </h2>
      <Leaderboard entries={leaderboardEntries} />

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
