'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { CountdownTimer } from '@/components/game/CountdownTimer'
import { QuestionCard } from '@/components/game/QuestionCard'

// MOCK DATA — replaced in Phase 5
const MOCK_QUESTION = {
  questionText: 'What is the capital of France?',
  answers: ['Berlin', 'Paris', 'Madrid', 'Rome'],
  correctAnswer: 'Paris',
  roundNumber: 1,
  questionNumber: 3,
  category: 'Geography',
}
const MOCK_SCORE = 1200
const QUESTION_DURATION = 20

export default function PlayPage() {
  const params = useParams()
  const code = params.code as string

  const [remaining, setRemaining] = useState(QUESTION_DURATION)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [locked, setLocked] = useState(false)
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)

  const lockAndSubmit = useCallback(
    async (answer: string | null) => {
      if (locked) return
      setLocked(true)
      setSelectedAnswer(answer)

      const stored = localStorage.getItem(`quizzicle-player-${code}`)
      let playerData: { playerId: string; playerToken: string } | null = null
      try {
        playerData = stored ? JSON.parse(stored) : null
      } catch {
        // Malformed localStorage — player will need to rejoin
      }
      if (!playerData) return
      const { playerId, playerToken } = playerData

      try {
        const res = await fetch(`/api/games/${code}/answer`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerId, playerToken, answer }),
        })
        if (res.ok) {
          const { isCorrect } = await res.json()
          setFeedback(isCorrect ? 'correct' : 'wrong')
        }
      } catch {
        // Phase 5 will handle errors via Realtime
      }
    },
    [locked, code]
  )

  // Countdown
  useEffect(() => {
    if (locked) return
    if (remaining <= 0) {
      lockAndSubmit(null)
      return
    }
    const tick = setTimeout(() => setRemaining((r) => r - 0.5), 500)
    return () => clearTimeout(tick)
  }, [remaining, locked, lockAndSubmit])

  function handleAnswer(answer: string) {
    lockAndSubmit(answer)
  }

  return (
    <main className="min-h-screen bg-brand-dark flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-brand-card border-b border-white/10">
        <div>
          <p className="text-white/50 text-xs uppercase tracking-widest">
            Round {MOCK_QUESTION.roundNumber} · Q{MOCK_QUESTION.questionNumber}
          </p>
          <p className="text-white font-medium text-sm">{MOCK_QUESTION.category}</p>
        </div>

        <CountdownTimer total={QUESTION_DURATION} remaining={remaining} />

        <div className="text-right">
          <p className="text-white/50 text-xs uppercase tracking-widest">Score</p>
          <p className="font-fredoka text-brand-yellow text-xl">{MOCK_SCORE.toLocaleString()}</p>
        </div>
      </div>

      {/* Question area */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 gap-6">
        <QuestionCard
          question={MOCK_QUESTION.questionText}
          answers={MOCK_QUESTION.answers}
          correctAnswer={MOCK_QUESTION.correctAnswer}
          onAnswer={handleAnswer}
          locked={locked}
          selectedAnswer={selectedAnswer}
        />

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

        {locked && (
          <p className="text-white/30 text-xs">Waiting for next question… (Phase 5 auto-advances)</p>
        )}
      </div>
    </main>
  )
}
