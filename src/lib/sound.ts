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
 * A shore, synthesised as a run of long overlapping swells over a floor that
 * never goes away.
 *
 * Two things make a synthesised shore sound fake, and both are about timing:
 *
 *   - Swells that start from silence. A rising gain is only audible over the
 *     last ~20dB of its climb, so ramping up from nothing spends most of its
 *     time below hearing and then arrives all at once — a jolt, every few
 *     seconds, forever. Each swell here is written out as a raised-cosine
 *     curve, so the loudness climbs evenly across the whole rise (2.4–4s) and
 *     falls evenly across the whole retreat (3.5–6s).
 *
 *   - Gaps. Real surf is continuous: something is always moving somewhere.
 *     Waves are laid down every 2.5–7s while each one runs 6–12s, so two or
 *     three are always in flight, and under them a low bed, a mid shore floor
 *     and a light wind keep a lull from ever becoming silence.
 *
 * The result is meant to sit behind someone reading: unmistakably surf, with
 * no single moment in it you could point at.
 * -------------------------------------------------------------------------- */

/** Peak output. Well under the chime — meant to be felt more than heard.
 *  Raise for a closer shore, lower for one further down the beach. */
const OCEAN_GAIN = 0.068;
/** Fade used when the switch is flipped. Just long enough to avoid the click
 *  of a step change on the master gain — this is the *only* fade in the
 *  ambience. There is no loop to fade: waves are generated on the fly and
 *  never repeat, so there is no seam to hide. */
const OCEAN_FADE = 0.25;

/** Levels of the three always-on layers, relative to OCEAN_GAIN. Together they
 *  are the shore at rest — the level a lull settles back to, never silence.
 *  Set WIND_LEVEL to 0 for surf with nothing else in it. */
const BED_LEVEL = 0.13;
const SHORE_LEVEL = 0.15;
const WIND_LEVEL = 0.09;

/** Seconds of noise kept around for waves to read from. */
const NOISE_SECONDS = 8;

let ocean: { master: GainNode; air: BiquadFilterNode } | null = null;
/** whether the shore should be audible — survives a hidden tab */
let oceanWanted = false;

/** Reused by every wave; refilled whenever the graph is rebuilt. */
let bodyBuf: AudioBuffer | null = null;
let sprayBuf: AudioBuffer | null = null;

/** Sources currently scheduled, so a toggle-off can tear them all down. */
const live = new Set<AudioScheduledSourceNode>();
let oceanTimer: number | null = null;
/** when the next wave is due, in context time */
let oceanNext = 0;
/** bumped on every toggle so a pending teardown can tell it is stale */
let oceanGen = 0;

/** inclusive-exclusive random in [min, max) */
function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

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

/** Register a source so a toggle-off can stop it, and forget it when it ends. */
function track(node: AudioScheduledSourceNode) {
  live.add(node);
  node.onended = () => {
    live.delete(node);
    try {
      node.disconnect();
    } catch {
      /* already gone */
    }
  };
}

