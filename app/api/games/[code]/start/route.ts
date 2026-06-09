import { NextResponse } from 'next/server'
import { createAdminClientUntyped } from '@/lib/supabase/admin'
import { decodeHtmlEntities, shuffleArray, QUESTIONS_PER_ROUND } from '@/lib/game-utils'
import { getFallbackRounds } from '@/lib/fallback-questions'

interface QuizCategory {
  id: number
  name: string
}

interface OpenTDBQuestion {
  question: string
  correct_answer: string
  incorrect_answers: string[]
  difficulty: string
}

interface OpenTDBQuestionsResponse {
  response_code: number
  results: OpenTDBQuestion[]
}

/**
 * Category pool, split into tiers. Each game takes rounds − 1 mainstream
 * categories plus one niche wildcard (two for 10-round games, since only
 * 8 mainstream categories exist). Mapped to OpenTDB category IDs.
 */
const MAINSTREAM_CATEGORIES: QuizCategory[] = [
  { id: 22, name: 'Geography' },
  { id: 23, name: 'History' },
  { id: 17, name: 'Science & Nature' },
  { id: 26, name: 'Pop Culture' },
  { id: 12, name: 'Music' },
  { id: 11, name: 'Film & TV' },
  { id: 21, name: 'Sports' },
  { id: 18, name: 'Technology' },
]

const NICHE_CATEGORIES: QuizCategory[] = [
  { id: 10, name: 'Literature' },
  { id: 25, name: 'Art & Architecture' },
  { id: 20, name: 'Mythology' },
  { id: 24, name: 'Politics & World Affairs' },
  { id: 28, name: 'Cars & Transport' },
  { id: 27, name: 'Animals & Wildlife' },
]

