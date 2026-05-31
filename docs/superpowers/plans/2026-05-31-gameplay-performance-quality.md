# Gameplay, Performance & Code Quality Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the host/player UX confusion in the lobby, make Play Again create a new game directly, add a progress indicator during game start, and replace the fragile HTML entity decoder.

**Architecture:** Four independent changes across three files (`lobby/page.tsx`, `results/page.tsx`, `lib/game-utils.ts`). No new files. No database changes. No API changes. Each task can be committed independently.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind v4, `html-entities` (new dependency)

> **Pre-flight note:** The eslint-disable issues in `useCountdown` and `useGameState` listed in the spec were verified as already resolved in the current codebase — `calc()` is inlined in `useCountdown`, and `router` is already in `useGameState`'s dep array. Those tasks are not included here.

---

## Task 1: Replace `decodeHtmlEntities` with `html-entities`

**Files:**
- Modify: `lib/game-utils.ts`
- Modify: `package.json` + `package-lock.json` (new dependency)

The regex chain in `lib/game-utils.ts` misses named entities that don't appear in its explicit list (e.g. `&eacute;`, `&euro;`, `&times;`). The `html-entities` package handles all named and numeric entities and works in both Node.js (where this runs) and the browser.

- [ ] **Step 1: Install the package**

```bash
npm install html-entities
```

Expected output ends with: `added 1 package` (or similar — it has zero dependencies).

- [ ] **Step 2: Replace the function in `lib/game-utils.ts`**

Open [`lib/game-utils.ts`](../../lib/game-utils.ts). Replace the entire file contents with:

```ts
import { decode } from 'html-entities'

export const GAME_ROUNDS = 5
export const QUESTIONS_PER_ROUND = 10
export const QUESTION_TIME_MS = 15_000

/**
 * Generates a random 6-character uppercase alphanumeric game code.
 */
export function generateGameCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  while (code.length < 6) {
    const idx = Math.floor(Math.random() * chars.length)
    code += chars[idx]
  }
  return code
}

export const decodeHtmlEntities = decode

/**
 * Fisher-Yates in-place shuffle. Returns the same array (mutated).
 */
export function shuffleArray<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}
```

The function signature is identical — all call sites in `app/api/games/[code]/start/route.ts` continue to work unchanged.

- [ ] **Step 3: Verify the build passes**

```bash
npm run build
```

Expected: build completes with no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add lib/game-utils.ts package.json package-lock.json
git commit -m "refactor: replace decodeHtmlEntities regex chain with html-entities package"
```

---

## Task 2: Play Again creates a new game directly

**Files:**
- Modify: `app/game/[code]/results/page.tsx`

Currently the "Play Again" button calls `router.push('/')`, sending the user to the home screen where they must click "Create Game" again. This task makes the button create a game inline.

- [ ] **Step 1: Add `creating`/`createError` state and `handlePlayAgain` to `results/page.tsx`**

Open [`app/game/[code]/results/page.tsx`](../../app/game/%5Bcode%5D/results/page.tsx). Replace the entire file with:

```tsx
'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import confetti from 'canvas-confetti'
import { Leaderboard, LeaderboardEntry } from '@/components/game/Leaderboard'
import { useGameState } from '@/hooks/useGameState'

