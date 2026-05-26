'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { AvatarPicker } from '@/components/game/AvatarPicker'
import { PlayerChip } from '@/components/game/PlayerChip'
import { useGameState } from '@/hooks/useGameState'

export default function LobbyPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const code = params.code as string

  const { game, players, isOrganiser, loading } = useGameState(code)

  const [displayName, setDisplayName] = useState('')
  const [selectedAvatar, setSelectedAvatar] = useState<number | null>(null)
  const [joining, setJoining] = useState(false)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [joinError, setJoinError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Validate organiser query param against stored token
  useEffect(() => {
    const organiserParam = searchParams.get('organiser')
    const storedToken = localStorage.getItem(`quizzicle-organiser-${code}`)
    if (organiserParam && organiserParam === storedToken) {
      // isOrganiser is driven by useGameState via localStorage, but also check param
    }
  }, [code, searchParams])

  // Auto-navigate when game starts
  useEffect(() => {
    if (game?.status === 'round_active') {
      router.push(`/game/${code}/play`)
    }
  }, [game?.status, code, router])

  async function handleJoin() {
    if (!displayName.trim()) { setJoinError('Enter a display name'); return }
    if (!selectedAvatar) { setJoinError('Pick an avatar'); return }
    setJoining(true)
    setJoinError(null)
    try {
      const res = await fetch(`/api/games/${code}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: displayName.trim(), avatarId: selectedAvatar }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'Failed to join')
      }
      const { playerId, playerToken } = await res.json()
      localStorage.setItem(
        `quizzicle-player-${code}`,
        JSON.stringify({ playerId, playerToken, displayName: displayName.trim(), avatarId: selectedAvatar })
      )
    } catch (err: unknown) {
      setJoinError(err instanceof Error ? err.message : 'Could not join game')
    } finally {
      setJoining(false)
    }
  }

  async function handleStart() {
    setStarting(true)
    setError(null)
    try {
      const organiserToken = localStorage.getItem(`quizzicle-organiser-${code}`)
      const res = await fetch(`/api/games/${code}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organiserToken }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Failed to start game')
        setStarting(false)
        return
      }
      // Realtime update will drive navigation via the useEffect above
    } catch {
      setError('Failed to start game')
      setStarting(false)
    }
  }

  function handleCopyLink() {
    const url = `${window.location.origin}/game/${code}/lobby`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-brand-dark flex items-center justify-center">
        <p className="text-white/50 font-fredoka text-2xl">Loading…</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-brand-dark px-4 py-8 flex flex-col gap-8 max-w-2xl mx-auto">
      {/* Game code */}
      <div className="text-center">
        <p className="text-white/50 text-sm mb-1 uppercase tracking-widest">Game Code</p>
        <p className="font-fredoka text-5xl text-brand-yellow tracking-widest">{code}</p>
        <button
          type="button"
          onClick={handleCopyLink}
          className="mt-3 rounded-lg bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20 transition-colors"
        >
          {copied ? '✓ Copied!' : 'Copy Link'}
        </button>
      </div>

      {/* Players in lobby */}
      <div>
        <p className="text-white/50 text-xs uppercase tracking-widest mb-3">
          {players.length} player{players.length !== 1 ? 's' : ''} waiting
        </p>
        <div className="flex flex-wrap gap-3">
          {players.map((p) => (
            <div key={p.id} className="bg-brand-card rounded-xl px-3 py-2">
              <PlayerChip avatarId={p.avatar_id} displayName={p.display_name} />
            </div>
          ))}
        </div>
      </div>

      {/* Join form */}
      <div className="bg-brand-card rounded-2xl p-6 flex flex-col gap-4">
        <h2 className="font-fredoka text-xl text-white">Join Game</h2>
        <input
          type="text"
          placeholder="Your name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          maxLength={20}
          className="rounded-xl bg-white/10 border border-white/20 px-4 py-3 text-white placeholder:text-white/30 outline-none focus:border-brand-purple/60 transition-colors"
        />
        <div>
          <p className="text-white/50 text-sm mb-3">Pick an avatar</p>
          <AvatarPicker selected={selectedAvatar} onSelect={setSelectedAvatar} />
        </div>
        {joinError && <p className="text-red-400 text-sm">{joinError}</p>}
        <button
          type="button"
          disabled={joining}
          onClick={handleJoin}
          className="rounded-xl bg-brand-purple py-3 font-fredoka text-lg text-white hover:bg-brand-purple/80 transition-colors disabled:opacity-60"
        >
          {joining ? 'Joining…' : 'Join Game'}
        </button>
      </div>

      {/* Organiser controls */}
      {isOrganiser && (
        <div className="text-center">
          <button
            type="button"
            disabled={starting}
            onClick={handleStart}
            className="rounded-2xl bg-brand-yellow px-10 py-4 font-fredoka text-2xl text-brand-dark hover:bg-brand-yellow/80 transition-colors disabled:opacity-60"
          >
            {starting ? 'Starting…' : 'Start Game'}
          </button>
          {error && <p className="mt-2 text-red-400 text-sm">{error}</p>}
          <p className="mt-2 text-white/40 text-xs">Only visible to organiser</p>
        </div>
      )}
    </main>
  )
}
