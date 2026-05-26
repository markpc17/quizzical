import { NextResponse } from 'next/server'
import { createAdminClientUntyped } from '@/lib/supabase/admin'
import { generateGameCode } from '@/lib/game-utils'

export async function POST() {
  const supabase = createAdminClientUntyped()

  async function tryInsert(): Promise<{ gameId: string; code: string } | null> {
    const code = generateGameCode()

    const { data, error } = await supabase
      .from('games')
      .insert({ code, status: 'lobby' })
      .select('id, code')
      .single()

    if (error) {
      // 23505 = unique_violation — retry once with a new code
      if (error.code === '23505') {
        return null
      }
      throw error
    }

    return { gameId: (data as { id: string; code: string }).id, code: (data as { id: string; code: string }).code }
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

    const organiserToken = crypto.randomUUID()

    return NextResponse.json({
      gameId: result.gameId,
      code: result.code,
      organiserToken,
    })
  } catch (err) {
    console.error('[POST /api/games]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
