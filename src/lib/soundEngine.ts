/**
 * محرك الصوت — أصوات أصلية مولّدة بـ WebAudio (لا ملفات محمية).
 */
let ctx: AudioContext | null = null;
let muted = localStorage.getItem('bm_muted') === '1';

function audio(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

export function isMuted(): boolean {
  return muted;
}

export function setMuted(value: boolean): void {
  muted = value;
  localStorage.setItem('bm_muted', value ? '1' : '0');
}

interface Tone {
  freq: number;
  at: number;
  dur: number;
  type?: OscillatorType;
  gain?: number;
}

function play(tones: Tone[]): void {
  if (muted) return;
  try {
    const ac = audio();
    const now = ac.currentTime;
    for (const t of tones) {
      const osc = ac.createOscillator();
      const g = ac.createGain();
      osc.type = t.type ?? 'sine';
      osc.frequency.value = t.freq;
      g.gain.setValueAtTime(0.0001, now + t.at);
      g.gain.exponentialRampToValueAtTime(t.gain ?? 0.18, now + t.at + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now + t.at + t.dur);
      osc.connect(g).connect(ac.destination);
      osc.start(now + t.at);
      osc.stop(now + t.at + t.dur + 0.05);
    }
  } catch {
    // بيئات بلا صوت — تجاهل
  }
}

export const sounds = {
  correct: () =>
    play([
      { freq: 523, at: 0, dur: 0.12 },
      { freq: 659, at: 0.1, dur: 0.12 },
      { freq: 784, at: 0.2, dur: 0.25 },
    ]),
  wrong: () =>
    play([
      { freq: 200, at: 0, dur: 0.25, type: 'sawtooth', gain: 0.1 },
      { freq: 150, at: 0.15, dur: 0.3, type: 'sawtooth', gain: 0.1 },
    ]),
  buzz: () =>
    play([
      { freq: 880, at: 0, dur: 0.08, type: 'square', gain: 0.12 },
      { freq: 1174, at: 0.06, dur: 0.15, type: 'square', gain: 0.12 },
    ]),
  tick: () => play([{ freq: 1000, at: 0, dur: 0.04, gain: 0.06 }]),
  roundStart: () =>
    play([
      { freq: 392, at: 0, dur: 0.15 },
      { freq: 523, at: 0.15, dur: 0.15 },
      { freq: 659, at: 0.3, dur: 0.35 },
    ]),
  fanfare: () =>
    play([
      { freq: 523, at: 0, dur: 0.2 },
      { freq: 659, at: 0.18, dur: 0.2 },
      { freq: 784, at: 0.36, dur: 0.2 },
      { freq: 1046, at: 0.54, dur: 0.5 },
      { freq: 784, at: 0.54, dur: 0.5, gain: 0.1 },
      { freq: 659, at: 0.54, dur: 0.5, gain: 0.08 },
    ]),
};
