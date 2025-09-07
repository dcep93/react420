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
  const busRef = useRef<AudioNode | null>(null); // ← master bus (to compressor/clipper)
  const timerRef = useRef<number | null>(null);
  const nextRef = useRef(0);
  const schedRef = useRef<
    Array<{ osc: OscillatorNode; g: GainNode; when: number }>
  >([]);

  // params
  const NL = 0.1,
    FADE = 0.006,
    GAIN = 5,
    LOOKAHEAD = 0.2,
    HORIZON = 0.8;

  const ensureAudio = useCallback(() => {
    if (ctxRef.current) return;
    const AC = (window.AudioContext ||
      (window as any).webkitAudioContext) as typeof AudioContext;
    const ctx = new AC();

    // --- Mastering chain: soft clipper -> compressor -> destination ---
    const shaper = ctx.createWaveShaper();
    shaper.curve = makeTanhCurve(3.0); // gentle saturation
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -24;
    comp.knee.value = 30;
    comp.ratio.value = 12;
    comp.attack.value = 0.003;
    comp.release.value = 0.25;

    shaper.connect(comp).connect(ctx.destination);
    busRef.current = shaper; // notes connect here

    ctxRef.current = ctx;
    nextRef.current = ctx.currentTime;
  }, []);

  // Simple tanh waveshaper curve
  const makeTanhCurve = (amount = 3.0, n = 1024) => {
    const c = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * 2 - 1;
      c[i] = Math.tanh(amount * x);
    }
    return c;
  };

  // schedule one note with fades; route into master bus
  const note = (freq: number, when: number) => {
    const ctx = ctxRef.current!,
      bus = busRef.current || ctx.destination;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.frequency.value = freq;

    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(GAIN, when + FADE);
    g.gain.setValueAtTime(GAIN, when + NL - FADE);
    g.gain.linearRampToValueAtTime(0, when + NL);

    osc.connect(g).connect(bus);
    osc.start(when);
    osc.stop(when + NL + 0.01);

    const rec = { osc, g, when };
    schedRef.current.push(rec);
    osc.onended = () => {
      try {
        osc.disconnect();
        g.disconnect();
      } catch {}
      const i = schedRef.current.indexOf(rec);
      if (i >= 0) schedRef.current.splice(i, 1);
    };
  };

  const tick = useCallback(() => {
    const ctx = ctxRef.current!;
    const now = ctx.currentTime,
      horizon = now + HORIZON;
    while (nextRef.current < horizon) {
      const t0 = nextRef.current;
      note(F.C, t0);
      note(F.G, t0);
      note(F.E, t0);
      for (let k = 1; k < countC; k++) note(F.C, t0 + (k * period_s) / countC);
      for (let k = 1; k < countG; k++) note(F.G, t0 + (k * period_s) / countG);
      nextRef.current = t0 + period_s;
    }
  }, [countC, countG, period_s]);

  // stop immediately: cancel future & fast-fade current
  const hardStop = () => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const now = ctx.currentTime;
    for (const { osc, g, when } of schedRef.current.splice(0)) {
      try {
        g.gain.cancelScheduledValues(0);
        if (when > now) {
          try {
            osc.stop(now);
          } catch {}
        } else {
          g.gain.setValueAtTime(g.gain.value ?? 0, now);
          g.gain.linearRampToValueAtTime(0, now + 0.01);
          try {
            osc.stop(now + 0.02);
          } catch {}
        }
      } catch {}
      try {
        osc.disconnect();
        g.disconnect();
      } catch {}
    }
  };

  useEffect(() => {
    if (!playing) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      hardStop();
      return;
    }
    ensureAudio();
    ctxRef.current!.resume();
    nextRef.current = ctxRef.current!.currentTime;
    tick();
    timerRef.current = window.setInterval(tick, LOOKAHEAD * 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [playing, period_s, countC, countG, ensureAudio, tick]);

  return null;
}
