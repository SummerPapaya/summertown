/**
 * Sound is OFF by default and only ever plays after a user gesture
 * toggled it on. Howler is installed for future loop assets (waves +
 * gulls); the windbell chime is synthesized with WebAudio so no audio
 * files are required.
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

/** tiny windbell arpeggio */
export function playChime() {
  const ac = audioCtx();
  if (!ac) return;
  const notes = [880, 1174.66, 1567.98, 2093];
  const now = ac.currentTime;
  notes.forEach((freq, i) => {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, now + i * 0.09);
    gain.gain.exponentialRampToValueAtTime(0.06, now + i * 0.09 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.09 + 0.9);
    osc.connect(gain).connect(ac.destination);
    osc.start(now + i * 0.09);
    osc.stop(now + i * 0.09 + 1);
  });
}

/** short radio-static burst (Summer FM easter egg) */
export function playStatic() {
  const ac = audioCtx();
  if (!ac) return;
  const dur = 0.25;
  const buffer = ac.createBuffer(1, ac.sampleRate * dur, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.25;
  const src = ac.createBufferSource();
  const gain = ac.createGain();
  gain.gain.setValueAtTime(0.05, ac.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + dur);
  src.buffer = buffer;
  src.connect(gain).connect(ac.destination);
  src.start();
}
