'use client'

import { useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { CountdownTimer } from '@/components/game/CountdownTimer'
import { Leaderboard } from '@/components/game/Leaderboard'
import type { LeaderboardEntry } from '@/components/game/Leaderboard'
import { useGameState } from '@/hooks/useGameState'
import { useCountdown } from '@/hooks/useCountdown'
import { QUESTION_TIME_MS } from '@/lib/game-utils'

function seededShuffle<T>(arr: T[], seed: string): T[] {
  const result = [...arr]
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  }
  for (let i = result.length - 1; i > 0; i--) {
    hash = (hash * 1664525 + 1013904223) >>> 0
    const j = hash % (i + 1)
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

export default function SpectatePage() {
  const params = useParams()
  const router = useRouter()
  const code = params.code as string

  const { game, players, currentQuestion, currentRound, loading } = useGameState(code)

  const remaining = useCountdown(currentQuestion?.opened_at ?? null, QUESTION_TIME_MS)

  // Redirect to results when the game finishes
  useEffect(() => {
    if (game?.status === 'finished') {
      router.push(`/game/${code}/results`)
    }
  }, [game?.status, code, router])

  const leaderboardEntries: LeaderboardEntry[] = players.map((p) => ({
    playerId: p.id,
    displayName: p.display_name,
    avatarId: p.avatar_id,
    totalScore: p.total_score,
    totalTimeMs: p.total_time_ms,
  }))

  const shuffledAnswers = useMemo(() => {
    if (!currentQuestion) return []
    return seededShuffle(
      [currentQuestion.correct_answer, ...currentQuestion.incorrect_answers],
      currentQuestion.id
    )
  }, [currentQuestion?.id])

  const roundNumber = currentRound?.round_number ?? game?.current_round ?? 1
  const questionNumber = (currentQuestion?.question_number ?? game?.current_question ?? 0) + 1
  const category = currentRound?.category_name ?? ''
  const questionDurationSec = QUESTION_TIME_MS / 1000

  if (loading) {
    return (
      <main className="min-h-screen bg-brand-dark flex items-center justify-center">
        <p className="text-white/50 font-fredoka text-2xl">Loading…</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-brand-dark flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-4 py-3 bg-brand-card border-b border-white/10">
        <div>
          <p className="text-white/50 text-xs uppercase tracking-widest">Spectator</p>
          <p className="font-fredoka text-brand-yellow text-lg tracking-widest">{code}</p>
        </div>

        {game?.status === 'round_active' && currentQuestion && (
          <div className="flex items-center gap-4">
            <div>
              <p className="text-white/50 text-xs uppercase tracking-widest">
                Round {roundNumber} · Q{questionNumber}
              </p>
              <p className="text-white font-medium text-sm">{category}</p>
            </div>
            <CountdownTimer total={questionDurationSec} remaining={remaining} />
          </div>
        )}

        <div className="rounded-lg bg-white/10 px-3 py-1">
          <p className="text-white/40 text-xs uppercase tracking-widest">Read only</p>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center px-4 py-8 gap-8 max-w-2xl mx-auto w-full">
        {/* Status panel */}
        <AnimatePresence mode="wait">
          {game?.status === 'lobby' && (
            <motion.div
              key="lobby"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="w-full bg-brand-card rounded-2xl p-8 flex flex-col items-center gap-4 border border-white/10 text-center"
            >
              <p className="font-fredoka text-3xl text-brand-yellow">Game hasn&apos;t started yet</p>
              <p className="text-white/50">Waiting for the organiser to start the game…</p>
              <p className="text-white/30 text-sm">{players.length} player{players.length !== 1 ? 's' : ''} in the lobby</p>
            </motion.div>
          )}

          {game?.status === 'round_active' && currentQuestion && (
            <motion.div
              key={`q-${currentQuestion.id}`}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="w-full flex flex-col gap-4"
            >
              {/* Question text */}
              <div className="bg-brand-card rounded-2xl p-6 border border-white/10 text-center">
                <p className="text-white/50 text-xs uppercase tracking-widest mb-3">
                  Round {roundNumber} · Question {questionNumber}
                </p>
                <p className="font-fredoka text-2xl text-white leading-snug">
                  {currentQuestion.question_text}
                </p>
              </div>

              {/* Answers — displayed but not clickable, shuffled to hide correct position */}
              <div className="grid grid-cols-2 gap-3 mt-4">
                {shuffledAnswers.map((answer, i) => (
                  <div
                    key={i}
                    className="rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-white/70 font-fredoka text-center select-none"
                  >
                    {answer}
                  </div>
                ))}
              </div>

              <p className="text-center text-white/30 text-sm">
                Spectators cannot answer
              </p>
            </motion.div>
          )}

          {game?.status === 'round_active' && !currentQuestion && (
            <motion.div
              key="waiting-q"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="bg-brand-card rounded-2xl p-8 border border-white/10 text-center w-full"
            >
              <p className="font-fredoka text-2xl text-white/60">Waiting for question…</p>
            </motion.div>
          )}

          {game?.status === 'round_end' && (
            <motion.div
              key="between"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="bg-brand-card rounded-2xl p-8 border border-white/10 text-center w-full"
            >
              <p className="font-fredoka text-2xl text-brand-yellow">Between rounds…</p>
              <p className="text-white/40 mt-2 text-sm">Next round coming up shortly</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Live leaderboard */}
        {leaderboardEntries.length > 0 && (
          <div className="w-full">
            <p className="text-white/50 text-xs uppercase tracking-widest mb-3">Leaderboard</p>
            <Leaderboard entries={leaderboardEntries} />
          </div>
        )}

        {/* Player avatars */}
        {players.length > 0 && (
          <div className="w-full">
            <p className="text-white/50 text-xs uppercase tracking-widest mb-3">
              {players.length} player{players.length !== 1 ? 's' : ''}
            </p>
            <div className="flex flex-wrap gap-3">
              {players.map((p) => (
                <div key={p.id} className="flex flex-col items-center gap-1">
                  <Image
                    src={`https://api.dicebear.com/9.x/fun-emoji/svg?seed=${p.avatar_id}`}
                    alt={p.display_name}
                    width={40}
                    height={40}
                    className="rounded-full w-10 h-10"
                  />
                  <p className="text-white/60 text-xs truncate max-w-[60px]">{p.display_name}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
