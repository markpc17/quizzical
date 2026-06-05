'use client'

import { useEffect, useState } from 'react'

const EMOJIS = ['😞', '😐', '🙂', '😄', '🤩'] as const
type Emoji = typeof EMOJIS[number]

interface FeedbackModalProps {
  isOpen: boolean
  onClose: () => void
}

type FormState = 'idle' | 'submitting' | 'success' | 'error'

export function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  const [rating, setRating] = useState<Emoji | null>(null)
  const [message, setMessage] = useState('')
  const [formState, setFormState] = useState<FormState>('idle')

  useEffect(() => {
    if (!isOpen) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  useEffect(() => {
    if (formState !== 'success') return
    const t = setTimeout(() => {
      onClose()
      setTimeout(() => {
        setRating(null)
        setMessage('')
        setFormState('idle')
      }, 300)
    }, 3000)
    return () => clearTimeout(t)
  }, [formState, onClose])

  if (!isOpen) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!rating) return
    setFormState('submitting')
    try {
      const res = await fetch('https://formspree.io/f/xgobvprb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ rating, message }),
      })
      if (!res.ok) throw new Error('Formspree error')
      setFormState('success')
    } catch {
      setFormState('error')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" aria-modal="true" role="dialog">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden="true" />
      <div className="relative z-10 w-full max-w-sm bg-brand-card border border-white/10 rounded-2xl p-6 shadow-xl">
        {formState === 'success' ? (
          <div className="text-center py-4">
            <p className="font-fredoka text-3xl text-brand-yellow mb-2">⚡</p>
            <p className="font-fredoka text-2xl text-white">Thanks for your feedback!</p>
            <p className="text-white/50 text-sm mt-2">This will close automatically.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <h2 className="font-fredoka text-2xl text-white mb-1">Share feedback</h2>
            <p className="text-white/50 text-sm mb-5">How are you finding Quizzicle?</p>
            <div className="flex justify-between mb-5" role="group" aria-label="Rating">
              {EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setRating(emoji)}
                  className={`text-3xl rounded-xl p-2 transition-all ${
                    rating === emoji ? 'ring-2 ring-brand-yellow bg-white/10 scale-110' : 'hover:bg-white/5'
                  }`}
                  aria-label={emoji}
                  aria-pressed={rating === emoji}
                >
                  {emoji}
                </button>
              ))}
            </div>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell us what you think… (optional)"
              rows={3}
              className="w-full rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-purple mb-4"
            />
            {formState === 'error' && (
              <p className="text-red-400 text-sm mb-3">Something went wrong — please try again.</p>
            )}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl border border-white/10 py-2 font-fredoka text-white/60 hover:text-white hover:border-white/30 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!rating || formState === 'submitting'}
                className="flex-1 rounded-xl bg-brand-purple py-2 font-fredoka text-white hover:bg-brand-purple/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {formState === 'submitting' ? 'Sending…' : 'Send'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
