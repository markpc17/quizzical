# Gameplay Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop questions repeating across games, cap niche categories at one per game, and shrink the question timer to 5 s when only one player hasn't answered.

**Architecture:** Three independent fixes per the approved spec (`docs/superpowers/specs/2026-06-09-gameplay-improvements-design.md`). Fix 1 round-trips an OpenTDB session token through the organiser's localStorage. Fix 2 splits the category pool into mainstream/niche tiers in the start route. Fix 3 adds a server-set `closes_at` deadline on questions that all clients pick up over the existing Supabase realtime subscription.

**Tech Stack:** Next.js 16 App Router (read `node_modules/next/dist/docs/` before writing code — this version has breaking changes), Supabase (Postgres + realtime), TypeScript, OpenTDB API.

**Testing note:** This project has no test framework (no test script in `package.json`) and prior plans verify manually. Each task verifies with `npm run lint`, a type-check via `npx tsc --noEmit`, and targeted manual checks; Task 7 is the full two-browser walkthrough.

---

### Task 1: `closes_at` column and type

**Files:**
- Create: `supabase/migrations/006_question_closes_at.sql`
- Modify: `lib/supabase/types.ts` (Question interface, ~line 34-42)

- [ ] **Step 1: Write the migration**

```sql
-- 006_question_closes_at.sql
-- Early-close deadline for a question, set when all but one player has answered.
-- NULL means the question runs its full QUESTION_TIME_MS.
ALTER TABLE questions ADD COLUMN closes_at timestamptz;
```

- [ ] **Step 2: Apply the migration**

Apply the same way previous migrations were applied (check `supabase/README.md`): either `supabase db push`, or paste the SQL into the Supabase dashboard SQL editor.

Verify: in the SQL editor run `SELECT closes_at FROM questions LIMIT 1;` — expect no "column does not exist" error.

- [ ] **Step 3: Add the field to the Question type**

In `lib/supabase/types.ts`, the `Question` interface currently ends with `opened_at: string | null` (line 41). Add directly after it:

```ts
  closes_at: string | null
```

- [ ] **Step 4: Lint and type-check**

Run: `npm run lint && npx tsc --noEmit`
Expected: both pass (the new field is additive; nothing reads it yet).

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/006_question_closes_at.sql lib/supabase/types.ts
git commit -m "feat: add closes_at column for early question close"
```

---

### Task 2: Server trigger — set `closes_at` when one straggler remains

**Files:**
- Modify: `app/api/games/[code]/answer/route.ts:154-213` (the fire-and-forget auto-advance block)

- [ ] **Step 1: Add the shrink branch**

In the background block, the current code is:

```ts
      if ((playerCount ?? 0) > 0 && (answerCount ?? 0) >= (playerCount ?? 1)) {
        // ... existing advance logic, unchanged ...
      }
```

Add an `else if` after that whole `if` block (inside the same try, before the `catch`):

```ts
      } else if (
        (playerCount ?? 0) >= 2 &&
        (answerCount ?? 0) === (playerCount ?? 0) - 1 &&
        question.opened_at
      ) {
        // Exactly one player hasn't answered — close the question early.
        // Only shrink when meaningful time remains, and never extend.
        const remainingMs =
          new Date(question.opened_at).getTime() + MAX_TIME_MS - Date.now()
        if (remainingMs > 7000) {
          await supabase
            .from('questions')
            .update({ closes_at: new Date(Date.now() + 5000).toISOString() })
            .eq('id', questionId)
            .is('closes_at', null)
        }
      }
```

Notes for the implementer:
- `question.opened_at` was already validated non-null earlier in the route (it returns 409 otherwise), but the guard keeps TypeScript happy.
- `.is('closes_at', null)` makes concurrent answer submissions idempotent — only the first sets the deadline.
- `MAX_TIME_MS` is already defined at the top of this file as `QUESTION_TIME_MS`.

- [ ] **Step 2: Lint and type-check**

Run: `npm run lint && npx tsc --noEmit`
Expected: pass.

- [ ] **Step 3: Manual smoke check**

Start the dev server. Create a game with 2 players (two browser profiles), start it, answer with one player only. In the Supabase table editor, confirm the current question row gets a `closes_at` ~5 s in the future. (Clients don't react yet — that's Task 3.)

- [ ] **Step 4: Commit**

```bash
git add 'app/api/games/[code]/answer/route.ts'
git commit -m "feat: close question early when only one player remains"
```

---

### Task 3: Clients honour the effective deadline

**Files:**
- Modify: `app/game/[code]/play/page.tsx` (timer at line 31, music effect at 95-101, organiser advance at 166-181, `questionDurationSec` at line 198)

No change is needed in `hooks/useCountdown.ts` (it already recomputes when `totalMs` changes) or `hooks/useGameState.ts` (the realtime question-UPDATE handler already replaces `currentQuestion` with the full updated row, which now carries `closes_at`).

- [ ] **Step 1: Compute the effective duration**

In `app/game/[code]/play/page.tsx`, ensure `useMemo` is in the React import, then replace line 31:

```ts
const remaining = useCountdown(currentQuestion?.opened_at ?? null, QUESTION_TIME_MS)
```

with:

```ts
  // closes_at (set server-side when one straggler remains) caps the timer
  const effectiveTotalMs = useMemo(() => {
    if (!currentQuestion?.opened_at || !currentQuestion.closes_at) return QUESTION_TIME_MS
    const opened = new Date(currentQuestion.opened_at).getTime()
    const closes = new Date(currentQuestion.closes_at).getTime()
    return Math.max(0, Math.min(QUESTION_TIME_MS, closes - opened))
  }, [currentQuestion?.opened_at, currentQuestion?.closes_at])

  const remaining = useCountdown(currentQuestion?.opened_at ?? null, effectiveTotalMs)
