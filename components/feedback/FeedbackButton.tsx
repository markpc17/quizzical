'use client'

import { useState } from 'react'
import { FeedbackModal } from './FeedbackModal'

export function FeedbackButton() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-40 rounded-full bg-brand-purple px-5 py-2.5 font-fredoka text-base text-white shadow-lg hover:bg-brand-purple/80 transition-colors"
          aria-label="Open feedback form"
        >
          Feedback
        </button>
      )}
      <FeedbackModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  )
}
