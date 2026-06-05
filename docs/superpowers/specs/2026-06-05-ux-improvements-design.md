# UX Improvements Design

**Date:** 2026-06-05
**Status:** Approved

Three improvements based on player feedback: game length info on the landing page, auto-advance when all players have answered, and configurable round count.

---

## 1. Landing Page Game Length Info

**Change:** Add a single descriptive line to `app/page.tsx` below the existing tagline.

```
The ultimate quiz showdown
5 rounds · 10 questions each · ~15 mins
```

The second line uses `text-white/50` to sit quietly below the tagline without competing with it. When configurable rounds ship (Feature 3), this line remains static — the lobby is where the organiser picks the round count.

**File:** `app/page.tsx` — add one `<p>` element.

---

## 2. Auto-Advance When All Players Have Answered

**Problem:** After a player answers, they wait out the full 15-second countdown even though everyone has already submitted.

**Approach:** After successfully recording an answer in `app/api/games/[code]/answer/route.ts`, check whether every player in the game has now answered the current question. If yes, immediately execute the same advance logic that the auto-advance timer uses — inline, no HTTP round-trip.

**Concurrency safety:** The existing `/next` route uses optimistic locking (`eq('current_question', game.current_question).eq('status', 'round_active')`). The auto-advance from the answer route uses the same pattern. If two answers arrive simultaneously and both trigger the advance, only one DB update succeeds — the other sees 0 rows updated and returns early silently.

**All-answered check:**
- Count `answers` rows where `question_id = currentQuestionId`
- Count `players` rows where `game_id = game.id`
- If answer count >= player count: trigger advance

**Advance logic to inline (mirrors next/route.ts):**
- Not last question in round → set `opened_at` on next question + increment `current_question` (optimistic lock)
- Last question of round, not last round → set `status = 'round_end'`, `current_question = 0` (optimistic lock)
- Last question of last round → set `status = 'finished'` (optimistic lock)
- Lock miss (0 rows updated) → silently return, another call already advanced

The route needs `game.total_rounds` (from Feature 3) to know when the last round is reached.

**Files:**
- Modify: `app/api/games/[code]/answer/route.ts`

---

## 3. Configurable Round Count

**Options:** 3, 5, or 10 rounds. Chosen by the organiser in the lobby before starting. Default: 5.

### DB migration

`supabase/migrations/005_total_rounds.sql`:
```sql
ALTER TABLE games ADD COLUMN IF NOT EXISTS total_rounds INT NOT NULL DEFAULT 5;
```

### Type changes

`lib/supabase/types.ts`: add `total_rounds: number` to `Game`; add `total_rounds?: number` to `GamesInsert`.

### Lobby UI

Add a round count picker in `app/game/[code]/lobby/page.tsx`, below the difficulty picker, visible to the organiser only. Three pill buttons: **3 rounds · 5 rounds · 10 rounds**. Default: 5. Styled to match the existing difficulty picker. Selected value passed to the start handler.

### Start route

`app/api/games/[code]/start/route.ts`:
- Accept `rounds` in request body (validate: must be 3, 5, or 10; default 5 if absent/invalid)
- Use `rounds` instead of `GAME_ROUNDS` constant when slicing candidates and checking counts
- After inserting rounds/questions, update the game row: `.update({ ..., total_rounds: rounds })`

### Next route

`app/api/games/[code]/next/route.ts`:
- Fetch `total_rounds` alongside existing game fields
- Replace `current_round < GAME_ROUNDS` with `current_round < game.total_rounds`

### Progress display

`app/game/[code]/play/page.tsx` and `app/game/[code]/round-end/page.tsx`: update any "Round X of 5" text to use `game.total_rounds` dynamically.

---

## Implementation Order

1. **Feature 3** (configurable rounds) — adds `total_rounds` to the DB and all routes
2. **Feature 2** (auto-advance) — reads `total_rounds` when deciding game-over
3. **Feature 1** (landing page info) — independent, trivial, done last

---

## File Map

| File | Change |
|------|--------|
| `supabase/migrations/005_total_rounds.sql` | Create |
| `lib/supabase/types.ts` | Add `total_rounds` to `Game` + `GamesInsert` |
| `app/api/games/[code]/start/route.ts` | Accept + store `rounds` param |
| `app/api/games/[code]/next/route.ts` | Use `game.total_rounds` instead of `GAME_ROUNDS` |
| `app/api/games/[code]/answer/route.ts` | Add all-answered check + inline advance |
| `app/game/[code]/lobby/page.tsx` | Add round count picker (organiser only) |
| `app/game/[code]/play/page.tsx` | Show "Round X of Y" |
| `app/game/[code]/round-end/page.tsx` | Show "Round X of Y" |
| `app/page.tsx` | Add static game length line |

---

## Out of Scope

- Configurable questions-per-round
- Category selection
- Per-player answer visibility during countdown
