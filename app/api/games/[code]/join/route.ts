import { NextResponse } from 'next/server'
import { createAdminClientUntyped } from '@/lib/supabase/admin'

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

  const { displayName, avatarId, playerToken: incomingToken } = body as {
    displayName?: unknown
    avatarId?: unknown
    playerToken?: unknown
  }

  const supabase = createAdminClientUntyped()

  // Look up game by code
  const { data: gameData, error: gameError } = await supabase
    .from('games')
    .select('id, status, expires_at')
    .eq('code', code.toUpperCase())
    .single()

  if (gameError || !gameData) {
    return NextResponse.json({ error: 'Game not found' }, { status: 404 })
  }

  const game = gameData as { id: string; status: string; expires_at: string | null }

  // Rejoin fast-path: if caller provides an existing player token, return that player's data
  // Must run BEFORE displayName/avatarId validation — rejoin sends empty strings for those fields
  if (typeof incomingToken === 'string' && incomingToken.length > 0) {
    const { data: existingPlayer } = await supabase
      .from('players')
      .select('id, player_token')
      .eq('game_id', game.id)
      .eq('player_token', incomingToken)
      .single()

    if (existingPlayer) {
      const p = existingPlayer as { id: string; player_token: string }
      return NextResponse.json({ playerId: p.id, playerToken: p.player_token, rejoined: true })
    }
    // Token not found — fall through to create a new player
  }

  // Validate displayName (only needed for new player creation)
  if (typeof displayName !== 'string' || displayName.trim().length === 0) {
    return NextResponse.json({ error: 'displayName must be a non-empty string' }, { status: 400 })
  }
  if (displayName.trim().length > 20) {
    return NextResponse.json({ error: 'displayName must be 20 characters or fewer' }, { status: 400 })
  }

  // Validate avatarId (only needed for new player creation)
  if (typeof avatarId !== 'number' || !Number.isInteger(avatarId) || avatarId < 1 || avatarId > 20) {
    return NextResponse.json({ error: 'avatarId must be an integer between 1 and 20' }, { status: 400 })
  }

  if (game.status !== 'lobby') {
    return NextResponse.json({ error: 'Game has already started' }, { status: 409 })
  }

  if (game.expires_at && new Date(game.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Game has expired' }, { status: 410 })
  }

  // Enforce player cap
  const { count } = await supabase
    .from('players')
    .select('id', { count: 'exact', head: true })
    .eq('game_id', game.id)

  if ((count ?? 0) >= 30) {
    return NextResponse.json({ error: 'Game is full' }, { status: 409 })
  }

  // Single insert with token — avoids the brief window where player_token is null
  const playerToken = crypto.randomUUID()
  const { data: playerData, error: insertError } = await supabase
    .from('players')
    .insert({
      game_id: game.id,
      display_name: displayName.trim(),
      avatar_id: avatarId,
      player_token: playerToken,
    })
    .select('id')
    .single()

  if (insertError || !playerData) {
    console.error('[POST /api/games/[code]/join]', insertError)
    return NextResponse.json({ error: 'Failed to join game' }, { status: 500 })
  }

  const player = playerData as { id: string }

  return NextResponse.json({ playerId: player.id, playerToken })
}
