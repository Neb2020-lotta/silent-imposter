// Synthesized sound effects via WebAudio — no asset files needed.
import { getSettings } from "./settings";

let ctx: AudioContext | null = null;
function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    try {
      const AC = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
      ctx = new AC();
    } catch {
      return null;
    }
  }
  if (ctx?.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

type Tone = {
  freq: number;
  dur: number;
  type?: OscillatorType;
  vol?: number;
  delay?: number;
  sweepTo?: number;
};

function playTones(tones: Tone[]) {
  if (!getSettings().sounds) return;
  const ac = getCtx();
  if (!ac) return;
  const now = ac.currentTime;
  for (const t of tones) {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = t.type || "sine";
    osc.frequency.setValueAtTime(t.freq, now + (t.delay || 0));
    if (t.sweepTo) {
      osc.frequency.exponentialRampToValueAtTime(
        t.sweepTo,
        now + (t.delay || 0) + t.dur
      );
    }
    const vol = t.vol ?? 0.15;
    gain.gain.setValueAtTime(0.0001, now + (t.delay || 0));
    gain.gain.exponentialRampToValueAtTime(vol, now + (t.delay || 0) + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + (t.delay || 0) + t.dur);
    osc.connect(gain).connect(ac.destination);
    osc.start(now + (t.delay || 0));
    osc.stop(now + (t.delay || 0) + t.dur + 0.02);
  }
}

export const sfx = {
  click: () => playTones([{ freq: 600, dur: 0.05, type: "square", vol: 0.08 }]),
  roundStart: () =>
    playTones([
      { freq: 440, dur: 0.12, type: "triangle", vol: 0.12 },
      { freq: 660, dur: 0.18, type: "triangle", vol: 0.14, delay: 0.1 },
    ]),
  cardReveal: () =>
    playTones([
      { freq: 220, dur: 0.5, type: "sawtooth", vol: 0.05, sweepTo: 880 },
      { freq: 880, dur: 0.15, type: "sine", vol: 0.12, delay: 0.5 },
    ]),
  imposterReveal: () =>
    playTones([
      { freq: 110, dur: 0.4, type: "sawtooth", vol: 0.18, sweepTo: 55 },
      { freq: 60, dur: 0.6, type: "square", vol: 0.15, delay: 0.4 },
      { freq: 880, dur: 0.3, type: "triangle", vol: 0.1, delay: 0.5, sweepTo: 220 },
    ]),
  victory: () =>
    playTones([
      { freq: 523, dur: 0.15, type: "triangle", vol: 0.14 },
      { freq: 659, dur: 0.15, type: "triangle", vol: 0.14, delay: 0.15 },
      { freq: 784, dur: 0.15, type: "triangle", vol: 0.14, delay: 0.3 },
      { freq: 1046, dur: 0.4, type: "triangle", vol: 0.16, delay: 0.45 },
    ]),
};
