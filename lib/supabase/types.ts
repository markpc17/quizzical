export type GameStatus = 'lobby' | 'round_active' | 'round_end' | 'finished'

export interface Game {
  id: string
  code: string
  status: GameStatus
  current_round: number
  current_question: number
  created_at: string
}

export interface Player {
  id: string
  game_id: string
  display_name: string
  avatar_id: number
  joined_at: string
  total_score: number
  total_time_ms: number
}

export interface Round {
  id: string
  game_id: string
  round_number: number
  category_id: number
  category_name: string
}

export interface Question {
  id: string
  round_id: string
  question_number: number
  question_text: string
  correct_answer: string
  incorrect_answers: string[]
  opened_at: string | null
}

export interface Answer {
  id: string
  question_id: string
  player_id: string
  answer: string
  is_correct: boolean
  answered_at: string
  time_taken_ms: number
}

// Insert types: fields with DB defaults are optional
export interface GamesInsert {
  code: string
  status?: GameStatus
  current_round?: number
  current_question?: number
}

export interface PlayersInsert {
  game_id: string
  display_name: string
  avatar_id: number
  total_score?: number
  total_time_ms?: number
}

export interface RoundsInsert {
  game_id: string
  round_number: number
  category_id: number
  category_name: string
}

export interface QuestionsInsert {
  round_id: string
  question_number: number
  question_text: string
  correct_answer: string
  incorrect_answers: string[]
  opened_at?: string | null
}

export interface AnswersInsert {
  question_id: string
  player_id: string
  answer: string
  is_correct?: boolean
  time_taken_ms?: number
}

export interface Database {
  public: {
    Tables: {
      games: { Row: Game; Insert: GamesInsert; Update: Partial<Game>; Relationships: [] }
      players: { Row: Player; Insert: PlayersInsert; Update: Partial<Player>; Relationships: [] }
      rounds: { Row: Round; Insert: RoundsInsert; Update: Partial<Round>; Relationships: [] }
      questions: { Row: Question; Insert: QuestionsInsert; Update: Partial<Question>; Relationships: [] }
      answers: { Row: Answer; Insert: AnswersInsert; Update: Partial<Answer>; Relationships: [] }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
  }
}