```

- [ ] **Step 2: Reschedule the countdown music on shrink**

Replace the music effect (lines 95-101):

```ts
  // Start countdown music when a new question opens — restarted with a shorter
  // duration if the server closes the question early (closes_at appears)
  useEffect(() => {
    if (currentQuestion?.opened_at) {
      startCountdownMusic(currentQuestion.opened_at, effectiveTotalMs)
    }
    return () => stopMusic()
  }, [currentQuestion?.id, currentQuestion?.opened_at, effectiveTotalMs, startCountdownMusic, stopMusic])
```

(`startCountdownMusic` is documented as safe to call mid-question — it picks up from the elapsed position, and the shortened total automatically engages the urgent tick phase in the final 5 s.)

- [ ] **Step 3: Organiser advance uses the effective deadline**

In the organiser auto-advance effect (lines 166-181), replace:

```ts
    const advanceAt = openedAt + QUESTION_TIME_MS + 3000
```

with:

```ts
    const advanceAt = openedAt + effectiveTotalMs + 3000
```

and add `effectiveTotalMs` to that effect's dependency array.

- [ ] **Step 4: Progress display uses the effective duration**

Replace line 198:

```ts
  const questionDurationSec = QUESTION_TIME_MS / 1000
```

with:

```ts
  const questionDurationSec = effectiveTotalMs / 1000
```

`QUESTION_TIME_MS` remains imported from `@/lib/game-utils` — it is still used inside `effectiveTotalMs`.

- [ ] **Step 5: Lint and type-check**

Run: `npm run lint && npx tsc --noEmit`
Expected: pass — pay attention to react-hooks/exhaustive-deps warnings on the two modified effects; fix deps rather than suppressing.

- [ ] **Step 6: Manual verification (two browsers)**

With the dev server running, organiser + one player:
1. Player A answers at ~3 s elapsed. Player B's timer should visibly snap to 5 s; both hear the urgent tick phase.
2. Player B answers within the 5 s → instant advance (existing behaviour).
3. Player B lets it expire → auto-submit fires at the shrunk deadline, organiser advances ~3 s later.
4. Solo game (1 player): no shrink ever occurs; answering advances immediately.

- [ ] **Step 7: Commit**

```bash
git add 'app/game/[code]/play/page.tsx'
git commit -m "feat: snap all timers to server early-close deadline"
```

---

### Task 4: Two-tier category pool

**Files:**
- Modify: `app/api/games/[code]/start/route.ts:27-42` (`QUIZ_CATEGORIES`) and `:129-131` (candidate selection)

- [ ] **Step 1: Split the pool**

Replace the `QUIZ_CATEGORIES` constant (lines 23-42 including its comment) with:

```ts
/**
 * Category pool, split into tiers. Each game takes rounds − 1 mainstream
 * categories plus one niche wildcard (two for 10-round games, since only
 * 8 mainstream categories exist). Mapped to OpenTDB category IDs.
 */
const MAINSTREAM_CATEGORIES: QuizCategory[] = [
  { id: 22, name: 'Geography' },
  { id: 23, name: 'History' },
  { id: 17, name: 'Science & Nature' },
  { id: 26, name: 'Pop Culture' },
  { id: 12, name: 'Music' },
  { id: 11, name: 'Film & TV' },
  { id: 21, name: 'Sports' },
  { id: 18, name: 'Technology' },
]

