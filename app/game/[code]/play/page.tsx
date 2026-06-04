'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { CountdownTimer } from '@/components/game/CountdownTimer'
import { QuestionCard } from '@/components/game/QuestionCard'
import { useGameState } from '@/hooks/useGameState'
import { useCountdown } from '@/hooks/useCountdown'
import { useGameSounds } from '@/hooks/useGameSounds'
import { QUESTION_TIME_MS } from '@/lib/game-utils'

export default function PlayPage() {
  const params = useParams()
  const router = useRouter()
  const code = params.code as string

  const {
    game,
    currentQuestion,
    shuffledAnswers,
    myPlayerId,
    myPlayerToken,
    currentRound,
    players,
    isOrganiser,
    loading,
  } = useGameState(code)

  const remaining = useCountdown(currentQuestion?.opened_at ?? null, QUESTION_TIME_MS)

  const { muted, toggleMute, startCountdownMusic, stopMusic, playCorrect, playWrong } =
    useGameSounds()

  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [locked, setLocked] = useState(false)
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)

  // Silent rejoin if player token is in localStorage but player not in game list
  useEffect(() => {
    if (loading || !game || game.status !== 'round_active') return
    if (myPlayerId && players.some((p) => p.id === myPlayerId)) return

    const stored = localStorage.getItem(`quizzicle-player-${code}`)
    if (!stored) return
    try {
      const { playerToken } = JSON.parse(stored) as { playerId: string; playerToken: string }
      fetch(`/api/games/${code}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerToken, displayName: '', avatarId: 1 }),
      })
        .then((r) => r.json())
        .then((data: { playerId?: string; playerToken?: string }) => {
          if (data.playerId) {
            localStorage.setItem(
              `quizzicle-player-${code}`,
              JSON.stringify({ playerId: data.playerId, playerToken: data.playerToken })
            )
          }
        })
        .catch(() => {/* silent — game continues in read-only mode */})
    } catch {
      // ignore corrupt localStorage
    }
  }, [loading, game?.status, myPlayerId, players, code])

  // Reset answer state when question changes
  useEffect(() => {
    setSelectedAnswer(null)
    setLocked(false)
    setFeedback(null)
  }, [currentQuestion?.id])

  // Start countdown music when a new question opens
  useEffect(() => {
    if (currentQuestion?.opened_at) {
      startCountdownMusic(currentQuestion.opened_at, QUESTION_TIME_MS)
    }
    return () => stopMusic()
  // eslint-disable-next-line react-hooks/exhaustive-deps -- stable refs, re-run only on new question
  }, [currentQuestion?.id])

  // Play feedback sound when answer is judged
  useEffect(() => {
    if (feedback === 'correct') playCorrect()
    else if (feedback === 'wrong') playWrong()
  // eslint-disable-next-line react-hooks/exhaustive-deps -- stable refs
  }, [feedback])

  // Auto-navigate on game status changes
  useEffect(() => {
    if (game?.status === 'round_end') {
      router.push(`/game/${code}/round-end`)
    } else if (game?.status === 'finished') {
      router.push(`/game/${code}/results`)
    }
  }, [game?.status, code, router])

  const lockAndSubmit = useCallback(
    async (answer: string | null) => {
      if (locked) return
      setLocked(true)
      setSelectedAnswer(answer)

      // Timed out with no answer — just lock the UI
      if (answer === null || !myPlayerId || !myPlayerToken || !currentQuestion) return

      try {
        const res = await fetch(`/api/games/${code}/answer`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            playerId: myPlayerId,
            playerToken: myPlayerToken,
            questionId: currentQuestion.id,
            answer,
          }),
        })
        if (res.ok) {
          const { isCorrect } = await res.json()
          setFeedback(isCorrect ? 'correct' : 'wrong')
        }
      } catch {
        // Realtime drives next transition
      }
    },
    [locked, code, myPlayerId, myPlayerToken, currentQuestion]
  )

  // Organiser auto-advances to next question after timer + 3s grace for all players to answer
  useEffect(() => {
    if (!isOrganiser || !currentQuestion?.opened_at || game?.status !== 'round_active') return
    const openedAt = new Date(currentQuestion.opened_at).getTime()
    const advanceAt = openedAt + QUESTION_TIME_MS + 3000
    const delay = Math.max(0, advanceAt - Date.now())
    const organiserToken = localStorage.getItem(`quizzicle-organiser-${code}`)
    const timer = setTimeout(() => {
      fetch(`/api/games/${code}/next`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organiserToken }),
      }).catch(() => {})
    }, delay)
    return () => clearTimeout(timer)
  }, [currentQuestion?.id, currentQuestion?.opened_at, isOrganiser, code, game?.status])

  // Auto-submit on timer expiry
  useEffect(() => {
    if (!locked && remaining <= 0) {
      lockAndSubmit(null)
    }
  }, [remaining, locked, lockAndSubmit])

  function handleAnswer(answer: string) {
    lockAndSubmit(answer)
  }

  // Derive display values from live data
  const myPlayer = players.find((p) => p.id === myPlayerId)
  const myScore = myPlayer?.total_score ?? 0
  const roundNumber = currentRound?.round_number ?? game?.current_round ?? 1
  const questionNumber = (currentQuestion?.question_number ?? game?.current_question ?? 0) + 1
  const category = currentRound?.category_name ?? ''
  const questionDurationSec = QUESTION_TIME_MS / 1000

  return (
    <main className="min-h-screen bg-brand-dark flex flex-col">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 bg-brand-card border-b border-white/10">
        <div>
          <p className="text-white/50 text-xs uppercase tracking-widest">
            Round {roundNumber} · Q{questionNumber}
          </p>
          <p className="text-white font-medium text-sm">{category}</p>
        </div>

        <CountdownTimer total={questionDurationSec} remaining={remaining} />

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleMute}
            aria-label={muted ? 'Unmute sounds' : 'Mute sounds'}
            className="text-white/40 hover:text-white/80 transition-colors text-lg leading-none"
          >
            {muted ? '🔇' : '🔊'}
          </button>
          <div className="text-right">
            <p className="text-white/50 text-xs uppercase tracking-widest">Score</p>
            <p className="font-fredoka text-brand-yellow text-xl">{myScore.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Question area */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 gap-6">
        <AnimatePresence mode="wait">
          {currentQuestion ? (
            <motion.div
              key={currentQuestion.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.25 }}
              className="w-full"
            >
              <QuestionCard
                question={currentQuestion.question_text}
                answers={shuffledAnswers}
                correctAnswer={currentQuestion.correct_answer}
                onAnswer={handleAnswer}
                locked={locked}
                selectedAnswer={selectedAnswer}
              />
            </motion.div>
          ) : (
            <motion.p
              key="waiting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-white/40 font-fredoka text-xl"
            >
              Waiting for question…
            </motion.p>
          )}
        </AnimatePresence>

        {/* Feedback banner */}
        {feedback && (
          <div
            className={`rounded-xl px-6 py-3 font-fredoka text-xl ${
              feedback === 'correct'
                ? 'bg-green-600/30 text-green-300 border border-green-500'
                : 'bg-red-600/20 text-red-300 border border-red-500/50'
            }`}
          >
            {feedback === 'correct' ? '✓ Correct!' : '✗ Wrong answer'}
          </div>
        )}

        {locked && !feedback && (
          <p className="text-white/40 text-sm">Time&apos;s up — waiting for results…</p>
        )}

        {locked && feedback && (
          <p className="text-white/30 text-xs">Waiting for next question…</p>
        )}
      </div>
    </main>
  )
}
