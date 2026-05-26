'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

export interface LoadScreenProps {
  onComplete: () => void
}

const container = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.06 },
  },
}

const letter = {
  hidden: { opacity: 0, y: 40, scale: 0.5 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 500, damping: 20 },
  },
}

export function LoadScreen({ onComplete }: LoadScreenProps) {
  const [fading, setFading] = useState(false)

  useEffect(() => {
    const fadeTimer = setTimeout(() => setFading(true), 2500)
    const completeTimer = setTimeout(() => onComplete(), 3000)
    return () => {
      clearTimeout(fadeTimer)
      clearTimeout(completeTimer)
    }
  }, [onComplete])

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-brand-dark"
      animate={{ opacity: fading ? 0 : 1 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="font-fredoka text-5xl text-brand-yellow"
        style={{ display: 'flex' }}
      >
        {'⚡ Quizzicle'.split('').map((char, i) => (
          <motion.span key={i} variants={letter} style={{ display: 'inline-block' }}>
            {char === ' ' ? ' ' : char}
          </motion.span>
        ))}
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="mt-3 text-white/70 text-lg"
      >
        The ultimate quiz showdown
      </motion.p>
    </motion.div>
  )
}
