/**
 * Sound is OFF by default and only ever plays after a user gesture
 * toggled it on. Everything is synthesized with WebAudio — the windbell
 * chime, the radio static, and the ocean ambience — so no audio files
 * (and no Howler) are needed.
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

/* ---- ocean ambience ------------------------------------------------------
 * A shore, synthesised: brown noise low-passed into a slow swell, plus a band
 * of white noise for the foam that arrives a beat later. Two LFOs at unrelated
 * rates — and two loop lengths that do not divide into each other — keep it
 * from ever repeating audibly.
 *
 * Deliberately faint: this sits behind someone reading, not in front of them.
 * Fades in and out so toggling never clicks.
 * -------------------------------------------------------------------------- */

/** Peak output. Well under the chime — meant to be felt more than heard.
 *  Raise for a closer shore, lower for one further down the beach. */
const OCEAN_GAIN = 0.085;
const BODY_SECONDS = 6;
const FOAM_SECONDS = 4.5;
const OCEAN_FADE = 1.2;

let ocean: { master: GainNode } | null = null;
/** whether the shore should be audible — survives a hidden tab */
let oceanWanted = false;

/** Noise whose loop point has been crossfaded away, so it can run forever. */
function noiseBuffer(ac: AudioContext, seconds: number, brown: boolean): AudioBuffer {
  const rate = ac.sampleRate;
  const len = Math.floor(rate * seconds);
  const fade = Math.floor(rate * 0.4);
  const buffer = ac.createBuffer(2, len, rate);

  for (let ch = 0; ch < 2; ch++) {
    const raw = new Float32Array(len + fade);
    let last = 0;
    for (let i = 0; i < raw.length; i++) {
      const white = Math.random() * 2 - 1;
      if (brown) {
        last = (last + 0.02 * white) / 1.02;
        raw[i] = last * 3.5;
      } else {
        raw[i] = white;
      }
    }
    const out = buffer.getChannelData(ch);
    out.set(raw.subarray(0, len));
    /* Fold the surplus tail back over the head: sample `len` now follows
       sample `len - 1`, so the seam is as continuous as the noise itself. */
    for (let i = 0; i < fade; i++) {
      const t = i / fade;
      out[i] = raw[i] * t + raw[len + i] * (1 - t);
    }
  }
  return buffer;
}

function buildOcean(ac: AudioContext): { master: GainNode } {
  const master = ac.createGain();
  master.gain.value = 0;
  master.connect(ac.destination);

  /* the swell — the deep body of the water */
  const body = ac.createBufferSource();
  body.buffer = noiseBuffer(ac, BODY_SECONDS, true);
  body.loop = true;

  const rumble = ac.createBiquadFilter();
  rumble.type = 'highpass';
  rumble.frequency.value = 45;

  const rolloff = ac.createBiquadFilter();
  rolloff.type = 'lowpass';
  rolloff.frequency.value = 520;
  rolloff.Q.value = 0.6;

  const swell = ac.createGain();
  swell.gain.value = 0.6;

  /* depth is well under the base so a trough is a lull, not silence */
  const swellLfo = ac.createOscillator();
  swellLfo.frequency.value = 0.055;
  const swellDepth = ac.createGain();
  swellDepth.gain.value = 0.34;
  swellLfo.connect(swellDepth).connect(swell.gain);

  body.connect(rumble).connect(rolloff).connect(swell).connect(master);

  /* the foam — hiss that breaks just after each swell */
  const foam = ac.createBufferSource();
  foam.buffer = noiseBuffer(ac, FOAM_SECONDS, false);
  foam.loop = true;

  const band = ac.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = 1700;
  band.Q.value = 0.7;

  const hiss = ac.createGain();
  hiss.gain.value = 0.05;

  const foamLfo = ac.createOscillator();
  foamLfo.frequency.value = 0.038;
  const foamDepth = ac.createGain();
  foamDepth.gain.value = 0.045;
  foamLfo.connect(foamDepth).connect(hiss.gain);

  /* drift the band so the hiss never sits on one pitch */
  const drift = ac.createOscillator();
  drift.frequency.value = 0.021;
  const driftDepth = ac.createGain();
  driftDepth.gain.value = 420;
  drift.connect(driftDepth).connect(band.frequency);

  foam.connect(band).connect(hiss).connect(master);

  body.start();
  foam.start();
  swellLfo.start();
  foamLfo.start();
  drift.start();

  return { master };
}

/* Autoplay policies refuse audio until the page has been interacted with,
 * which bites when a saved "on" preference runs during load. Try again on the
 * first gesture. */
function resumeWhenAllowed(ac: AudioContext) {
  if (ac.state !== 'suspended') return;
  const events = ['pointerdown', 'keydown', 'touchstart'] as const;
  const retry = () => {
    void ac.resume();
    events.forEach((e) => window.removeEventListener(e, retry));
  };
  events.forEach((e) => window.addEventListener(e, retry));
}

/* A background tab should not keep the shore running all night — but it has
 * to come back when they do, since nothing re-runs the toggle effect. */
let visibilityBound = false;
function bindVisibility() {
  if (visibilityBound || typeof document === 'undefined') return;
  visibilityBound = true;
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) {
      void ctx.suspend();
    } else if (oceanWanted) {
      void ctx.resume();
    }
  });
}

/** Fade the shore in or out. The graph is only built the first time it is
 *  actually wanted, so a visitor who leaves sound off never pays for an
 *  AudioContext at all. */
export function setOcean(on: boolean) {
  oceanWanted = on;
  /* nothing to quiet down yet */
  if (!on && !ocean) return;
  const ac = audioCtx();
  if (!ac) return;
  bindVisibility();
  if (!ocean) ocean = buildOcean(ac);

  const now = ac.currentTime;
  const gain = ocean.master.gain;
  gain.cancelScheduledValues(now);
  gain.setValueAtTime(Math.max(gain.value, 0.0001), now);
  gain.linearRampToValueAtTime(on ? OCEAN_GAIN : 0, now + (on ? OCEAN_FADE : OCEAN_FADE * 0.6));

  if (on) resumeWhenAllowed(ac);
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
