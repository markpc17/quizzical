# Gameplay improvements: question repeats, niche categories, timer dead time

**Date:** 2026-06-09
**Status:** Approved by user (design discussion in session)

Three independent fixes addressing player complaints. Each can ship separately.

## Problem statement

1. Questions repeat when the same group plays multiple games — the OpenTDB
   session token that prevents repeats within a game is discarded after each game.
2. Five of fourteen categories are chosen completely at random, so games can be
   dominated by niche subjects (Mythology, Cars & Transport, Politics) that shut
   out casual players.
3. When a fast player answers, everyone waits out the full question timer for one
   straggler. Auto-advance only fires when *all* players have answered.

## Fix 1: Persist OpenTDB session token across games

**Client (lobby page, organiser start flow):**
- Read `quizzicle-opentdb-token` from localStorage and include it as
  `opentdbToken` in the POST `/api/games/[code]/start` body.
- The token is per device (not per game code): repeats are about the organiser's
  history, not one game.
- On success, save the token returned by the server back to localStorage.

**Server (`app/api/games/[code]/start/route.ts`):**
- Use the provided token if present; otherwise request a fresh one (current
  behaviour).
- In `fetchQuestionsForCategory`, handle OpenTDB response codes:
  - **Code 3** (token not found / expired — tokens die after 6 idle hours):
    request a fresh token once, then continue with it for all categories.
  - **Code 4** (pool exhausted for category + difficulty): retry that category
    **without** the token. A repeat beats a failed game start.
- Response includes the token actually used: `{ ok: true, opentdbToken }`.

## Fix 2: Two-tier category pool

In `app/api/games/[code]/start/route.ts`, split `QUIZ_CATEGORIES`:

- **Mainstream (8):** Geography (22), History (23), Science & Nature (17),
  Pop Culture (26), Music (12), Film & TV (11), Sports (21), Technology (18)
- **Niche (6):** Literature (10), Art & Architecture (25), Mythology (20),
  Politics & World Affairs (24), Cars & Transport (28), Animals & Wildlife (27)

**Selection rule:**
- A game gets `rounds − 1` mainstream categories + exactly **1 niche wildcard**.
- Exception: 10-round games take 8 mainstream + 2 niche (only 8 mainstream exist).
- Shuffle the selected list so the wildcard lands in a random round position.
- Remaining categories (mainstream first, then niche) pad the candidate list as
  today (`rounds + 3` candidates) so per-category API failures still fall through.
- The hard-coded fallback bank is already mainstream; no change.

## Fix 3: Server-authoritative timer shrink

**Schema:** migration `006_question_closes_at.sql` adds nullable
`closes_at timestamptz` to `questions`. Add `closes_at: string | null` to the
`Question` type in `lib/supabase/types`.

**Trigger (`app/api/games/[code]/answer/route.ts`, existing fire-and-forget
auto-advance block):** after counting answers vs players, if ALL of:
- `playerCount >= 2`
- `answerCount === playerCount - 1` (exactly one straggler)
- more than ~7 s remain on the question (`opened_at + QUESTION_TIME_MS - now > 7000`)
- `closes_at` is currently null

then `UPDATE questions SET closes_at = now + 5s WHERE id = ? AND closes_at IS NULL`
(the WHERE clause makes concurrent submissions idempotent). The existing
all-answered instant advance takes priority and is unchanged.

**Clients (play page, `useCountdown`, `useGameSounds`):**
- Effective deadline = `min(opened_at + QUESTION_TIME_MS, closes_at ?? Infinity)`.
- All clients already receive the question row UPDATE via the realtime
  subscription in `useGameState`, so timers snap together — including the
  straggler's.
- The organiser client's timer-expiry trigger (POST `/next`) fires at the
  effective deadline.
- Re-invoke `startCountdownMusic(opened_at, effectiveTotalMs)` when `closes_at`
  appears; the shortened total automatically engages the urgent tick phase for
  the final 5 s.

**Out of scope:**
- Rejecting answers that arrive after `closes_at` (server already clamps
  recorded time; client disables buttons).
- Shrinking with 2+ stragglers — exactly one only.

## Verification

Manual, via dev server with two browser sessions (organiser + player):
1. Timer on the unanswered side snaps to ~5 s when the other player answers early.
2. Several game starts show at most one niche category (two for 10-round games).
3. Two consecutive games on the same device produce no repeated questions, and
   the localStorage token round-trips.
