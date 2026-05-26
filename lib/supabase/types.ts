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

export interface Database {
  public: {
    Tables: {
      games: { Row: Game; Insert: Omit<Game, 'id' | 'created_at'>; Update: Partial<Game> }
      players: { Row: Player; Insert: Omit<Player, 'id' | 'joined_at'>; Update: Partial<Player> }
      rounds: { Row: Round; Insert: Omit<Round, 'id'>; Update: Partial<Round> }
      questions: { Row: Question; Insert: Omit<Question, 'id'>; Update: Partial<Question> }
      answers: { Row: Answer; Insert: Omit<Answer, 'id' | 'answered_at'>; Update: Partial<Answer> }
    }
  }
}
