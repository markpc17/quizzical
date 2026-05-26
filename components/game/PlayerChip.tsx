'use client'

import { cn } from '@/lib/utils'

export interface PlayerChipProps {
  avatarId: number
  displayName: string
  className?: string
}

export function PlayerChip({ avatarId, displayName, className }: PlayerChipProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <img
        src={`https://api.dicebear.com/9.x/fun-emoji/svg?seed=${avatarId}`}
        alt={displayName}
        width={32}
        height={32}
        loading="lazy"
        className="rounded-full w-8 h-8 shrink-0"
      />
      <span className="text-white text-sm font-medium truncate">{displayName}</span>
    </div>
  )
}
