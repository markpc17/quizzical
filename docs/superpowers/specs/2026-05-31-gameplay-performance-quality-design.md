# Quizzicle — Gameplay, Performance & Code Quality

**Date:** 2026-05-31  
**Status:** Approved  
**Scope:** Three focused improvement areas — gameplay feel, game-start performance, code quality

---

## 1. Gameplay Changes

### 1a. Host + Player lobby

**Problem:** The organiser lands in the lobby and sees both the join form and the Start Game controls simultaneously with no explanation that they can (or should) join as a player. This is confusing — it's unclear whether the join form applies to them.

**Design:**
- When `isOrganiser && !joined`: render a small hint above the join form — "You're the host — join as a player to compete too."
- The Start Game controls (difficulty picker + button) remain visible to the organiser at all times, whether or not they have joined. The organiser can start without playing if they choose.
- After the organiser submits the join form and `joined` becomes `true`, they see the same "You're in!" confirmation card as any other player, with the Start Game controls rendered below it.
- No database changes. No new state. The `isOrganiser` and `joined` states that already exist are sufficient.

**Files affected:**
- `app/game/[code]/lobby/page.tsx` — add hint label, reorder JSX so organiser controls follow the join confirmation

### 1b. Play Again

**Problem:** The "Play Again" button on the results page navigates to `/` (home), requiring the organiser to click "Create Game" again — an unnecessary extra step.

**Design:**
- Replace `router.push('/')` with an inline `handlePlayAgain` function that:
  1. Calls `POST /api/games`
  2. Stores the returned `organiserToken` in `localStorage` under `quizzicle-organiser-${newCode}`
  3. Navigates to `/game/${newCode}/lobby`
- The button shows "Creating…" while the request is in flight (disabled state).
- On error, show an inline error message and re-enable the button.
- This mirrors the `handleCreateGame` function in `app/page.tsx` exactly — ~10 lines.

**Files affected:**
- `app/game/[code]/results/page.tsx` — replace `router.push('/')` with the new handler, add `creating`/`error` state

---

## 2. Performance — Game Start Progress Indicator

**Problem:** Fetching 5 rounds from OpenTDB takes 7.5–12.5 seconds (1,500 ms enforced gap between requests, plus a possible 5 s rate-limit retry). After clicking "Start Game" the UI is frozen on "Loading questions…" with no indication of progress.

**Design:**
- Add a `fetchProgress` state (integer 0–5) to the lobby component.
- When `starting` becomes `true`, start a `setInterval` at 1,500 ms that increments `fetchProgress` up to a maximum of 5. Clear the interval when `starting` becomes `false` or the component unmounts.
- Update the Start Game button label to show `fetchProgress > 0 ? \`Fetching round ${fetchProgress} of 5…\` : 'Loading questions…'`.
- Add a simple progress bar below the button:
  - Width proportional to `fetchProgress / 5` (0–100%)
  - Tailwind `transition-all` for smooth fill
  - Hidden when `fetchProgress === 0` or `!starting`
- The interval mirrors the server's actual cadence, so the counter is accurate in the common case. On a rare rate-limit retry (5 s server pause) the counter pauses then resumes — still far better than a frozen screen.
- No API changes. Purely additive UI state in the lobby component.

**Files affected:**
- `app/game/[code]/lobby/page.tsx` — add `fetchProgress` state, interval effect, updated button label and progress bar JSX

---

## 3. Code Quality

### 3a. Fix eslint-disable in `useCountdown`

**Problem:** `getRemaining` is defined inside the hook and used in a `useEffect`, but excluded from the dependency array via `eslint-disable`. This hides a real stale-closure risk.

**Fix:** Inline the calculation from `getRemaining` directly into the `useEffect` body, eliminating the need for the suppression entirely.

**Files affected:**
- `hooks/useCountdown.ts`

### 3b. Fix eslint-disable in `useGameState`

**Problem:** `router` (from `useRouter()`) is used inside `init()` but omitted from the `useEffect` dependency array. In Next.js App Router, `useRouter()` returns a stable reference, so adding `router` to the dep array is both safe and correct.

**Fix:** Add `router` to the `useEffect` dependency array at the bottom of the initial-fetch effect. Remove the suppression comment.

**Files affected:**
- `hooks/useGameState.ts`

### 3c. Replace `decodeHtmlEntities` with `html-entities`

**Problem:** The current regex chain in `lib/game-utils.ts` handles only explicitly listed named entities and misses others (e.g. `&eacute;`, `&euro;`, `&times;`) that appear in OpenTDB questions. The function runs server-side, so `DOMParser` is not available.

**Fix:**
- Install `html-entities` (~5 KB, zero dependencies, works in both Node.js and browser).
- Replace the function body with a single `decode()` call:
  ```ts
  import { decode } from 'html-entities'
  export const decodeHtmlEntities = decode
  ```
- The function signature is unchanged — no call sites need updating.

**Files affected:**
- `lib/game-utils.ts`
- `package.json` / lockfile (new dependency)

---

## Out of Scope

The following were considered and deliberately excluded from this spec:

- **Rejoin support** — requires a new UI flow and session reconciliation logic; separate spec needed.
- **Game expiry** — a Supabase scheduled function or RLS policy; infrastructure concern, separate task.
- **Category selection UI** — meaningful feature addition; separate spec.
- **`useGameState` hook split** — the hook is large but coherent; splitting it creates refactor risk without clear user-facing value at this stage.
