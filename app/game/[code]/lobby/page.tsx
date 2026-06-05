'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { AvatarPicker } from '@/components/game/AvatarPicker'
import { PlayerChip } from '@/components/game/PlayerChip'
import { useGameState } from '@/hooks/useGameState'

export default function LobbyPage() {
  const params = useParams()
  const router = useRouter()
  const code = params.code as string

  const { game, players, isOrganiser, loading } = useGameState(code)

  const [displayName, setDisplayName] = useState('')
  const [selectedAvatar, setSelectedAvatar] = useState<number | null>(null)
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard' | 'mixed'>('medium')
  const [roundCount, setRoundCount] = useState<3 | 5 | 10>(5)
  const [joining, setJoining] = useState(false)
  const [joined, setJoined] = useState(() => {
    if (typeof window === 'undefined') return false
    return !!localStorage.getItem(`quizzicle-player-${code}`)
  })
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [joinError, setJoinError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [fetchProgress, setFetchProgress] = useState(0)

  // Auto-navigate when game starts
  useEffect(() => {
    if (game?.status === 'round_active') {
      router.push(`/game/${code}/play`)
    }
  }, [game?.status, code, router])

  // Animate progress counter during game start — mirrors server's 1500 ms per-round cadence
  useEffect(() => {
    if (!starting) {
      setFetchProgress(0)
      return
    }
    const interval = setInterval(() => {
      setFetchProgress((prev) => Math.min(prev + 1, roundCount))
    }, 1500)
    return () => clearInterval(interval)
  }, [starting])

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
      setJoined(true)
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
        body: JSON.stringify({ organiserToken, difficulty, rounds: roundCount }),
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

  if (!loading && game && game.expires_at && new Date(game.expires_at) < new Date()) {
    return (
      <main className="min-h-screen bg-brand-dark flex items-center justify-center px-4">
        <div className="text-center">
          <p className="font-fredoka text-3xl text-brand-yellow mb-2">Game Expired</p>
          <p className="text-white/60 mb-6">This game code is no longer valid.</p>
          <a
            href="/"
            className="rounded-2xl bg-brand-purple px-8 py-3 font-fredoka text-xl text-white hover:bg-brand-purple/80 transition-colors"
          >
            Create a new game
          </a>
        </div>
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
        <div className="mt-2">
          <a
            href={`/game/${code}/spectate`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/40 text-sm underline hover:text-white/70 transition-colors"
          >
            Spectator view
          </a>
        </div>
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

      {/* Join form / confirmation */}
      {joined ? (
        <div className="bg-brand-card rounded-2xl p-6 flex flex-col items-center gap-3 text-center">
          <Image
            src={`https://api.dicebear.com/9.x/fun-emoji/svg?seed=${selectedAvatar}`}
            alt={displayName}
            width={80}
            height={80}
            className="rounded-full w-20 h-20"
          />
          <p className="font-fredoka text-2xl text-white">{displayName}</p>
          <p className="text-green-400 font-medium">✓ You&apos;re in!</p>
          <p className="text-white/50 text-sm">Waiting for the organiser to start…</p>
        </div>
      ) : (
        <div className="bg-brand-card rounded-2xl p-6 flex flex-col gap-4">
          {isOrganiser && (
            <p className="text-brand-yellow/80 text-sm text-center">
              You&apos;re the host — join as a player to compete too.
            </p>
          )}
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
      )}

      {/* Organiser controls */}
      {isOrganiser && (
        <div className="flex flex-col items-center gap-4">
          {/* Difficulty picker */}
          <div className="bg-brand-card rounded-2xl p-5 w-full">
            <p className="text-white/50 text-xs uppercase tracking-widest mb-3">Difficulty</p>
            <div className="grid grid-cols-4 gap-2">
              {(['easy', 'medium', 'hard', 'mixed'] as const).map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setDifficulty(level)}
                  className={`rounded-xl py-2 font-fredoka text-base capitalize transition-colors ${
                    difficulty === level
                      ? 'bg-brand-purple text-white'
                      : 'bg-white/10 text-white/60 hover:bg-white/20'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
            <p className="mt-2 text-white/30 text-xs">
              {difficulty === 'easy' && 'Straightforward questions — great for casual play'}
              {difficulty === 'medium' && 'A fair challenge for most players'}
              {difficulty === 'hard' && 'Tough questions for trivia experts'}
              {difficulty === 'mixed' && 'All difficulty levels shuffled together'}
            </p>
          </div>

          {isOrganiser && (
            <div className="bg-brand-card rounded-2xl p-5 w-full">
              <p className="text-white/60 text-sm font-fredoka mb-3">Number of Rounds</p>
              <div className="flex gap-2">
                {([3, 5, 10] as const).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRoundCount(n)}
                    className={`flex-1 rounded-xl py-2 font-fredoka text-base transition-colors ${
                      roundCount === n
                        ? 'bg-brand-purple text-white'
                        : 'bg-white/10 text-white/60 hover:bg-white/20'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <p className="text-white/40 text-xs mt-2">
                {roundCount * 10} questions · ~{roundCount * 3} mins
              </p>
            </div>
          )}

          <button
            type="button"
            disabled={starting}
            onClick={handleStart}
            className="rounded-2xl bg-brand-yellow px-10 py-4 font-fredoka text-2xl text-brand-dark hover:bg-brand-yellow/80 transition-colors disabled:opacity-60"
          >
            {starting
              ? fetchProgress > 0
                ? `Fetching round ${fetchProgress} of ${roundCount}…`
                : 'Loading questions…'
              : 'Start Game'}
          </button>

          {starting && (
            <div className="w-full max-w-xs h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-yellow rounded-full transition-all duration-500"
                style={{ width: `${(fetchProgress / roundCount) * 100}%` }}
              />
            </div>
          )}

          {error && <p className="text-red-400 text-sm">{error}</p>}
          <p className="text-white/40 text-xs">Only visible to organiser</p>
        </div>
      )}
    </main>
  )
}
