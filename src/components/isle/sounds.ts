/**
 * Isle-specific WebAudio one-shots. Same pattern as lib/sound.ts:
 * no audio files, everything synthesized, only ever triggered after
 * a user gesture (sound toggle / clicks), never autoplayed.
 */

let ctx: AudioContext | null = null;

function audioCtx(): AudioContext | null {
  try {
    if (!ctx) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

/** Pentatonic chime ladder: Do Re Mi Sol La */
const NOTES = [523.25, 587.33, 659.25, 783.99, 880];

/** one brass windbell: fundamental + soft inharmonic partial */
export function playBellNote(i: number) {
  const ac = audioCtx();
  if (!ac) return;
  const freq = NOTES[i % NOTES.length];
  const now = ac.currentTime;
  const partials: [number, number][] = [
    [freq, 0.09],
    [freq * 2.76, 0.028],
  ];
  partials.forEach(([f, vol]) => {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'sine';
    osc.frequency.value = f;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(vol, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.6);
    osc.connect(gain).connect(ac.destination);
    osc.start(now);
    osc.stop(now + 1.7);
  });
}

/** soft wooden plank knock (pier walk progress) */
export function playKnock() {
  const ac = audioCtx();
  if (!ac) return;
  const now = ac.currentTime;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(180, now);
  osc.frequency.exponentialRampToValueAtTime(70, now + 0.09);
  gain.gain.setValueAtTime(0.05, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
  osc.connect(gain).connect(ac.destination);
  osc.start(now);
  osc.stop(now + 0.14);
}

/** tiny high lily note (meadow hover chime) */
export function playLilyNote() {
  const ac = audioCtx();
  if (!ac) return;
  const now = ac.currentTime;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = 'sine';
  osc.frequency.value = 1567.98 + Math.random() * 525;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.025, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);
  osc.connect(gain).connect(ac.destination);
  osc.start(now);
  osc.stop(now + 0.8);
}
