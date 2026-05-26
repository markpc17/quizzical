'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { PlayerChip } from './PlayerChip'

export interface LeaderboardEntry {
  playerId: string
  displayName: string
  avatarId: number
  totalScore: number
  totalTimeMs: number
}

export interface LeaderboardProps {
  entries: LeaderboardEntry[]
  highlightPlayerId?: string
}

function formatTime(ms: number) {
  return `${(ms / 1000).toFixed(1)}s`
}

export function Leaderboard({ entries, highlightPlayerId }: LeaderboardProps) {
  const sorted = [...entries].sort((a, b) => {
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore
    return a.totalTimeMs - b.totalTimeMs
  })

  return (
    <div className="w-full max-w-xl mx-auto rounded-2xl overflow-hidden border border-white/10">
      <div className="grid grid-cols-[2rem_1fr_auto_auto] gap-x-3 px-4 py-2 bg-white/5 text-white/50 text-xs font-medium uppercase tracking-wide">
        <span>#</span>
        <span>Player</span>
        <span className="text-right">Score</span>
        <span className="text-right">Time</span>
      </div>

      <AnimatePresence>
        {sorted.map((entry, idx) => {
          const isFirst = idx === 0
          const isHighlighted = entry.playerId === highlightPlayerId

          return (
            <motion.div
              key={entry.playerId}
              layout
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className={cn(
                'grid grid-cols-[2rem_1fr_auto_auto] gap-x-3 px-4 py-3 items-center text-sm',
                idx % 2 === 0 ? 'bg-brand-card' : 'bg-white/[0.03]',
                isHighlighted && 'ring-1 ring-inset ring-brand-purple/60'
              )}
            >
              <span className="font-fredoka text-white/60 text-base">
                {isFirst ? '👑' : idx + 1}
              </span>
              <PlayerChip
                avatarId={entry.avatarId}
                displayName={entry.displayName}
                className={isFirst ? 'text-brand-yellow' : ''}
              />
              <span className={cn('font-fredoka text-lg text-right', isFirst ? 'text-brand-yellow' : 'text-white')}>
                {entry.totalScore.toLocaleString()}
              </span>
              <span className="text-white/50 text-right tabular-nums">
                {formatTime(entry.totalTimeMs)}
              </span>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
