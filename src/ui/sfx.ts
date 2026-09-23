// Tiny synthesized sound effects via the Web Audio API — no audio asset
// files, no licensing to track. Every sound is a couple of scheduled
// oscillator tones. Mute preference is a per-viewer convenience, so it
// lives in localStorage rather than the simulation store.

let ctx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

const MUTE_KEY = "system-builder:muted";

export function isMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setMuted(muted: boolean): void {
  try {
    localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
  } catch {
    // ignore — worst case the preference doesn't persist this session
  }
}

interface Note {
  freq: number;
  start: number;
  duration: number;
  type?: OscillatorType;
  gain?: number;
}

function playNotes(notes: Note[]) {
  if (isMuted()) return;
  const audio = getContext();
  if (!audio) return;
  const now = audio.currentTime;
  for (const note of notes) {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = note.type ?? "sine";
    osc.frequency.value = note.freq;
    const peak = note.gain ?? 0.06;
    const t0 = now + note.start;
    const t1 = t0 + note.duration;
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(peak, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t1);
    osc.connect(gain);
    gain.connect(audio.destination);
    osc.start(t0);
    osc.stop(t1 + 0.02);
  }
}

export function playConnect(): void {
  playNotes([{ freq: 720, start: 0, duration: 0.06, type: "triangle", gain: 0.05 }]);
}

export function playPlace(): void {
  playNotes([{ freq: 480, start: 0, duration: 0.05, type: "sine", gain: 0.05 }]);
}

export function playWin(): void {
  playNotes([
    { freq: 523.25, start: 0, duration: 0.14, type: "triangle" },
    { freq: 659.25, start: 0.11, duration: 0.14, type: "triangle" },
    { freq: 783.99, start: 0.22, duration: 0.22, type: "triangle" },
  ]);
}

export function playLose(): void {
  playNotes([
    { freq: 392.0, start: 0, duration: 0.16, type: "sawtooth", gain: 0.045 },
    { freq: 261.63, start: 0.13, duration: 0.3, type: "sawtooth", gain: 0.045 },
  ]);
}