function buildOcean(ac: AudioContext): { master: GainNode; air: BiquadFilterNode } {
  const master = ac.createGain();
  master.gain.value = 0;

  /* Gentle top cut: the reference has almost nothing above 6kHz, and the
     noise sources are full-bandwidth, so without this the result hisses. */
  const air = ac.createBiquadFilter();
  air.type = 'lowpass';
  air.frequency.value = 6000;
  air.Q.value = 0.5;
  master.connect(air).connect(ac.destination);

  bodyBuf = noiseBuffer(ac, NOISE_SECONDS, true);
  sprayBuf = noiseBuffer(ac, NOISE_SECONDS, false);

  /* --- the bed: the distant sea, always there so a lull is not silence --- */
  const bed = ac.createBufferSource();
  bed.buffer = bodyBuf;
  bed.loop = true;
  const bedLp = ac.createBiquadFilter();
  bedLp.type = 'lowpass';
  bedLp.frequency.value = 240;
  bedLp.Q.value = 0.4;
  const bedGain = ac.createGain();
  bedGain.gain.value = BED_LEVEL;
  bed.connect(bedLp).connect(bedGain).connect(master);
  bed.start(0, rand(0, 6));
  track(bed);

  /* --- the shore floor: the wash that is always happening somewhere along
         the beach. Without it the trough between two swells reads as the sea
         stopping altogether, which is most of what made the old version
         jump. Rolled off on top so it stays soft. --- */
  const shore = ac.createBufferSource();
  shore.buffer = sprayBuf;
  shore.loop = true;
  const shoreBp = ac.createBiquadFilter();
  shoreBp.type = 'bandpass';
  shoreBp.frequency.value = 820;
  shoreBp.Q.value = 0.45;
  const shoreLp = ac.createBiquadFilter();
  shoreLp.type = 'lowpass';
  shoreLp.frequency.value = 3200;
  const shoreGain = ac.createGain();
  shoreGain.gain.value = SHORE_LEVEL;
  shore.connect(shoreBp).connect(shoreLp).connect(shoreGain).connect(master);
  shore.start(0, rand(0, 6));
  track(shore);

  /* a slow drift, so the floor breathes instead of sitting perfectly still */
  const drift = ac.createOscillator();
  drift.frequency.value = 0.037;
  const driftDepth = ac.createGain();
  driftDepth.gain.value = SHORE_LEVEL * 0.3;
  drift.connect(driftDepth).connect(shoreGain.gain);
  drift.start();
  track(drift);

  /* --- wind over the water: a narrow band, gusting slowly --- */
  const wind = ac.createBufferSource();
  wind.buffer = bodyBuf;
  wind.loop = true;
  const windBp = ac.createBiquadFilter();
  windBp.type = 'bandpass';
  windBp.frequency.value = 470;
  windBp.Q.value = 1.1;
  const windGain = ac.createGain();
  windGain.gain.value = WIND_LEVEL * 0.5;
  wind.connect(windBp).connect(windGain).connect(master);
  wind.start(0, rand(0, 6));
  track(wind);

  /* one LFO drives both the loudness and the band, so a gust brightens
     as it gets louder — the way wind actually behaves */
  const gust = ac.createOscillator();
  gust.frequency.value = 0.045;
  const gustDepth = ac.createGain();
  gustDepth.gain.value = WIND_LEVEL * 0.4;
  gust.connect(gustDepth).connect(windGain.gain);
  const gustCut = ac.createGain();
  gustCut.gain.value = 210;
  gust.connect(gustCut).connect(windBp.frequency);
  gust.start();
  track(gust);

  return { master, air };
}

/**
 * One swell, written out as a single curve: a raised-cosine rise, a short
 * crest, a raised-cosine retreat.
 *
 * A curve rather than two ramps because the shape is the whole point — see
 * the note at the top of this section. An exponential ramp from silence (or
 * two ramps meeting at a peak) puts almost all of the audible change in the
 * last fraction of a second, and that is exactly what reads as a jolt.
 */
const CURVE_RATE = 24; // curve samples per second — the shape is slow, and
                       // the values in between are interpolated linearly
function swellCurve(peak: number, rise: number, crest: number, fall: number): Float32Array {
  const span = rise + crest + fall;
  const n = Math.max(16, Math.round(span * CURVE_RATE));
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = (i / (n - 1)) * span;
    if (t < rise) out[i] = peak * 0.5 * (1 - Math.cos((Math.PI * t) / rise));
    else if (t < rise + crest) out[i] = peak;
    else out[i] = peak * 0.5 * (1 + Math.cos((Math.PI * (t - rise - crest)) / fall));
  }
  return out;
}

/**
 * Lay down one swell starting at `at`, and return how long it runs.
 *
 * The foam brightening towards the crest and then darkening as it draws back
 * is the whole trick: the ear reads the long falling hiss as water retreating
 * over shingle. Without it you get a noise burst, not a wave.
 */