export default function ResultsPage() {
  const params = useParams()
  const router = useRouter()
  const code = params.code as string

  const { players, myPlayerId, loading } = useGameState(code)

  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  // Build and sort leaderboard
  const leaderboardEntries: LeaderboardEntry[] = players.map((p) => ({
    playerId: p.id,
    displayName: p.display_name,
    avatarId: p.avatar_id,
    totalScore: p.total_score,
    totalTimeMs: p.total_time_ms,
  }))

  const winner = leaderboardEntries[0]

  useEffect(() => {
    if (!winner) return
    let cancelled = false
    const end = Date.now() + 3000
    const frame = () => {
      if (cancelled || Date.now() > end) return
      confetti({
        particleCount: 6,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#6C3CF1', '#FFD600', '#ffffff'],
      })
      confetti({
        particleCount: 6,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#6C3CF1', '#FFD600', '#ffffff'],
      })
      requestAnimationFrame(frame)
    }
    requestAnimationFrame(frame)
    return () => { cancelled = true }
  }, [winner?.playerId])

  async function handlePlayAgain() {
    setCreating(true)
    setCreateError(null)
    try {
      const res = await fetch('/api/games', { method: 'POST' })
      if (!res.ok) throw new Error('Failed to create game')
      const { code: newCode, organiserToken } = await res.json()
      localStorage.setItem(`quizzicle-organiser-${newCode}`, organiserToken)
      router.push(`/game/${newCode}/lobby`)
    } catch {
      setCreateError('Could not create game — please try again.')
      setCreating(false)
    }
  }

  if (loading || !winner) {
    return (
      <main className="min-h-screen bg-brand-dark flex items-center justify-center">
        <p className="text-white/50 font-fredoka text-2xl">Loading results…</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-brand-dark flex flex-col items-center px-4 py-12 gap-8">
      <div className="text-center">
        <h1 className="font-fredoka text-5xl text-brand-yellow mb-2">Game Over!</h1>
        <p className="text-white/60 text-lg">Final Results</p>
      </div>

      {/* Winner spotlight */}
      <div className="bg-brand-card rounded-2xl p-6 text-center border border-white/10 w-full max-w-sm">
        <p className="text-white/50 text-sm mb-3">🏆 Champion</p>
        <Image
          src={`https://api.dicebear.com/9.x/fun-emoji/svg?seed=${winner.avatarId}`}
          alt={winner.displayName}
          width={128}
          height={128}
          className="rounded-full w-32 h-32 mx-auto mb-3 ring-4 ring-brand-yellow"
        />
        <p className="font-fredoka text-3xl text-white">{winner.displayName}</p>
        <p className="font-fredoka text-2xl text-brand-yellow mt-1">
          {winner.totalScore.toLocaleString()} pts
        </p>
      </div>

      <Leaderboard entries={leaderboardEntries} highlightPlayerId={myPlayerId ?? undefined} />

      {createError && (
        <p className="text-red-400 text-sm">{createError}</p>
      )}

      <button
        type="button"
        disabled={creating}
        onClick={handlePlayAgain}
        className="mt-4 rounded-2xl bg-brand-purple px-10 py-4 font-fredoka text-2xl text-white hover:bg-brand-purple/80 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {creating ? 'Creating…' : 'Play Again'}
      </button>
    </main>
  )
}
```

- [ ] **Step 2: Verify the build passes**

```bash
npm run build
```

Expected: no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add app/game/\[code\]/results/page.tsx
git commit -m "feat: Play Again creates a new game directly instead of going to home"
```

---

## Task 3: Host + Player lobby hint

**Files:**
- Modify: `app/game/[code]/lobby/page.tsx`

The organiser sees the join form alongside the Start Game controls but nothing explains they can (or should) join as a player. This adds a single hint line inside the join form card that only appears when `isOrganiser && !joined`.

- [ ] **Step 1: Add the host hint inside the join form**

Open [`app/game/[code]/lobby/page.tsx`](../../app/game/%5Bcode%5D/lobby/page.tsx). Find the `{/* Join form / confirmation */}` comment and replace the entire `joined ? ... : ...` expression with the block below. The only change is the new `{isOrganiser && (...)}` paragraph before the `<h2>` — everything else is identical to the current code:

```tsx
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
```

- [ ] **Step 2: Verify the build passes**

```bash
npm run build
```

Expected: no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add app/game/\[code\]/lobby/page.tsx
git commit -m "feat: show host hint above join form so organiser knows they can play"
```

---

## Task 4: Game start progress indicator

**Files:**
- Modify: `app/game/[code]/lobby/page.tsx`

The "Start Game" button freezes on "Loading questions…" for 7.5–12.5 seconds with no feedback. This adds a `fetchProgress` counter that increments every 1,500 ms (matching the server's inter-round delay) and a progress bar.

- [ ] **Step 1: Add `GAME_ROUNDS` import**

Open [`app/game/[code]/lobby/page.tsx`](../../app/game/%5Bcode%5D/lobby/page.tsx). Add the import for `GAME_ROUNDS` from game-utils. The file currently has no imports from `@/lib/game-utils` — add this line with the other imports at the top:

```tsx
import { GAME_ROUNDS } from '@/lib/game-utils'
```

- [ ] **Step 2: Add `fetchProgress` state**

In the state declarations block (alongside `starting`, `error`, `copied`, etc.), add:

```tsx
const [fetchProgress, setFetchProgress] = useState(0)
```

- [ ] **Step 3: Add the interval effect**

Add this `useEffect` block alongside the other effects (e.g. after the `useEffect` that auto-navigates when `game?.status === 'round_active'`):

```tsx
// Animate progress counter during game start — mirrors server's 1500 ms per-round cadence
useEffect(() => {
  if (!starting) {
    setFetchProgress(0)
    return
  }
  const interval = setInterval(() => {
    setFetchProgress((prev) => Math.min(prev + 1, GAME_ROUNDS))
  }, 1500)
  return () => clearInterval(interval)
}, [starting])
```

- [ ] **Step 4: Update the Start Game button and add progress bar**

Find the Start Game button in the organiser controls section. It currently reads:

```tsx
<button
  type="button"
  disabled={starting}
  onClick={handleStart}
  className="rounded-2xl bg-brand-yellow px-10 py-4 font-fredoka text-2xl text-brand-dark hover:bg-brand-yellow/80 transition-colors disabled:opacity-60"
>
  {starting ? 'Loading questions…' : 'Start Game'}
</button>
```

Replace it (and add the progress bar immediately after):

```tsx
<button
  type="button"
  disabled={starting}
  onClick={handleStart}
  className="rounded-2xl bg-brand-yellow px-10 py-4 font-fredoka text-2xl text-brand-dark hover:bg-brand-yellow/80 transition-colors disabled:opacity-60"
>
  {starting
    ? fetchProgress > 0
      ? `Fetching round ${fetchProgress} of ${GAME_ROUNDS}…`
      : 'Loading questions…'
    : 'Start Game'}
</button>

{starting && (
  <div className="w-full max-w-xs h-2 bg-white/10 rounded-full overflow-hidden">
    <div
      className="h-full bg-brand-yellow rounded-full transition-all duration-500"
      style={{ width: `${(fetchProgress / GAME_ROUNDS) * 100}%` }}
    />
  </div>
)}
```

- [ ] **Step 5: Verify the build passes**

```bash
npm run build
```

Expected: no TypeScript errors.

- [ ] **Step 6: Commit**

```bash
git add app/game/\[code\]/lobby/page.tsx
git commit -m "feat: show round-by-round progress indicator during game start"
```

---

## Verification checklist (run after all tasks)

Start the dev server and walk through these scenarios manually:

```bash
npm run dev
```

1. **html-entities**: Start a game and play through a round. Questions with accented characters (common in Geography/Literature) should render correctly with no visible `&eacute;` or similar entity codes.

2. **Play Again**: Navigate to the results page (or complete a game). Click "Play Again" — the button should show "Creating…" briefly then redirect to a new lobby URL with a different game code. The new lobby should behave normally.

3. **Host hint**: Create a game from the home page and open the lobby. Confirm the yellow hint "You're the host — join as a player to compete too." appears above the join form. Fill in a name, pick an avatar, click Join — confirm the "You're in!" confirmation card appears and the Start Game controls remain visible below it.

4. **Progress indicator**: As organiser in the lobby, click Start Game. Confirm the button immediately shows "Loading questions…", then after ~1.5 s changes to "Fetching round 1 of 5…", then "Fetching round 2 of 5…", etc. Confirm the yellow progress bar fills incrementally.
