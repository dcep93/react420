import { useEffect, useRef } from "react";

/**
 * PolyrhythmAudio
 * Props:
 *  - period: seconds per loop (float > 0)
 *  - countC: strikes of C per loop (int > 0)
 *  - countG: strikes of G per loop (int > 0)
 *  - playing: boolean (true = play, false = pause)
 *
 * Each loop starts with C+G+E together; note length = 0.1s.
 */
export default function PolyrhythmAudio({
  period,
  countC,
  countG,
  playing,
}: {
  period: number;
  countC: number;
  countG: number;
  playing: boolean;
}) {
  const ctxRef = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const nextBoundaryRef = useRef<number>(0);

  // constants
  const NL = 0.1; // note length seconds
  const F = { C: 261.63, G: 392.0, E: 659.26 }; // C4, G4, E5 (above G)
  const LOOKAHEAD = 0.05; // seconds
  const SCHEDULE_AHEAD = 0.25; // seconds
  const PER_NOTE_GAIN = 0.22; // mild headroom; accept a little crunch on triads

  // lazy-init audio
  const ensureAudio = () => {
    if (!ctxRef.current) {
      const ctx = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      const master = ctx.createGain();
      master.gain.value = 0.9;
      master.connect(ctx.destination);
      ctxRef.current = ctx;
      gainRef.current = master;
      nextBoundaryRef.current = ctx.currentTime; // start on a clean boundary
    }
  };

  const scheduleNote = (freq: number, when: number) => {
    const ctx = ctxRef.current!,
      master = gainRef.current!;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.frequency.value = freq;
    // short fade in/out to reduce clicks
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(PER_NOTE_GAIN, when + 0.006);
    g.gain.setValueAtTime(PER_NOTE_GAIN, when + NL - 0.012);
    g.gain.linearRampToValueAtTime(0, when + NL);
    osc.connect(g).connect(master);
    osc.start(when);
    osc.stop(when + NL + 0.005);
  };

  // precompute offsets inside a loop (include 0; exclude period)
  const loopOffsets = (n: number) =>
    Array.from({ length: n }, (_, k) => (k * period) / n);

  // scheduler tick
  const tick = () => {
    const ctx = ctxRef.current!;
    const now = ctx.currentTime;
    const horizon = now + SCHEDULE_AHEAD;

    // initialize next loop boundary if needed
    if (nextBoundaryRef.current < now - period) {
      nextBoundaryRef.current = now;
    }

    while (nextBoundaryRef.current < horizon) {
      const loopStart = nextBoundaryRef.current;

      // boundary: C + G + E together
      scheduleNote(F.C, loopStart);
      scheduleNote(F.G, loopStart);
      scheduleNote(F.E, loopStart);

      // inner events (C & G excluding t=0)
      const cTimes = loopOffsets(countC).slice(1);
      const gTimes = loopOffsets(countG).slice(1);

      // merge + schedule (duplicates mean coincidence -> fire both)
      for (const t of cTimes) scheduleNote(F.C, loopStart + t);
      for (const t of gTimes) scheduleNote(F.G, loopStart + t);

      nextBoundaryRef.current = loopStart + period;
    }

    rafRef.current = requestAnimationFrame(tick);
  };

  // react to playing flag
  useEffect(() => {
    if (playing) {
      ensureAudio();
      const ctx = ctxRef.current!;
      if (ctx.state === "suspended") ctx.resume();
      if (rafRef.current == null) rafRef.current = requestAnimationFrame(tick);
    } else {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      // Let scheduled sounds finish; no hard stop (avoids clicks)
      // Optionally suspend after a short delay to save CPU
      const id = setTimeout(() => ctxRef.current?.suspend(), 300);
      return () => clearTimeout(id);
    }
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, period, countC, countG]);

  // restart loop timing if structural props change while playing
  useEffect(() => {
    if (playing && ctxRef.current)
      nextBoundaryRef.current = ctxRef.current.currentTime;
  }, [period, countC, countG, playing]);

  return null; // headless audio component
}
