import { NextResponse } from 'next/server'
import { createAdminClientUntyped } from '@/lib/supabase/admin'

const MAX_TIME_MS = 20000

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { playerId, questionId, answer } = body as {
    playerId?: unknown
    questionId?: unknown
    answer?: unknown
  }

  if (typeof playerId !== 'string' || !playerId) {
    return NextResponse.json({ error: 'playerId is required' }, { status: 400 })
  }
  if (typeof questionId !== 'string' || !questionId) {
    return NextResponse.json({ error: 'questionId is required' }, { status: 400 })
  }
  if (typeof answer !== 'string' || !answer) {
    return NextResponse.json({ error: 'answer is required' }, { status: 400 })
  }

  const supabase = createAdminClientUntyped()

  // Look up the game by code to verify membership
  const { data: gameData, error: gameError } = await supabase
    .from('games')
    .select('id, status')
    .eq('code', code.toUpperCase())
    .single()

  if (gameError || !gameData) {
    return NextResponse.json({ error: 'Game not found' }, { status: 404 })
  }
  const game = gameData as { id: string; status: string }

  if (game.status !== 'round_active') {
    return NextResponse.json({ error: 'Game is not accepting answers' }, { status: 409 })
  }

  // Fetch the question — verify it belongs to this game via rounds
  const { data: questionData, error: questionError } = await supabase
    .from('questions')
    .select('id, correct_answer, opened_at, round_id')
    .eq('id', questionId)
    .single()

  if (questionError || !questionData) {
    return NextResponse.json({ error: 'Question not found' }, { status: 404 })
  }
  const question = questionData as {
    id: string
    correct_answer: string
    opened_at: string | null
    round_id: string
  }

  // Verify question belongs to this game
  const { data: roundData, error: roundError } = await supabase
    .from('rounds')
    .select('game_id')
    .eq('id', question.round_id)
    .single()

  if (roundError || !roundData) {
    return NextResponse.json({ error: 'Question does not belong to this game' }, { status: 403 })
  }
  const round = roundData as { game_id: string }

  if (round.game_id !== game.id) {
    return NextResponse.json({ error: 'Question does not belong to this game' }, { status: 403 })
  }

  // Verify the player belongs to this game
  const { data: playerData, error: playerError } = await supabase
    .from('players')
    .select('id, game_id, total_score, total_time_ms')
    .eq('id', playerId)
    .eq('game_id', game.id)
    .single()

  if (playerError || !playerData) {
    return NextResponse.json({ error: 'Player not found in this game' }, { status: 404 })
  }
  const player = playerData as {
    id: string
    game_id: string
    total_score: number
    total_time_ms: number
  }

  if (!question.opened_at) {
    return NextResponse.json({ error: 'Question not yet opened' }, { status: 409 })
  }

  // Calculate time taken
  const elapsed = Date.now() - new Date(question.opened_at).getTime()
  const timeTakenMs = Math.min(Math.max(0, elapsed), MAX_TIME_MS)

  const isCorrect = answer === question.correct_answer

  // Insert answer — UNIQUE(question_id, player_id) will throw on duplicate
  const { error: answerError } = await supabase.from('answers').insert({
    question_id: questionId,
    player_id: playerId,
    answer,
    is_correct: isCorrect,
    time_taken_ms: timeTakenMs,
  })

  if (answerError) {
    if ((answerError as { code?: string }).code === '23505') {
      return NextResponse.json({ error: 'Answer already submitted' }, { status: 409 })
    }
    console.error('[POST /api/games/[code]/answer]', answerError)
    return NextResponse.json({ error: 'Failed to record answer' }, { status: 500 })
  }

  // Update player score if correct
  if (isCorrect) {
    const { error: scoreError } = await supabase
      .from('players')
      .update({
        total_score: player.total_score + 1,
        total_time_ms: player.total_time_ms + timeTakenMs,
      })
      .eq('id', playerId)

    if (scoreError) {
      console.error('[POST /api/games/[code]/answer] score update', scoreError)
      // Non-fatal: answer was recorded; best-effort score update
    }
  }

  return NextResponse.json({ ok: true, isCorrect })
}
