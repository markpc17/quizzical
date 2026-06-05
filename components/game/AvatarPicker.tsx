'use client'

import Image from 'next/image'

export interface AvatarPickerProps {
  selected: number | null
  onSelect: (id: number) => void
}

export function AvatarPicker({ selected, onSelect }: AvatarPickerProps) {
  return (
    <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
      {Array.from({ length: 20 }, (_, i) => i + 1).map((id) => (
        <button
          key={id}
          type="button"
          onClick={() => onSelect(id)}
          aria-pressed={selected === id}
          className={`flex flex-col items-center gap-1 rounded-xl p-1 transition-all focus:outline-none ${
            selected === id
              ? 'ring-4 ring-brand-purple bg-brand-purple/10'
              : 'hover:bg-white/5'
          }`}
        >
          <Image
            src={`https://api.dicebear.com/9.x/fun-emoji/svg?seed=${id}`}
            alt={`Avatar ${id}`}
            width={64}
            height={64}
            loading="lazy"
            className="rounded-full w-16 h-16"
          />
        </button>
      ))}
    </div>
  )
}
