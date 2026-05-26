'use client'

export interface CountdownTimerProps {
  total?: number
  remaining: number
}

export function CountdownTimer({ total = 20, remaining }: CountdownTimerProps) {
  const size = 80
  const strokeWidth = 6
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const fraction = Math.max(0, Math.min(1, remaining / total))
  const dashOffset = circumference * (1 - fraction)
  const isUrgent = remaining <= 5
  const color = isUrgent ? '#ef4444' : '#6C3CF1'

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="white"
          strokeOpacity={0.1}
          strokeWidth={strokeWidth}
        />
        {/* Progress */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{ transition: 'stroke-dashoffset 0.5s linear, stroke 0.3s' }}
        />
      </svg>
      <span
        className="absolute font-fredoka text-xl font-bold"
        style={{ color }}
      >
        {Math.ceil(remaining)}
      </span>
    </div>
  )
}
