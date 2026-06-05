'use client'

import { useEffect } from 'react'
import Image from 'next/image'
import confetti from 'canvas-confetti'
import { motion } from 'framer-motion'
import { LeaderboardEntry } from './Leaderboard'
import { Leaderboard } from './Leaderboard'

export interface RoundWinnerBannerProps {
  roundNumber: number
  winner: LeaderboardEntry
  allPlayers: LeaderboardEntry[]
  onContinue: () => void
  onDismiss?: () => void
  isOrganiser: boolean
}

export function RoundWinnerBanner({
  roundNumber,
  winner,
  allPlayers,
  onContinue,
  onDismiss,
  isOrganiser,
}: RoundWinnerBannerProps) {
  useEffect(() => {
    confetti({
      particleCount: 100,
      spread: 120,
      origin: { y: 0.4 },
      colors: ['#6C3CF1', '#FFD600', '#ffffff'],
    })
  }, [])

  return (
    <motion.div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div
        className="bg-brand-card rounded-2xl p-8 w-full max-w-md text-center shadow-2xl border border-white/10 relative"
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      >
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Close"
            className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors text-xl leading-none"
          >
            ✕
          </button>
        )}
        <p className="font-fredoka text-brand-yellow text-2xl mb-1">
          Round {roundNumber} Complete!
        </p>
        <p className="text-white/50 text-sm mb-6">Round winner</p>

        <Image
          src={`https://api.dicebear.com/9.x/fun-emoji/svg?seed=${winner.avatarId}`}
          alt={winner.displayName}
          width={128}
          height={128}
          className="rounded-full w-32 h-32 mx-auto mb-4 ring-4 ring-brand-purple"
        />

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <p className="font-fredoka text-3xl text-white mb-1">{winner.displayName}</p>
          <p className="text-brand-purple font-medium text-lg mb-6">
            {winner.totalScore.toLocaleString()} pts
          </p>
        </motion.div>

        <div className="mb-6 text-left">
          <Leaderboard entries={allPlayers} highlightPlayerId={winner.playerId} />
        </div>

        {isOrganiser && (
          <button
            type="button"
            onClick={onContinue}
            className="w-full rounded-xl bg-brand-purple py-3 px-6 font-fredoka text-lg text-white hover:bg-brand-purple/80 transition-colors"
          >
            Start Next Round
          </button>
        )}
        {!isOrganiser && (
          <p className="text-white/40 text-sm">Waiting for organiser to start next round…</p>
        )}
      </motion.div>
    </motion.div>
  )
}
