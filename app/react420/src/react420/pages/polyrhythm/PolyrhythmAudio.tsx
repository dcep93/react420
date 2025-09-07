import { useCallback, useEffect, useRef } from "react";

const F = { C: 261.63, G: 392.0, E: 659.26 };

export default function PolyrhythmAudio({
  period_s,
  countC,
  countG,
  playing,
}: {
  period_s: number;
  countC: number;
  countG: number;
  playing: boolean;
}) {
  const ctxRef = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const timerRef = useRef<number | null>(null);
  const nextBoundaryRef = useRef(0);

  const NL = 0.1;
  const LOOKAHEAD = 0.2; // check cadence (s)
  const AHEAD_VISIBLE = 0.8; // schedule horizon when tab visible
  const AHEAD_HIDDEN = 6.0; // bigger horizon for hidden-tab throttling
  const PER_NOTE_GAIN = 0.22;

  const ensureAudio = () => {
    if (!ctxRef.current) {
      const ctx = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      const m = ctx.createGain();
      m.gain.value = 0.9;
      m.connect(ctx.destination);
      ctxRef.current = ctx;
      gainRef.current = m;
      nextBoundaryRef.current = ctx.currentTime;
    }
  };

  const scheduleNote = (freq: number, when: number) => {
    const ctx = ctxRef.current!,
      master = gainRef.current!;
    const o = ctx.createOscillator(),
      g = ctx.createGain();
    o.frequency.value = freq;
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(PER_NOTE_GAIN, when + 0.006);
    g.gain.setValueAtTime(PER_NOTE_GAIN, when + NL - 0.012);
    g.gain.linearRampToValueAtTime(0, when + NL);
    o.connect(g).connect(master);
    o.start(when);
    o.stop(when + NL + 0.005);
  };

  const tick = useCallback(() => {
    const loopOffsets = (n: number) =>
      Array.from({ length: n }, (_, k) => (k * period_s) / n);
    const ctx = ctxRef.current!;
    const now = ctx.currentTime;
    const horizon = now + (document.hidden ? AHEAD_HIDDEN : AHEAD_VISIBLE);

    if (nextBoundaryRef.current < now - period_s) nextBoundaryRef.current = now;

    while (nextBoundaryRef.current < horizon) {
      const t0 = nextBoundaryRef.current;
      scheduleNote(F.C, t0);
      scheduleNote(F.G, t0);
      scheduleNote(F.E, t0);
      for (const t of loopOffsets(countC).slice(1)) scheduleNote(F.C, t0 + t);
      for (const t of loopOffsets(countG).slice(1)) scheduleNote(F.G, t0 + t);
      nextBoundaryRef.current = t0 + period_s;
    }
  }, [countC, countG, period_s]);

  // Start/stop scheduler
  useEffect(() => {
    if (!playing) {
      if (timerRef.current != null) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      // Let queued audio play; optionally suspend later
      const id = window.setTimeout(() => ctxRef.current?.suspend(), 500);
      return () => clearTimeout(id);
    }

    ensureAudio();
    const ctx = ctxRef.current!;
    ctx.resume();
    nextBoundaryRef.current = ctx.currentTime; // re-align on play
    tick(); // prime immediately
    timerRef.current = window.setInterval(tick, LOOKAHEAD * 1000);
    return () => {
      if (timerRef.current != null) clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [tick, playing, period_s, countC, countG]);

  // Keep scheduling when tab visibility changes
  useEffect(() => {
    const onVis = () => {
      if (!ctxRef.current) return;
      if (playing) {
        ctxRef.current.resume();
        tick();
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [tick, playing]);

  return null;
}
