import { decode } from 'html-entities'

export const GAME_ROUNDS = 5
export const QUESTIONS_PER_ROUND = 10
export const QUESTION_TIME_MS = 15_000

/**
 * Generates a random 6-character uppercase alphanumeric game code.
 */
export function generateGameCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  while (code.length < 6) {
    const idx = Math.floor(Math.random() * chars.length)
    code += chars[idx]
  }
  return code
}

export const decodeHtmlEntities = (text: string): string => decode(text)

/**
 * Fisher-Yates in-place shuffle. Returns the same array (mutated).
 */
export function shuffleArray<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}
