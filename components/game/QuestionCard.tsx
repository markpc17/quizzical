'use client'

import { cn } from '@/lib/utils'

export interface QuestionCardProps {
  question: string
  answers: string[]
  correctAnswer: string
  onAnswer: (answer: string) => void
  locked?: boolean
  selectedAnswer?: string | null
}

export function QuestionCard({
  question,
  answers,
  correctAnswer,
  onAnswer,
  locked = false,
  selectedAnswer = null,
}: QuestionCardProps) {
  function getButtonClass(answer: string) {
    if (!locked) {
      return 'bg-brand-card border border-white/20 text-white hover:bg-brand-purple/20 hover:border-brand-purple/50 transition-colors'
    }
    if (answer === correctAnswer) {
      return 'bg-green-600/30 border border-green-500 text-green-300'
    }
    if (answer === selectedAnswer) {
      return 'bg-brand-purple/40 border border-brand-purple text-white'
    }
    return 'bg-brand-card border border-white/10 text-white/40'
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto">
      <div className="bg-brand-card rounded-2xl p-6 text-center">
        <p className="font-fredoka text-2xl sm:text-3xl text-white leading-snug">
          {question}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {answers.map((answer) => (
          <button
            key={answer}
            type="button"
            disabled={locked}
            onClick={() => !locked && onAnswer(answer)}
            className={cn(
              'rounded-xl px-4 py-4 text-left text-sm sm:text-base font-medium cursor-pointer disabled:cursor-default',
              getButtonClass(answer)
            )}
          >
            {answer}
          </button>
        ))}
      </div>
    </div>
  )
}
