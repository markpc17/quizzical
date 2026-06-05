'use client'

import { useRef, useCallback, useEffect, useState } from 'react'

/**
 * Web Audio sound effects for the game play screen.
 *
 * `startCountdownMusic` pre-schedules the entire countdown using the Audio API's
 * sample-accurate clock so the rhythm stays perfectly in sync with the timer.
 *
 * Normal phase (> 5 s remaining): soft tick + bass pulse every second.
 * Urgent phase (≤ 5 s remaining): sharp high-pitched tick every half-second + louder bass.
 * Correct answer: ascending C-E-G-C chime.
 * Wrong answer: descending sawtooth buzz.
 */
export function useGameSounds() {
  const ctxRef = useRef<AudioContext | null>(null)
  const sourcesRef = useRef<AudioScheduledSourceNode[]>([])

  const [muted, setMuted] = useState<boolean>(false)
  // Keep a ref so async callbacks can read the current value without stale closure issues
  const mutedRef = useRef(false)

  // --------------------------------------------------------------------------
  // AudioContext helpers
  // --------------------------------------------------------------------------

  const getCtx = useCallback(async (): Promise<AudioContext> => {
    if (!ctxRef.current) {
      ctxRef.current = new AudioContext()
    }
    if (ctxRef.current.state === 'suspended') {
      await ctxRef.current.resume()
    }
    return ctxRef.current
  }, [])

  const stopMusic = useCallback(() => {
    for (const src of sourcesRef.current) {
      try { src.stop(0) } catch { /* already stopped */ }
    }
    sourcesRef.current = []
  }, [])

  /** Schedule a single oscillator note and register it for later cleanup. */
  const scheduleNote = useCallback((
    ctx: AudioContext,
    freq: number,
    at: number,
    duration: number,
    volume: number,
    type: OscillatorType = 'sine',
  ) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = type
    osc.frequency.value = freq
    gain.gain.setValueAtTime(0, at)
    gain.gain.linearRampToValueAtTime(volume, at + 0.005)
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration)
    osc.start(at)
    osc.stop(at + duration + 0.015)
    sourcesRef.current.push(osc)
  }, [])

  // --------------------------------------------------------------------------
  // Countdown music
  // --------------------------------------------------------------------------

  /**
   * Pre-schedules countdown sounds for the full duration of the current question.
   * Safe to call mid-question — it picks up from the current elapsed position.
   */
  const startCountdownMusic = useCallback(async (openedAt: string, totalMs: number) => {
    if (mutedRef.current) return

    const ctx = await getCtx()
    stopMusic()

    const startMs = new Date(openedAt).getTime()
    const elapsedMs = Date.now() - startMs
    if (elapsedMs >= totalMs) return

    const elapsedSec = elapsedMs / 1000
    const totalSec = totalMs / 1000
    const audioNow = ctx.currentTime

    // Half-second tick interval throughout; character changes in the final 5 s
    const interval = 0.5
    const firstTick = Math.ceil(elapsedSec / interval) * interval

    for (let t = firstTick; t < totalSec - 0.05; t += interval) {
      const delay = t - elapsedSec
      const at = audioNow + delay
      const secondsLeft = totalSec - t
      const urgent = secondsLeft <= 5

      if (urgent) {
        // Sharp, high-pitched ping — every half-second in the last 5 s
        scheduleNote(ctx, 1047, at, 0.04, 0.45)         // C6 main ping
        scheduleNote(ctx, 784,  at + 0.012, 0.03, 0.18) // G5 softer echo

        // Heavy bass thud on every whole second
        if (Math.abs(t % 1.0) < 0.05) {
          scheduleNote(ctx, 146, at, 0.22, 0.28) // D3
        }
      } else {
        // Soft clock tick
        scheduleNote(ctx, 659, at, 0.06, 0.14) // E5

        // Gentle bass pulse on every whole second
        if (Math.abs(t % 1.0) < 0.05) {
          scheduleNote(ctx, 110, at, 0.20, 0.12) // A2
        }
      }
    }
  }, [getCtx, stopMusic, scheduleNote])

  // --------------------------------------------------------------------------
  // Feedback sounds
  // --------------------------------------------------------------------------

  const playCorrect = useCallback(async () => {
    if (mutedRef.current) return
    const ctx = await getCtx()
    stopMusic()
    const now = ctx.currentTime
    // Ascending C–E–G–C chime
    scheduleNote(ctx, 523,  now + 0.00, 0.30, 0.38) // C5
    scheduleNote(ctx, 659,  now + 0.13, 0.30, 0.38) // E5
    scheduleNote(ctx, 784,  now + 0.26, 0.30, 0.38) // G5
    scheduleNote(ctx, 1047, now + 0.39, 0.55, 0.35) // C6
  }, [getCtx, stopMusic, scheduleNote])

  const playWrong = useCallback(async () => {
    if (mutedRef.current) return
    const ctx = await getCtx()
    stopMusic()
    const now = ctx.currentTime
    // Descending sawtooth buzz
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(220, now)
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.42)
    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(0.25, now + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.48)
    osc.start(now)
    osc.stop(now + 0.5)
    sourcesRef.current.push(osc)
  }, [getCtx, stopMusic])

  // --------------------------------------------------------------------------
  // Mute toggle — persisted to localStorage
  // --------------------------------------------------------------------------

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev
      mutedRef.current = next
      if (next) stopMusic()
      return next
    })
  }, [stopMusic])

  // Load saved preference on mount
  useEffect(() => {
    const stored = localStorage.getItem('quizzicle-muted') === 'true'
    mutedRef.current = stored
    setMuted(stored)
  }, [])

  // Persist preference whenever it changes
  useEffect(() => {
    localStorage.setItem('quizzicle-muted', String(muted))
  }, [muted])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMusic()
      ctxRef.current?.close().catch(() => {})
    }
  }, [stopMusic])

  return { muted, toggleMute, startCountdownMusic, stopMusic, playCorrect, playWrong }
}