function scheduleWave(ac: AudioContext, dest: AudioNode, at: number): number {
  if (!bodyBuf || !sprayBuf) return 4;

  /* Long and soft: 2.4–4s rising, up to a second on top, 3.5–6s drawing
     back — a gentle shore, not a breaker. Every duration, level, filter
     corner and stereo position is randomised, so no swell repeats. */
  const rise = rand(2.4, 4);
  const crest = rand(0.4, 1.2);
  const fall = rand(3.5, 6);
  const total = rise + crest + fall;
  const pan = rand(-0.5, 0.5);
  const foamPeak = rand(1.1, 1.8);
  const bodyPeak = foamPeak * rand(0.4, 0.65);
  const breakAt = at + rise;

  /* --- body: the water moving underneath, dark and a beat behind --- */
  const b = ac.createBufferSource();
  b.buffer = bodyBuf;
  b.loop = true;
  /* Cut the sub-bass: the reference puts only ~5% of its energy below 150Hz,
     and a brown-noise body left unfiltered dominates that band and turns the
     whole thing into a rumble. */
  const hp = ac.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 110;
  const lp = ac.createBiquadFilter();
  lp.type = 'lowpass';
  lp.Q.value = 0.7;
  const bg = ac.createGain();
  bg.gain.value = 0;
  const bpan = ac.createStereoPanner();
  bpan.pan.value = pan * 0.7;
  b.connect(hp).connect(lp).connect(bg).connect(bpan).connect(dest);

  /* The body sits under the foam: it is the water moving, not the sound of
     the water. Kept well back so the mid-band foam stays in front. */
  bg.gain.setValueCurveAtTime(swellCurve(bodyPeak, rise, crest, fall), at, total);
  lp.frequency.setValueAtTime(240, at);
  lp.frequency.exponentialRampToValueAtTime(rand(620, 900), breakAt + crest * 0.5);
  lp.frequency.exponentialRampToValueAtTime(300, at + total);
  b.start(at, rand(0, 6));
  b.stop(at + total + 0.05);
  track(b);

  /* --- foam: the wash. Starts a little after the body and runs a little
         longer, so the two never move as one block. --- */
  const s = ac.createBufferSource();
  s.buffer = sprayBuf;
  s.loop = true;
  const band = ac.createBiquadFilter();
  band.type = 'bandpass';
  band.Q.value = 0.5;
  const sg = ac.createGain();
  sg.gain.value = 0;
  const span = ac.createStereoPanner();
  span.pan.value = pan;
  s.connect(band).connect(sg).connect(span).connect(dest);

  /* Foam carries the level. The reference is mid-forward — roughly half its
     energy sits between 600Hz and 2kHz — so the band starts there, opens up
     towards the crest and sweeps back down as the wash retreats, rather than
     living up at 3kHz. */
  const sRise = rise * 0.92;
  const sFall = fall * 1.05;
  const sAt = at + rise - sRise;
  const sTotal = sRise + crest + sFall;
  sg.gain.setValueCurveAtTime(swellCurve(foamPeak, sRise, crest, sFall), sAt, sTotal);
  band.frequency.setValueAtTime(rand(620, 900), sAt);
  band.frequency.exponentialRampToValueAtTime(rand(1300, 2000), breakAt + crest * 0.5);
  band.frequency.exponentialRampToValueAtTime(rand(480, 720), sAt + sTotal);
  s.start(sAt, rand(0, 6));
  s.stop(sAt + sTotal + 0.05);
  track(s);

  /* --- sheen: the faint hiss riding on top of the crest. Slow in and slow
         out and very quiet on purpose — a short bright splash is what makes a
         shore sound as if it is clapping at you. --- */
  const c = ac.createBufferSource();
  c.buffer = sprayBuf;
  c.loop = true;
  const bright = ac.createBiquadFilter();
  bright.type = 'highpass';
  bright.frequency.value = 1600;
  const dull = ac.createBiquadFilter();
  dull.type = 'lowpass';
  dull.frequency.value = 4200;
  const cg = ac.createGain();
  cg.gain.value = 0;
  c.connect(bright).connect(dull).connect(cg).connect(span).connect(dest);

  const cRise = rand(0.7, 1.3);
  const cCrest = crest * 0.5;
  const cFall = rand(1.8, 3.2);
  const cAt = breakAt - cRise * 0.5;
  cg.gain.setValueCurveAtTime(swellCurve(foamPeak * rand(0.09, 0.15), cRise, cCrest, cFall), cAt, cRise + cCrest + cFall);
  c.start(cAt, rand(0, 6));
  c.stop(cAt + cRise + cCrest + cFall + 0.05);
  track(c);

  return total;
}