async function fetchQuestionsForCategory(
  categoryId: number,
  difficulty: string,
  sessionToken?: string
): Promise<OpenTDBQuestion[] | null> {
  const diffParam = difficulty !== 'mixed' ? `&difficulty=${difficulty}` : ''
  const tokenParam = sessionToken ? `&token=${sessionToken}` : ''
  const url = `https://opentdb.com/api.php?amount=${QUESTIONS_PER_ROUND}&category=${categoryId}&type=multiple${diffParam}${tokenParam}`
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) return null
  const json = (await res.json()) as OpenTDBQuestionsResponse
  // response_code 5 = rate limited — wait and retry once
  if (json.response_code === 5) {
    await new Promise(resolve => setTimeout(resolve, 5000))
    const retry = await fetch(url, { cache: 'no-store' })
    if (!retry.ok) return null
    const retryJson = (await retry.json()) as OpenTDBQuestionsResponse
    if (retryJson.response_code !== 0 || retryJson.results.length < QUESTIONS_PER_ROUND) return null
    return retryJson.results
  }
  if (json.response_code !== 0 || json.results.length < QUESTIONS_PER_ROUND) return null
  return json.results
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params

  const body = await request.json().catch(() => ({}))
  const { organiserToken, difficulty: rawDifficulty, rounds: rawRounds } = body as {
    organiserToken?: unknown
    difficulty?: unknown
    rounds?: unknown
  }
  const difficulty =
    typeof rawDifficulty === 'string' && ['easy', 'medium', 'hard', 'mixed'].includes(rawDifficulty)
      ? rawDifficulty
      : 'medium'
  const rounds =
    typeof rawRounds === 'number' && [3, 5, 10].includes(rawRounds)
      ? rawRounds
      : 5

  const supabase = createAdminClientUntyped()

  const { data: gameData, error: gameError } = await supabase
    .from('games')
    .select('id, status, organiser_token')
    .eq('code', code.toUpperCase())
    .single()

  if (gameError || !gameData) {
    return NextResponse.json({ error: 'Game not found' }, { status: 404 })
  }

  const game = gameData as { id: string; status: string; organiser_token: string | null }

  if (!organiserToken || game.organiser_token !== organiserToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (game.status !== 'lobby') {
    return NextResponse.json({ error: 'Game has already started' }, { status: 409 })
  }

  // Clean up any partial previous attempt
  const { data: existingRounds } = await supabase.from('rounds').select('id').eq('game_id', game.id)
  if (existingRounds && existingRounds.length > 0) {
    await supabase.from('rounds').delete().eq('game_id', game.id)
  }

  // Request an OpenTDB session token to prevent duplicate questions across rounds
  let sessionToken: string | undefined
  try {
    const tokenRes = await fetch('https://opentdb.com/api_token.php?command=request', { cache: 'no-store' })
    if (tokenRes.ok) {
      const tokenJson = (await tokenRes.json()) as { token?: string }
      sessionToken = tokenJson.token
    }
  } catch {
    // Proceed without session token — questions may occasionally repeat
  }

  const mainstream = shuffleArray([...MAINSTREAM_CATEGORIES])
  const niche = shuffleArray([...NICHE_CATEGORIES])
  // 1 niche wildcard per game; 10-round games need 2 (only 8 mainstream exist)
  const nicheCount = Math.max(1, rounds - mainstream.length)
  const primary = shuffleArray([
    ...mainstream.slice(0, rounds - nicheCount),
    ...niche.slice(0, nicheCount),
  ])
  // Padding (mainstream first) absorbs per-category fetch failures
  const padding = [...mainstream.slice(rounds - nicheCount), ...niche.slice(nicheCount)]
  const candidates = [...primary, ...padding].slice(0, rounds + 3)

  const fetchResults = await Promise.allSettled(
    candidates.map((category) =>
      fetchQuestionsForCategory(category.id, difficulty, sessionToken)
        .then((questions) => ({ category, questions }))
        .catch(() => ({ category, questions: null }))
    )
  )

  const selectedRounds: Array<{ category: QuizCategory; questions: OpenTDBQuestion[] }> = []
  for (const result of fetchResults) {
    if (selectedRounds.length >= rounds) break
    if (
      result.status === 'fulfilled' &&
      result.value.questions &&
      result.value.questions.length >= QUESTIONS_PER_ROUND
    ) {
      selectedRounds.push({
        category: result.value.category,
        questions: result.value.questions.slice(0, QUESTIONS_PER_ROUND),
      })
    }
  }

  if (selectedRounds.length < rounds) {
    const usedIds = new Set(selectedRounds.map((r) => r.category.id))
    const fallback = getFallbackRounds(rounds - selectedRounds.length, usedIds)
    selectedRounds.push(...fallback)
  }

  if (selectedRounds.length < rounds) {
    return NextResponse.json({ error: 'Could not fetch enough quiz questions' }, { status: 502 })
  }

  // Insert rounds
  const roundInserts = selectedRounds.map((r, idx) => ({
    game_id: game.id,
    round_number: idx + 1,
    category_id: r.category.id,
    category_name: r.category.name,
  }))

  const { data: insertedRoundsData, error: roundsError } = await supabase
    .from('rounds')
    .insert(roundInserts)
    .select('id, round_number')

  if (roundsError || !insertedRoundsData) {
    console.error('[POST /api/games/[code]/start] rounds insert', roundsError)
    return NextResponse.json({ error: 'Failed to create rounds' }, { status: 500 })
  }

  const insertedRounds = insertedRoundsData as Array<{ id: string; round_number: number }>
  const roundIdByNumber: Record<number, string> = {}
  for (const r of insertedRounds) {
    roundIdByNumber[r.round_number] = r.id
  }

  const now = new Date().toISOString()
  const questionInserts = selectedRounds.flatMap((r, roundIdx) =>
    r.questions.map((q, qIdx) => ({
      round_id: roundIdByNumber[roundIdx + 1],
      question_number: qIdx,
      question_text: decodeHtmlEntities(q.question),
      correct_answer: decodeHtmlEntities(q.correct_answer),
      incorrect_answers: q.incorrect_answers.map(decodeHtmlEntities),
      opened_at: roundIdx === 0 && qIdx === 0 ? now : null,
    }))
  )

  const { error: questionsError } = await supabase.from('questions').insert(questionInserts)

  if (questionsError) {
    console.error('[POST /api/games/[code]/start] questions insert', questionsError)
    return NextResponse.json({ error: 'Failed to create questions' }, { status: 500 })
  }

  const { error: updateError } = await supabase
    .from('games')
    .update({ status: 'round_active', current_round: 1, current_question: 0, total_rounds: rounds })
    .eq('id', game.id)

  if (updateError) {
    console.error('[POST /api/games/[code]/start] game update', updateError)
    return NextResponse.json({ error: 'Failed to start game' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
