'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LoadScreen } from '@/components/game/LoadScreen'

const LOADED_KEY = 'quizzicle-loaded'

export default function Home() {
  const router = useRouter()
  const [showLoad, setShowLoad] = useState(false)
  const [ready, setReady] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const alreadyLoaded = sessionStorage.getItem(LOADED_KEY)
    if (alreadyLoaded) {
      setReady(true)
    } else {
      setShowLoad(true)
    }
  }, [])

  function handleLoadComplete() {
    sessionStorage.setItem(LOADED_KEY, '1')
    setTimeout(() => {
      setShowLoad(false)
      setReady(true)
    }, 500)
  }

  async function handleCreateGame() {
    setCreating(true)
    setError(null)
    try {
      const res = await fetch('/api/games', { method: 'POST' })
      if (!res.ok) throw new Error('Failed to create game')
      const { code, organiserToken } = await res.json()
      localStorage.setItem(`quizzicle-organiser-${code}`, organiserToken)
      router.push(`/game/${code}/lobby?organiser=${organiserToken}`)
    } catch (err) {
      setError('Could not create game — please try again.')
      setCreating(false)
    }
  }

  return (
    <>
      {showLoad && <LoadScreen onComplete={handleLoadComplete} />}

      {ready && (
        <main className="min-h-screen flex flex-col items-center justify-center gap-6 px-4 bg-brand-dark">
          <h1 className="font-fredoka text-6xl text-brand-yellow">
            ⚡ Quizzicle
          </h1>
          <p className="text-white/70 text-xl text-center">
            The ultimate quiz showdown
          </p>

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

          <button
            type="button"
            disabled={creating}
            onClick={handleCreateGame}
            className="mt-2 rounded-2xl bg-brand-purple px-10 py-4 font-fredoka text-2xl text-white hover:bg-brand-purple/80 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {creating ? 'Creating…' : 'Create Game'}
          </button>
        </main>
      )}
    </>
  )
}
