import { NextResponse } from 'next/server'
import { createAdminClientUntyped } from '@/lib/supabase/admin'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params

  // TODO: validate organiser token (see start/route.ts for rationale)

  const supabase = createAdminClientUntyped()

  // Fetch current game state
  const { data: gameData, error: gameError } = await supabase
    .from('games')
    .select('id, status, current_round, current_question')
    .eq('code', code.toUpperCase())
    .single()

  if (gameError || !gameData) {
    return NextResponse.json({ error: 'Game not found' }, { status: 404 })
  }

  const game = gameData as {
    id: string
    status: string
    current_round: number
    current_question: number
  }

  if (game.status === 'finished') {
    return NextResponse.json({ error: 'Game is already finished' }, { status: 409 })
  }

  if (game.status === 'lobby') {
    return NextResponse.json({ error: 'Game has not started yet' }, { status: 409 })
  }

  const { current_round, current_question } = game
  const now = new Date().toISOString()

  // Handle "start_round" trigger: if status is 'round_end', begin the new round
  if (game.status === 'round_end') {
    // Find the round row for the current round number
    const { data: roundData, error: roundError } = await supabase
      .from('rounds')
      .select('id')
      .eq('game_id', game.id)
      .eq('round_number', current_round)
      .single()

    if (roundError || !roundData) {
      return NextResponse.json({ error: 'Round not found' }, { status: 500 })
    }
    const round = roundData as { id: string }

    // Set opened_at on question 0 of the new round
    const { error: qError } = await supabase
      .from('questions')
      .update({ opened_at: now })
      .eq('round_id', round.id)
      .eq('question_number', 0)

    if (qError) {
      console.error('[POST /api/games/[code]/next] open first question of round', qError)
      return NextResponse.json({ error: 'Failed to open first question' }, { status: 500 })
    }

    // Transition game back to round_active
    const { error: updateError } = await supabase
      .from('games')
      .update({ status: 'round_active' })
      .eq('id', game.id)

    if (updateError) {
      console.error('[POST /api/games/[code]/next] round_end -> round_active', updateError)
      return NextResponse.json({ error: 'Failed to start round' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, state: 'next_question' })
  }

  // game.status is 'round_active' — advance question or round

  if (current_question < 9) {
    // Move to the next question within the same round
    const nextQuestion = current_question + 1

    // Find the round to locate the next question
    const { data: roundData, error: roundError } = await supabase
      .from('rounds')
      .select('id')
      .eq('game_id', game.id)
      .eq('round_number', current_round)
      .single()

    if (roundError || !roundData) {
      return NextResponse.json({ error: 'Round not found' }, { status: 500 })
    }
    const round = roundData as { id: string }

    // Set opened_at on the next question
    const { error: qError } = await supabase
      .from('questions')
      .update({ opened_at: now })
      .eq('round_id', round.id)
      .eq('question_number', nextQuestion)

    if (qError) {
      console.error('[POST /api/games/[code]/next] open next question', qError)
      return NextResponse.json({ error: 'Failed to open next question' }, { status: 500 })
    }

    // Advance the game pointer
    const { error: updateError } = await supabase
      .from('games')
      .update({ current_question: nextQuestion })
      .eq('id', game.id)

    if (updateError) {
      console.error('[POST /api/games/[code]/next] increment question', updateError)
      return NextResponse.json({ error: 'Failed to advance question' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, state: 'next_question' })
  }

  // current_question === 9 — end of the round

  if (current_round < 5) {
    // Move to the next round (round_end state; organiser calls /next again to start it)
    const nextRound = current_round + 1

    const { error: updateError } = await supabase
      .from('games')
      .update({
        status: 'round_end',
        current_round: nextRound,
        current_question: 0,
      })
      .eq('id', game.id)

    if (updateError) {
      console.error('[POST /api/games/[code]/next] advance round', updateError)
      return NextResponse.json({ error: 'Failed to advance to next round' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, state: 'round_end' })
  }

  // current_round === 5 AND current_question === 9 — game over

  const { error: finishError } = await supabase
    .from('games')
    .update({ status: 'finished' })
    .eq('id', game.id)

  if (finishError) {
    console.error('[POST /api/games/[code]/next] finish game', finishError)
    return NextResponse.json({ error: 'Failed to finish game' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, state: 'game_over' })
}
