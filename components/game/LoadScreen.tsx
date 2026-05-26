'use client'

import { useEffect, useState } from 'react'

export interface LoadScreenProps {
  onComplete: () => void
}

export function LoadScreen({ onComplete }: LoadScreenProps) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false)
      onComplete()
    }, 2500)
    return () => clearTimeout(timer)
  }, [onComplete])

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-brand-dark transition-opacity duration-500 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <h1 className="font-fredoka text-5xl text-brand-yellow">
        ⚡ Quizzicle
      </h1>
      <p className="mt-3 text-white/70 text-lg">The ultimate quiz showdown</p>
    </div>
  )
}