const NICHE_CATEGORIES: QuizCategory[] = [
  { id: 10, name: 'Literature' },
  { id: 25, name: 'Art & Architecture' },
  { id: 20, name: 'Mythology' },
  { id: 24, name: 'Politics & World Affairs' },
  { id: 28, name: 'Cars & Transport' },
  { id: 27, name: 'Animals & Wildlife' },
]
```

- [ ] **Step 2: Tiered candidate selection**

Replace the current selection (lines 129-131):

```ts
  const categoryPool = [...QUIZ_CATEGORIES]
  shuffleArray(categoryPool)
  const candidates = categoryPool.slice(0, rounds + 3) // extra candidates in case some fail
```

with:

```ts
  const mainstream = shuffleArray([...MAINSTREAM_CATEGORIES])
  const niche = shuffleArray([...NICHE_CATEGORIES])
  // 1 niche wildcard per game; 10-round games need 2 (only 8 mainstream exist)
  const nicheCount = Math.max(1, rounds - mainstream.length)
  const primary = shuffleArray([
    ...mainstream.slice(0, rounds - nicheCount),
    ...niche.slice(0, nicheCount),
  ])
  // Padding (mainstream first) absorbs per-category fetch failures
  const padding = [...mainstream.slice(rounds - nicheCount), ...niche.slice(nicheCount)]
  const candidates = [...primary, ...padding].slice(0, rounds + 3)
```

The downstream loop already selects the first `rounds` successful fetches in candidate order, so mainstream padding is preferred when a primary category fails.

- [ ] **Step 3: Lint and type-check**

Run: `npm run lint && npx tsc --noEmit`
Expected: pass; `QUIZ_CATEGORIES` no longer referenced anywhere (`grep -rn QUIZ_CATEGORIES app/` returns nothing).

- [ ] **Step 4: Manual verification**

Start 4-5 games (5 rounds each) via the dev server. Each game's round list (visible on round-end screens or in the `rounds` table) should contain exactly one of: Literature, Art & Architecture, Mythology, Politics & World Affairs, Cars & Transport, Animals & Wildlife — assuming no API failures. Start one 10-round game and expect two niche categories.

- [ ] **Step 5: Commit**

```bash
git add 'app/api/games/[code]/start/route.ts'
git commit -m "feat: cap niche categories at one wildcard per game"
```

---

### Task 5: Server-side OpenTDB token reuse

**Files:**
- Modify: `app/api/games/[code]/start/route.ts` (body parsing ~line 74-87, `fetchQuestionsForCategory` lines 44-66, token request lines 117-127, fetch loop lines 133-154, final response line 219)

- [ ] **Step 1: Extract a token-request helper**

Above `fetchQuestionsForCategory`, add:

```ts
async function requestOpenTDBToken(): Promise<string | undefined> {
  try {
    const res = await fetch('https://opentdb.com/api_token.php?command=request', { cache: 'no-store' })
    if (!res.ok) return undefined
    const json = (await res.json()) as { token?: string }
    return json.token
  } catch {
    return undefined
  }
}
```

- [ ] **Step 2: Make `fetchQuestionsForCategory` report token state**

Replace the whole function (lines 44-66) with:

```ts
interface CategoryFetchOutcome {
  questions: OpenTDBQuestion[] | null
  tokenExpired: boolean
}

async function fetchQuestionsForCategory(
  categoryId: number,
  difficulty: string,
  sessionToken?: string
): Promise<CategoryFetchOutcome> {
  const diffParam = difficulty !== 'mixed' ? `&difficulty=${difficulty}` : ''
  const tokenParam = sessionToken ? `&token=${sessionToken}` : ''
  const url = `https://opentdb.com/api.php?amount=${QUESTIONS_PER_ROUND}&category=${categoryId}&type=multiple${diffParam}${tokenParam}`

  const attempt = async (u: string): Promise<OpenTDBQuestionsResponse | null> => {
    const res = await fetch(u, { cache: 'no-store' })
    if (!res.ok) return null
    return (await res.json()) as OpenTDBQuestionsResponse
  }

  let json = await attempt(url)
  // response_code 5 = rate limited — wait and retry once
  if (json?.response_code === 5) {
    await new Promise((resolve) => setTimeout(resolve, 5000))
    json = await attempt(url)
  }
  // response_code 3 = token not found/expired — caller refreshes and refetches
  if (json?.response_code === 3) {
    return { questions: null, tokenExpired: true }
  }
  // response_code 4 = pool exhausted for this token+category — a repeat beats a failed start
  if (json?.response_code === 4 && tokenParam) {
    json = await attempt(url.replace(tokenParam, ''))
  }
  if (!json || json.response_code !== 0 || json.results.length < QUESTIONS_PER_ROUND) {
    return { questions: null, tokenExpired: false }
  }
  return { questions: json.results, tokenExpired: false }
}
```

- [ ] **Step 3: Accept, reuse, and refresh the token in the handler**

Parse the new body field (the destructuring at lines 75-79):

```ts
  const { organiserToken, difficulty: rawDifficulty, rounds: rawRounds, opentdbToken: rawToken } = body as {
    organiserToken?: unknown
    difficulty?: unknown
    rounds?: unknown
    opentdbToken?: unknown
  }