/** Queue waves a little ahead of time, forever. */
function pumpOcean(ac: AudioContext, master: GainNode) {
  if (!ocean) return;

  /* A suspended context (pre-gesture, or a hidden tab) does not advance its
   * clock, so scheduling now would pile every wave up at the same instant
   * when it resumes. Wait instead. */
  if (ac.state !== 'running' || (typeof document !== 'undefined' && document.hidden)) {
    oceanTimer = window.setTimeout(() => pumpOcean(ac, master), 800);
    return;
  }

  const start = Math.max(ac.currentTime + 0.08, oceanNext);
  const length = scheduleWave(ac, master, start);

  /* Swells are laid down every 3.5–9.5s while each one runs 6–12s, so the
     next one is usually underway before the last has finished — the shore
     never pauses between them, but a trough is still a trough. Surf arrives
     in sets, so the interval varies rather than ticking. */
  oceanNext = start + length * rand(0.55, 0.85);

  const waitMs = Math.max(150, (oceanNext - ac.currentTime) * 1000 - 700);
  oceanTimer = window.setTimeout(() => pumpOcean(ac, master), waitMs);
}

/** Stop everything and drop the graph, so nothing keeps running while muted. */
function teardownOcean() {
  if (oceanTimer !== null) {
    clearTimeout(oceanTimer);
    oceanTimer = null;
  }
  live.forEach((node) => {
    try {
      node.stop();
    } catch {
      /* already stopped */
    }
    try {
      node.disconnect();
    } catch {
      /* already gone */
    }
  });
  live.clear();
  if (ocean) {
    for (const node of [ocean.master, ocean.air]) {
      try {
        node.disconnect();
      } catch {
        /* already gone */
      }
    }
    ocean = null;
  }
  bodyBuf = null;
  sprayBuf = null;
  oceanNext = 0;
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
  const gen = ++oceanGen;

  if (on) {
    if (!ocean) {
      ocean = buildOcean(ac);
      oceanNext = 0;
      pumpOcean(ac, ocean.master);
    }
    const now = ac.currentTime;
    const gain = ocean.master.gain;
    gain.cancelScheduledValues(now);
    gain.setValueAtTime(Math.max(gain.value, 0.0001), now);
    gain.linearRampToValueAtTime(OCEAN_GAIN, now + OCEAN_FADE);
    if (ac.state !== 'running') resumeWhenAllowed(ac);
    return;
  }

  /* Fade out, then drop the graph — a muted shore should not keep scheduling
     waves or holding an AudioContext open. The generation check drops this
     if they toggled back on before the fade finished. */
  const now = ac.currentTime;
  const gain = ocean!.master.gain;
  gain.cancelScheduledValues(now);
  gain.setValueAtTime(Math.max(gain.value, 0.0001), now);
  gain.linearRampToValueAtTime(0, now + OCEAN_FADE * 0.6);
  window.setTimeout(() => {
    if (gen === oceanGen) teardownOcean();
  }, OCEAN_FADE * 0.6 * 1000 + 150);
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
