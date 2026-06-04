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
  const leaderboardEntries: LeaderboardEntry[] = players
    .map((p) => ({
      playerId: p.id,
      displayName: p.display_name,
      avatarId: p.avatar_id,
      totalScore: p.total_score,
      totalTimeMs: p.total_time_ms,
    }))
    .sort((a, b) => {
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore
      return a.totalTimeMs - b.totalTimeMs
    })

  const winner = leaderboardEntries[0]

  const myEntry = myPlayerId ? leaderboardEntries.find((e) => e.playerId === myPlayerId) : null
  const myRank = myEntry ? leaderboardEntries.indexOf(myEntry) + 1 : null

  const [copied, setCopied] = useState(false)

  async function handleShare() {
    if (!myEntry || myRank === null) return
    const url = typeof window !== 'undefined' ? window.location.origin : ''
    const text = `I finished #${myRank} in Quizzicle with ${myEntry.totalScore.toLocaleString()} pts! Play at ${url}`
    if (navigator.share) {
      await navigator.share({ text }).catch(() => {/* user cancelled */})
    } else {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

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

      {/* Share result — only shown to players who participated */}
      {myEntry && myRank !== null && (
        <div className="bg-brand-card rounded-2xl p-5 text-center border border-white/10 w-full max-w-sm">
          <p className="text-white/50 text-sm mb-1">Your result</p>
          <p className="font-fredoka text-2xl text-white">
            #{myRank} &middot; {myEntry.totalScore.toLocaleString()} pts
          </p>
          <button
            type="button"
            onClick={handleShare}
            className="mt-4 rounded-xl bg-brand-yellow/20 border border-brand-yellow/40 px-6 py-2 font-fredoka text-lg text-brand-yellow hover:bg-brand-yellow/30 transition-colors"
          >
            {copied ? 'Copied!' : 'Share your result'}
          </button>
        </div>
      )}

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
