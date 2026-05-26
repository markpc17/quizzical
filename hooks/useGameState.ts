'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { shuffleArray } from '@/lib/game-utils'
import type { Game, Player, Round, Question, Answer } from '@/lib/supabase/types'

export interface GameState {
  game: Game | null
  players: Player[]
  currentRound: Round | null
  currentQuestion: Question | null
  shuffledAnswers: string[]
  myPlayerId: string | null
  myPlayerToken: string | null
  isOrganiser: boolean
  roundWinner: Player | null
  loading: boolean
  error: string | null
}

async function fetchRoundWinner(
  supabase: ReturnType<typeof createClient>,
  roundId: string,
  players: Player[]
): Promise<Player | null> {
  // Step 1: fetch question IDs for the round
  const { data: questionRows } = await supabase
    .from('questions')
    .select('id')
    .eq('round_id', roundId)

  const questionIds = ((questionRows ?? []) as Array<{ id: string }>).map((q) => q.id)
  if (questionIds.length === 0) return null

  // Step 2: fetch answers for those questions
  const { data: answers, error } = await supabase
    .from('answers')
    .select('player_id, is_correct, time_taken_ms')
    .in('question_id', questionIds)

  if (error || !answers) return null

  // Group by player: count correct answers and sum time
  const byPlayer: Record<string, { correct: number; totalTime: number }> = {}
  for (const a of answers as Answer[]) {
    if (!byPlayer[a.player_id]) byPlayer[a.player_id] = { correct: 0, totalTime: 0 }
    if (a.is_correct) byPlayer[a.player_id].correct += 1
    byPlayer[a.player_id].totalTime += a.time_taken_ms
  }

  let winner: Player | null = null
  let bestCorrect = -1
  let bestTime = Infinity
  for (const player of players) {
    const stats = byPlayer[player.id] ?? { correct: 0, totalTime: 0 }
    if (
      stats.correct > bestCorrect ||
      (stats.correct === bestCorrect && stats.totalTime < bestTime)
    ) {
      bestCorrect = stats.correct
      bestTime = stats.totalTime
      winner = player
    }
  }
  return winner
}