```

Replace the token-request block (lines 117-127) with:

```ts
  // Reuse the organiser's OpenTDB session token so questions don't repeat
  // across games; request a fresh one if none was provided.
  let sessionToken = typeof rawToken === 'string' && rawToken ? rawToken : undefined
  if (!sessionToken) {
    sessionToken = await requestOpenTDBToken()
  }
```

Replace the fetch block (lines 133-139) and the selection loop (lines 141-154) with:

```ts
  const fetchAll = (token?: string) =>
    Promise.all(
      candidates.map((category) =>
        fetchQuestionsForCategory(category.id, difficulty, token)
          .then((outcome) => ({ category, outcome }))
          .catch(() => ({ category, outcome: { questions: null, tokenExpired: false } }))
      )
    )

  let fetchResults = await fetchAll(sessionToken)

  // An expired token (6 idle hours) fails every category — refresh once and refetch
  if (fetchResults.some((r) => r.outcome.tokenExpired)) {
    sessionToken = await requestOpenTDBToken()
    fetchResults = await fetchAll(sessionToken)
  }

  const selectedRounds: Array<{ category: QuizCategory; questions: OpenTDBQuestion[] }> = []
  for (const result of fetchResults) {
    if (selectedRounds.length >= rounds) break
    if (result.outcome.questions && result.outcome.questions.length >= QUESTIONS_PER_ROUND) {
      selectedRounds.push({
        category: result.category,
        questions: result.outcome.questions.slice(0, QUESTIONS_PER_ROUND),
      })
    }
  }
```

- [ ] **Step 4: Return the token in the success response**

Replace the final `return NextResponse.json({ ok: true })` (line 219) with:

```ts
  return NextResponse.json({ ok: true, opentdbToken: sessionToken ?? null })
```

- [ ] **Step 5: Lint and type-check**

Run: `npm run lint && npx tsc --noEmit`
Expected: pass.

- [ ] **Step 6: Commit**

```bash
git add 'app/api/games/[code]/start/route.ts'
git commit -m "feat: reuse OpenTDB session token across games"
```

---

### Task 6: Client-side token round-trip

**Files:**
- Modify: `app/game/[code]/lobby/page.tsx:79-100` (`handleStart`)

- [ ] **Step 1: Send and persist the token**

Replace `handleStart`:

```ts
  async function handleStart() {
    setStarting(true)
    setError(null)
    try {
      const organiserToken = localStorage.getItem(`quizzicle-organiser-${code}`)
      // Per-device OpenTDB token prevents question repeats across games
      const opentdbToken = localStorage.getItem('quizzicle-opentdb-token')
      const res = await fetch(`/api/games/${code}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organiserToken, difficulty, rounds: roundCount, opentdbToken }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Failed to start game')
        setStarting(false)
        return
      }
      const data = (await res.json().catch(() => null)) as { opentdbToken?: string | null } | null
      if (data?.opentdbToken) {
        localStorage.setItem('quizzicle-opentdb-token', data.opentdbToken)
      }
      // Realtime update will drive navigation via the useEffect above
    } catch {
      setError('Failed to start game')
      setStarting(false)
    }
  }
```

- [ ] **Step 2: Lint and type-check**

Run: `npm run lint && npx tsc --noEmit`
Expected: pass.

- [ ] **Step 3: Manual verification**

Start a game; in DevTools → Application → Local Storage confirm `quizzicle-opentdb-token` is set. Start a second game from the same device; in the Network tab confirm the `/start` request body includes the same token, and the response echoes it.

- [ ] **Step 4: Commit**

```bash
git add 'app/game/[code]/lobby/page.tsx'
git commit -m "feat: persist OpenTDB token in organiser localStorage"
```

---

### Task 7: Full manual verification

**Files:** none (verification only)

- [ ] **Step 1: Two-browser walkthrough**

Dev server running, organiser profile + player profile:
1. **Timer shrink:** player answers early → organiser's timer snaps to 5 s (and vice versa); urgent tick audio phase engages; round still advances instantly when both answer.
2. **Categories:** across 3 game starts, each 5-round game has exactly 1 niche category.
3. **Repeats:** play two consecutive short games (3 rounds, same difficulty) on the same device; spot-check that no question text repeats between the games.

- [ ] **Step 2: Build check**

Run: `npm run build`
Expected: production build succeeds.

- [ ] **Step 3: Report results**

Report each of the three checks with pass/fail and any anomalies before merging or pushing.
