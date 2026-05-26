import { NextResponse } from 'next/server'
import { createAdminClientUntyped } from '@/lib/supabase/admin'
import { decodeHtmlEntities, shuffleArray } from '@/lib/game-utils'

interface OpenTDBCategory {
  id: number
  name: string
}

interface OpenTDBQuestion {
  question: string
  correct_answer: string
  incorrect_answers: string[]
  difficulty: string
}

interface OpenTDBCategoryResponse {
  trivia_categories: OpenTDBCategory[]
}

interface OpenTDBQuestionsResponse {
  response_code: number
  results: OpenTDBQuestion[]
}

async function fetchCategories(): Promise<OpenTDBCategory[]> {
  const res = await fetch('https://opentdb.com/api_category.php')
  if (!res.ok) throw new Error(`OpenTDB category fetch failed: ${res.status}`)
  const json = (await res.json()) as OpenTDBCategoryResponse
  return json.trivia_categories
}

async function fetchQuestionsForCategory(categoryId: number): Promise<OpenTDBQuestion[] | null> {
  const url = `https://opentdb.com/api.php?amount=10&category=${categoryId}&type=multiple`
  const res = await fetch(url)
  if (!res.ok) return null
  const json = (await res.json()) as OpenTDBQuestionsResponse
  // response_code 0 = success, 1 = no results
  if (json.response_code !== 0 || json.results.length < 10) return null
  return json.results
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params

  // TODO: validate organiser token
  // The organiser token is stored client-side in localStorage. Proper server-side
  // validation would require persisting the token in the games table or using a
  // signed JWT. Skipped for this phase.

  const supabase = createAdminClientUntyped()

  // Fetch game
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

  // Fetch OpenTDB categories and pick 5 distinct ones
  let allCategories: OpenTDBCategory[]
  try {
    allCategories = await fetchCategories()
  } catch (err) {
    console.error('[POST /api/games/[code]/start] fetchCategories', err)
    return NextResponse.json({ error: 'Failed to fetch quiz categories' }, { status: 502 })
  }

  shuffleArray(allCategories)

  // Try categories until we have 5 with enough questions
  const selectedRounds: Array<{ category: OpenTDBCategory; questions: OpenTDBQuestion[] }> = []
  let categoryIndex = 0

  while (selectedRounds.length < 5 && categoryIndex < allCategories.length) {
    const category = allCategories[categoryIndex]
    categoryIndex++

    let questions: OpenTDBQuestion[] | null = null
    try {
      questions = await fetchQuestionsForCategory(category.id)
    } catch {
      // Skip this category on error
      continue
    }

    if (questions && questions.length >= 10) {
      selectedRounds.push({ category, questions: questions.slice(0, 10) })
    }
  }

  if (selectedRounds.length < 5) {
    return NextResponse.json({ error: 'Could not fetch enough quiz questions from OpenTDB' }, { status: 502 })
  }

  // Insert rounds
  const roundInserts = selectedRounds.map((r, idx) => ({
    game_id: game.id,
    round_number: idx + 1,
    category_id: r.category.id,
    category_name: decodeHtmlEntities(r.category.name),
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

  // Build a map: round_number -> round id
  const roundIdByNumber: Record<number, string> = {}
  for (const r of insertedRounds) {
    roundIdByNumber[r.round_number] = r.id
  }

  // Insert questions (50 total — 10 per round)
  const now = new Date().toISOString()
  const questionInserts = selectedRounds.flatMap((r, roundIdx) =>
    r.questions.map((q, qIdx) => ({
      round_id: roundIdByNumber[roundIdx + 1],
      question_number: qIdx,
      question_text: decodeHtmlEntities(q.question),
      correct_answer: decodeHtmlEntities(q.correct_answer),
      incorrect_answers: q.incorrect_answers.map(decodeHtmlEntities),
      // Set opened_at on the very first question of round 1 only
      opened_at: roundIdx === 0 && qIdx === 0 ? now : null,
    }))
  )

  const { error: questionsError } = await supabase.from('questions').insert(questionInserts)

  if (questionsError) {
    console.error('[POST /api/games/[code]/start] questions insert', questionsError)
    return NextResponse.json({ error: 'Failed to create questions' }, { status: 500 })
  }

  // Update game status
  const { error: updateError } = await supabase
    .from('games')
    .update({
      status: 'round_active',
      current_round: 1,
      current_question: 0,
    })
    .eq('id', game.id)

  if (updateError) {
    console.error('[POST /api/games/[code]/start] game update', updateError)
    return NextResponse.json({ error: 'Failed to start game' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
