import { NextResponse } from 'next/server'
import { createAdminClientUntyped } from '@/lib/supabase/admin'
import { generateGameCode } from '@/lib/game-utils'

export async function POST() {
  const supabase = createAdminClientUntyped()

  async function tryInsert(): Promise<{ gameId: string; code: string; organiserToken: string } | null> {
    const code = generateGameCode()

    const organiserToken = crypto.randomUUID()

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

    const { data, error } = await supabase
      .from('games')
      .insert({ code, status: 'lobby', organiser_token: organiserToken, expires_at: expiresAt })
      .select('id, code')
      .single()

    if (error) {
      // 23505 = unique_violation — retry once with a new code
      if (error.code === '23505') {
        return null
      }
      throw error
    }

    return { gameId: (data as { id: string; code: string }).id, code: (data as { id: string; code: string }).code, organiserToken }
  }

  try {
    let result = await tryInsert()

    if (!result) {
      // Retry once on collision
      result = await tryInsert()
      if (!result) {
        return NextResponse.json({ error: 'Failed to generate unique game code' }, { status: 500 })
      }
    }

    return NextResponse.json({
      gameId: result.gameId,
      code: result.code,
      organiserToken: result.organiserToken,
    })
  } catch (err) {
    console.error('[POST /api/games]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
