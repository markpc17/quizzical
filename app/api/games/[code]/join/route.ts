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

  const { displayName, avatarId } = body as { displayName?: unknown; avatarId?: unknown }

  // Validate displayName
  if (typeof displayName !== 'string' || displayName.trim().length === 0) {
    return NextResponse.json({ error: 'displayName must be a non-empty string' }, { status: 400 })
  }
  if (displayName.trim().length > 20) {
    return NextResponse.json({ error: 'displayName must be 20 characters or fewer' }, { status: 400 })
  }

  // Validate avatarId
  if (typeof avatarId !== 'number' || !Number.isInteger(avatarId) || avatarId < 1 || avatarId > 20) {
    return NextResponse.json({ error: 'avatarId must be an integer between 1 and 20' }, { status: 400 })
  }

  const supabase = createAdminClientUntyped()

  // Look up game by code
  const { data: gameData, error: gameError } = await supabase
    .from('games')
    .select('id, status')
    .eq('code', code.toUpperCase())
    .single()

  if (gameError || !gameData) {
    return NextResponse.json({ error: 'Game not found' }, { status: 404 })
  }

  const game = gameData as { id: string; status: string }

  if (game.status !== 'lobby') {
    return NextResponse.json({ error: 'Game has already started' }, { status: 409 })
  }

  // Insert player
  const { data: playerData, error: insertError } = await supabase
    .from('players')
    .insert({
      game_id: game.id,
      display_name: displayName.trim(),
      avatar_id: avatarId,
    })
    .select('id')
    .single()

  if (insertError || !playerData) {
    console.error('[POST /api/games/[code]/join]', insertError)
    return NextResponse.json({ error: 'Failed to join game' }, { status: 500 })
  }

  const player = playerData as { id: string }
  const playerToken = crypto.randomUUID()

  // Persist the player token
  const { error: tokenError } = await supabase
    .from('players')
    .update({ player_token: playerToken })
    .eq('id', player.id)

  if (tokenError) {
    console.error('[POST /api/games/[code]/join] token update', tokenError)
    return NextResponse.json({ error: 'Failed to join game' }, { status: 500 })
  }

  return NextResponse.json({ playerId: player.id, playerToken })
}