export function useGameState(code: string): GameState {
  const router = useRouter()

  const [game, setGame] = useState<Game | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [currentRound, setCurrentRound] = useState<Round | null>(null)
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null)
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null)
  const [myPlayerToken, setMyPlayerToken] = useState<string | null>(null)
  const [isOrganiser, setIsOrganiser] = useState(false)
  const [roundWinner, setRoundWinner] = useState<Player | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Keep a stable ref to the supabase client so we can remove channels in cleanup
  const supabaseRef = useRef(createClient())

  // Mirror of players state — used for reads in realtime callbacks without setPlayers abuse
  const playersRef = useRef<Player[]>([])

  // Shuffle answers — stable per question ID
  const shuffledAnswers = useMemo(() => {
    if (!currentQuestion) return []
    return shuffleArray([
      ...currentQuestion.incorrect_answers,
      currentQuestion.correct_answer,
    ])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQuestion?.id])

  // Read localStorage (SSR-safe: must be inside useEffect)
  useEffect(() => {
    const playerRaw = localStorage.getItem(`quizzicle-player-${code}`)
    if (playerRaw) {
      try {
        const parsed = JSON.parse(playerRaw) as { playerId: string; playerToken: string }
        setMyPlayerId(parsed.playerId)
        setMyPlayerToken(parsed.playerToken)
      } catch {
        // malformed — ignore
      }
    }
    const organiserToken = localStorage.getItem(`quizzicle-organiser-${code}`)
    setIsOrganiser(!!organiserToken)
  }, [code])

  // Initial data fetch + realtime subscriptions
  useEffect(() => {
    const supabase = supabaseRef.current
    let cancelled = false

    // round is a mutable local used by the realtime callback to know the current round
    let round: Round | null = null

    async function init() {
      setLoading(true)
      setError(null)

      // 1. Fetch game by code
      const { data: gameData, error: gameErr } = await supabase
        .from('games')
        .select('*')
        .eq('code', code)
        .single()

      const gameRow = gameData as Game | null
      if (gameErr || !gameRow) {
        if (!cancelled) {
          setError('Game not found')
          setLoading(false)
          router.push('/')
        }
        return
      }
      if (!cancelled) setGame(gameRow)

      // 2. Fetch players
      const { data: playerData } = await supabase
        .from('players')
        .select('*')
        .eq('game_id', gameRow.id)
      const playerRows = (playerData ?? []) as Player[]
      if (!cancelled) {
        playersRef.current = playerRows
        setPlayers(playerRows)
      }

      // 3. Fetch current round
      if (gameRow.current_round > 0) {
        const { data: roundData } = await supabase
          .from('rounds')
          .select('*')
          .eq('game_id', gameRow.id)
          .eq('round_number', gameRow.current_round)
          .single()
        round = (roundData as Round | null) ?? null
        if (!cancelled) setCurrentRound(round)
      }

      // 4. Fetch current question
      if (round && gameRow.current_question > 0) {
        const { data: questionData } = await supabase
          .from('questions')
          .select('*')
          .eq('round_id', round.id)
          .eq('question_number', gameRow.current_question)
          .single()
        if (!cancelled) setCurrentQuestion((questionData as Question | null) ?? null)
      }

      // 5. If already in round_end, fetch round winner
      if (gameRow.status === 'round_end' && round) {
        const w = await fetchRoundWinner(supabase, round.id, playerRows)
        if (!cancelled) setRoundWinner(w)
      }

      if (!cancelled) setLoading(false)

      // ── Realtime subscriptions ──────────────────────────────────────────
      const channel = supabase
        .channel(`game:${code}`)
        // Game row changes
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'games',
            filter: `code=eq.${code}`,
          },
          async (payload) => {
            if (cancelled) return
            const updated = payload.new as Game
            setGame(updated)

            // Fetch new round when round number advances
            if (updated.current_round > 0) {
              const { data: roundData } = await supabase
                .from('rounds')
                .select('*')
                .eq('game_id', updated.id)
                .eq('round_number', updated.current_round)
                .single()
              const newRound = (roundData as Round | null) ?? null
              if (!cancelled && newRound) {
                setCurrentRound(newRound)
                round = newRound
              }
            }

            // Fetch new question when question number advances
            if (round && updated.current_question > 0) {
              const { data: questionData } = await supabase
                .from('questions')
                .select('*')
                .eq('round_id', round.id)
                .eq('question_number', updated.current_question)
                .single()
              if (!cancelled) setCurrentQuestion((questionData as Question | null) ?? null)
            }

            // Fetch round winner on transition to round_end
            if (updated.status === 'round_end' && round) {
              fetchRoundWinner(supabase, round.id, playersRef.current).then((w) => {
                if (!cancelled) setRoundWinner(w)
              })
            }
          }
        )
        // New player joins
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'players',
            filter: `game_id=eq.${gameRow.id}`,
          },
          (payload) => {
            if (cancelled) return
            const newPlayer = payload.new as Player
            setPlayers((prev) => {
              const exists = prev.some((p) => p.id === newPlayer.id)
              const next = exists ? prev : [...prev, newPlayer]
              playersRef.current = next
              return next
            })
          }
        )
        // Player score updates
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'players',
            filter: `game_id=eq.${gameRow.id}`,
          },
          (payload) => {
            if (cancelled) return
            const updated = payload.new as Player
            setPlayers((prev) => {
              const next = prev.map((p) => (p.id === updated.id ? updated : p))
              playersRef.current = next
              return next
            })
          }
        )
        // Question becomes active (opened_at set)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'questions',
          },
          (payload) => {
            if (cancelled) return
            const q = payload.new as Question
            if (q.round_id !== round?.id) return   // ignore questions from other games
            if (q.opened_at) setCurrentQuestion(q)
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }

    const cleanupPromise = init()
    return () => {
      cancelled = true
      cleanupPromise.then((cleanup) => cleanup?.())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code])

  return {
    game,
    players,
    currentRound,
    currentQuestion,
    shuffledAnswers,
    myPlayerId,
    myPlayerToken,
    isOrganiser,
    roundWinner,
    loading,
    error,
  }
}
