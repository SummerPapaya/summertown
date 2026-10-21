import { motion, type Variants } from 'framer-motion';
import { ArrowUpRight, Wand2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, MouseEvent, PointerEvent } from 'react';
import { FLOOR_NUMERALS, floorToday, roomsFor, tickToday, type RoomIcon, type RoomMotif } from '@/lib/rooms';
import { useLanguage } from '@/lib/i18n';

/* One palette for the door, cut from the Magic House itself: the leaf is the
 * pale lilac of its walls, the arch interior a step deeper, and every line
 * printed on top is its window-frame purple. The knobs, stars and the dial's
 * hub borrow the butter moon over the chimney; the needle is coral. The CSS
 * half of the door (shapes, the ride between floors) is the .fd-* block in
 * index.css. */
const FRAME = '#8a79d6';
const LEAF = '#e3dcf8';
const INNER_LINE = 'rgba(138,121,214,0.5)';
const CORAL = '#ff9b9b';
const INK = '#4a4470';
const INK_SOFT = '#7b74a3';

/** little 4-point sparkle, echoing the stars drifting around the house */
function Sparkle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        d="M12 2c.9 5.2 3 7.6 10 10-7 2.4-9.1 4.8-10 10-.9-5.2-3-7.6-10-10 7-2.4 9.1-4.8 10-10Z"
        fill="var(--butter)"
      />
    </svg>
  );
}

/** the door plate's glyph: a wand, a scrying orb, or a tarot card for Oracle Inn */
function RoomGlyph({ icon, className }: { icon: RoomIcon; className?: string }) {
  if (icon === 'wand') return <Wand2 className={className} />;
  if (icon === 'card')
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
        <rect x="5.5" y="2.5" width="13" height="19" rx="2.2" />
        <path d="M12 7.6l1.2 2.5 2.7.3-2 1.9.6 2.7L12 13.6 9.5 15l.6-2.7-2-1.9 2.7-.3z" fill="currentColor" strokeWidth="1" />
      </svg>
    );
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round">
      <circle cx="16" cy="14" r="9.5" />
      <path d="M8.4 17.6a9.5 9.5 0 0 0 15.2 0" />
      <path d="M12.6 23.7 11 27h10l-1.6-3.3" />
    </svg>
  );
}

/** an eight-point star for Oracle Inn, long and short points in turn */
const STAR8 = (() => {
  let d = '';
  for (let i = 0; i < 16; i++) {
    const a = (i * Math.PI) / 8 - Math.PI / 2, r = i % 2 ? 7.2 : 17;
    d += `${i ? 'L' : 'M'}${(26 + r * Math.cos(a)).toFixed(2)} ${(26 + r * Math.sin(a)).toFixed(2)}`;
  }
  return `${d}Z`;
})();

/** the floor's own medallion in the middle of each leaf */
function Medal({ motif, className }: { motif: RoomMotif; className?: string }) {
  return (
    <svg viewBox="0 0 52 52" className={className} aria-hidden>
      {motif === 'flower' && (
        <>
          <g fill="none" stroke={FRAME} strokeWidth="2" strokeLinejoin="round">
            {[0, 60, 120, 180, 240, 300].map((a) => (
              <path key={a} d="M26 26c4.6-5.6 4.6-12 0-17.8-4.6 5.8-4.6 12.2 0 17.8Z" transform={`rotate(${a} 26 26)`} />
            ))}
          </g>
          <circle cx="26" cy="26" r="3" fill="var(--butter)" />
        </>
      )}
      {motif === 'moon' && (
        <>
          <path d="M33.6 9.4A16 16 0 1 0 33.6 36.6 12.6 12.6 0 0 1 33.6 9.4Z" fill={FRAME} />
          <path
            d="M41 12c.5 2.6 1.5 3.8 4.4 5-2.9 1.2-3.9 2.4-4.4 5-.5-2.6-1.5-3.8-4.4-5 2.9-1.2 3.9-2.4 4.4-5Z"
            fill="var(--butter)"
            transform="scale(.85) translate(6,1)"
          />
          <path
            d="M43 28c.4 2 1.1 2.9 3.4 3.8-2.3.9-3 1.8-3.4 3.8-.4-2-1.1-2.9-3.4-3.8 2.3-.9 3-1.8 3.4-3.8Z"
            fill="var(--butter)"
            transform="scale(.7) translate(16,10)"
          />
        </>
      )}
      {motif === 'star' && (
        <>
          <path d={STAR8} fill="none" stroke={FRAME} strokeWidth="2" strokeLinejoin="round" />
          <circle cx="26" cy="26" r="3.2" fill="var(--butter)" />
        </>
      )}
    </svg>
  );
}

/* beaded lozenges strung up and down the panel, and the two butter pips
   between them — percentages so they ride the leaf as it resizes */
const BEADS = [27, 35, 65, 73];
const BEAD_DOTS = [31, 69];

/**
 * The inlay of the left leaf; the right leaf renders it mirrored. The two
 * leaves share one arch: each half curves on its outer side and is square at
 * the seam, so together they close into a single arched door, with the fleur
 * split down the seam under the apex.
 *
 * Layers, bottom to top: the deeper arch interior, a trellis pressed into it,
 * a second frame line just inside the first, the fleur, the floor's
 * medallion (it turns over when the floor changes), beading above and below
 * it, and a lozenge pair at the foot.
 */
function DoorOrnament({ motif, oldMotif, turn }: { motif: RoomMotif; oldMotif: RoomMotif | null; turn: number }) {
  return (
    <>
      <span className="fd-leaf-frame" />
      <span className="fd-arch" />
      <span className="fd-trellis" />
      <span className="fd-inner" />
      <svg viewBox="0 0 40 34" className="fd-fleur" aria-hidden>
        <g fill="none" stroke={FRAME} strokeWidth="2.1" strokeLinecap="round">
          <path d="M20 3.4c3.6 4.4 5.6 8 5.6 11.2 0 3.4-2.5 5.7-5.6 5.7s-5.6-2.3-5.6-5.7c0-3.2 2-6.8 5.6-11.2Z" />
          <path d="M14.4 15.2c-3.2-1.4-6.2-.4-6.2 2.2 0 2.2 1.8 3.6 4 3.6" />
          <path d="M25.6 15.2c3.2-1.4 6.2-.4 6.2 2.2 0 2.2-1.8 3.6-4 3.6" />
          <path d="M20 20.3v6.2M16.6 29.4h6.8" />
        </g>
        <circle cx="20" cy="12.6" r="1.5" fill="var(--butter)" />
      </svg>
      <span className="fd-medal">
        {oldMotif && <Medal key={`out-${turn}`} motif={oldMotif} className="is-out" />}
        <Medal key={`in-${turn}`} motif={motif} className={oldMotif ? 'is-in' : undefined} />
      </span>
      {BEADS.map((top) => (
        <span key={top} className="fd-bead" style={{ top: `${top}%` }} />
      ))}
      {BEAD_DOTS.map((top) => (
        <span key={top} className="fd-dot" style={{ top: `${top}%` }} />
      ))}
      <span className="fd-foot1" />
      <span className="fd-foot2" />
      <Sparkle className="fd-sparkle" />
    </>
  );
}

/* the dial on the lintel: a small half-disc, its floors spread over 116° */
const CX = 66;
const CY = 64;
const at = (deg: number, r: number): [number, number] => {
  const a = (deg * Math.PI) / 180;
  return [CX + r * Math.sin(a), CY - r * Math.cos(a)];
};
const f1 = (n: number) => n.toFixed(1);
const TICKS = Array.from({ length: 19 }, (_, k) => -72 + k * 8);

/** how long a mouse must rest on the door before it opens, and how far it may drift meanwhile */
const REST_MS = 320;
const REST_SLOP = 4;

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const touchFirst = () => typeof window !== 'undefined' && window.matchMedia('(hover: none)').matches;

/**
 * The floating front door — one door for all the rooms registered in
 * src/lib/rooms.ts for this landmark, one floor each, as the Magic House lore
 * has it: the door opens onto a different floor every time.
 *
 * A small dial on the lintel and a panel of floors (a row of chips on narrow
 * cards) pick the floor; the door opens at today's floor, the same for
 * everyone on the same day. Changing floor closes the leaves, swings the
 * needle, lifts the door a little with a band of light passing it, rolls the
 * numeral on the plate and turns the medallion over, then parts the leaves
 * for a peek. With a mouse, resting on the door opens it (a pointer only
 * passing over leaves it shut) and a click goes in; on a touch screen the
 * first tap opens it, the second goes in, and a sideways swipe changes floor.
 * ← → work from the keyboard too.
 *
 * The room opens in the language the visitor is reading the site in: the
 * current language rides along on the link, and each room honours ?lang=.
 */
export default function FrontDoors({ landmarkId, variants }: { landmarkId: string; variants: Variants }) {
  const { t, lang } = useLanguage();
  const rooms = useMemo(() => roomsFor(landmarkId), [landmarkId]);
  const n = rooms.length;
  const today = useMemo(() => floorToday(n), [n]);
  const reduced = useMemo(() => reducedMotion(), []);
  const touch = useMemo(() => touchFirst(), []);

  /* cur: the floor the dial points at; shown: the room behind the door, which
     changes halfway through the ride */
  const [cur, setCur] = useState(today);
  const [shown, setShown] = useState(today);
  const [open, setOpen] = useState(false);
  const [peek, setPeek] = useState(false);
  const [ride, setRide] = useState(0); // alternates 1 / 2 to restart the CSS animation
  const [bump, setBump] = useState(0);
  const [ding, setDing] = useState(0);
  const [dir, setDir] = useState(1);
  const [captionFade, setCaptionFade] = useState(false);
  const [medal, setMedal] = useState<{ old: RoomMotif | null; turn: number }>({ old: null, turn: 0 });
  const [numeral, setNumeral] = useState<{ old: number | null; dir: number; turn: number }>({ old: null, dir: 1, turn: 0 });
  const [toast, setToast] = useState('');
  const [live, setLive] = useState('');

  const curRef = useRef(today);
  const busy = useRef(false);
  const queued = useRef<number | null>(null);
  const hovering = useRef(false);   // the mouse is over the door
  const rested = useRef(false);     // and has stopped there, so the door is meant to be open
  const restTimer = useRef(0);
  const restAt = useRef({ x: 0, y: 0 });
  const openRef = useRef(false);
  const peekRef = useRef(false);
  const doorRef = useRef<HTMLAnchorElement>(null);
  const timers = useRef<number[]>([]);
  const gesture = useRef({ x: 0, y: 0, type: 'mouse', swiped: false });

  const later = useCallback((fn: () => void, ms: number) => { timers.current.push(window.setTimeout(fn, ms)); }, []);
  const sleep = useCallback((ms: number) => new Promise<void>((done) => later(done, reduced ? 0 : ms)), [later, reduced]);
  const setPeekBoth = useCallback((on: boolean) => { peekRef.current = on; setPeek(on); }, []);
  const setOpenBoth = useCallback((on: boolean) => { openRef.current = on; setOpen(on); if (on) setPeekBoth(false); }, [setPeekBoth]);

  useEffect(() => () => { timers.current.forEach((id) => window.clearTimeout(id)); window.clearTimeout(restTimer.current); }, []);

  const toastTimer = useRef(0);
  const say = useCallback((msg: string) => {
    setToast(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(''), 2600);
  }, []);

  const hrefFor = (href: string) => {
    try {
      const url = new URL(href);
      url.searchParams.set('lang', lang);
      return url.toString();
    } catch {
      return href;
    }
  };

  const goTo = useCallback(
    async function go(i: number): Promise<void> {
      if (i < 0 || i >= n) {
        setBump((b) => (b === 1 ? 2 : 1));
        later(() => setBump(0), 450);                // or it would hold the door's animation slot over the next ride
        say(t(i < 0 ? 'rooms.bottom' : 'rooms.top'));
        return;
      }
      if (busy.current) { queued.current = i; return; }
      if (i === curRef.current) return;
      busy.current = true;
      const from = curRef.current, d = i > from ? 1 : -1;
      setLive(t('rooms.arrived', { floor: FLOOR_NUMERALS[i], title: t(rooms[i].titleKey) }));
      if (reduced) {
        curRef.current = i; setCur(i); setShown(i);
        busy.current = false;
        return;
      }
      // 1. close the leaves if they are open
      const wasOpen = openRef.current || peekRef.current;
      setOpenBoth(false); setPeekBoth(false);
      if (wasOpen) await sleep(420);
      // 2. the ride: the needle swings, the door lifts, the medallion turns over, the numeral rolls
      curRef.current = i;
      setDir(d); setCur(i);
      setRide((r) => (r === 1 ? 2 : 1));
      setMedal((m) => ({ old: rooms[from].motif, turn: m.turn + 1 }));
      setNumeral((m) => ({ old: from, dir: d, turn: m.turn + 1 }));
      later(() => { setMedal((m) => ({ ...m, old: null })); setNumeral((m) => ({ ...m, old: null })); }, 480);
      setCaptionFade(true);
      await sleep(330);
      setShown(i); setCaptionFade(false);
      await sleep(420);
      setRide(0);
      // 3. ding, and the door parts a little to show the room
      setDing((x) => (x === 1 ? 2 : 1));
      later(() => setDing(0), 600);
      if (!rested.current) {
        setPeekBoth(true);
        await sleep(1100);
        if (!hovering.current && !openRef.current) setPeekBoth(false);
      } else {
        setOpenBoth(true);
      }
      busy.current = false;
      const q = queued.current;
      queued.current = null;
      if (q !== null && q !== curRef.current) void go(q);
    },
    [n, reduced, rooms, say, setOpenBoth, setPeekBoth, sleep, later, t],
  );

  // first sight: the door parts a little, so it reads as a door you can open
  useEffect(() => {
    if (reduced) return;
    later(() => {
      if (hovering.current || busy.current) return;
      setPeekBoth(true);
      later(() => { if (!hovering.current) setPeekBoth(false); }, 1200);
    }, 1900);
  }, [later, reduced, setPeekBoth]);

  // keep the other rooms warm, so changing floor never shows an empty door
  useEffect(() => {
    rooms.forEach((r) => { const im = new Image(); im.src = r.shot; });
  }, [rooms]);

  // a tap anywhere else closes a door opened by touch
  useEffect(() => {
    const away = (e: globalThis.PointerEvent) => {
      if (e.pointerType !== 'mouse' && doorRef.current && !doorRef.current.contains(e.target as Node)) setOpenBoth(false);
    };
    document.addEventListener('pointerdown', away);
    return () => document.removeEventListener('pointerdown', away);
  }, [setOpenBoth]);

  if (n === 0) return null;
  const room = rooms[shown];
  const target = rooms[cur];
  const title = t(room.titleKey);

  /* a mouse opens the door only once it rests on it: every move of more than a few pixels restarts the
     wait, so a pointer sweeping across the door on its way somewhere else leaves it shut */
  const waitForRest = (x: number, y: number) => {
    restAt.current = { x, y };
    window.clearTimeout(restTimer.current);
    restTimer.current = window.setTimeout(() => {
      if (!hovering.current) return;
      rested.current = true;
      if (!busy.current) setOpenBoth(true);
    }, REST_MS);
  };
  const onEnter = (e: PointerEvent) => {
    gesture.current.type = e.pointerType;
    if (e.pointerType === 'mouse') { hovering.current = true; waitForRest(e.clientX, e.clientY); }
  };
  const onMove = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse' || !hovering.current || rested.current) return;
    if (Math.hypot(e.clientX - restAt.current.x, e.clientY - restAt.current.y) > REST_SLOP) waitForRest(e.clientX, e.clientY);
  };
  const onLeave = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    hovering.current = false; rested.current = false;
    window.clearTimeout(restTimer.current);
    setOpenBoth(false);
  };
  const onDown = (e: PointerEvent) => {
    gesture.current = { x: e.clientX, y: e.clientY, type: e.pointerType, swiped: false };
  };
  const onUp = (e: PointerEvent) => {
    if (e.pointerType === 'mouse') return;
    const dx = e.clientX - gesture.current.x, dy = e.clientY - gesture.current.y;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.2) {
      gesture.current.swiped = true;
      void goTo(curRef.current + (dx < 0 ? 1 : -1));
    }
  };
  const onClick = (e: MouseEvent) => {
    if (gesture.current.swiped) { e.preventDefault(); gesture.current.swiped = false; return; }
    if (gesture.current.type !== 'mouse' && !openRef.current) { e.preventDefault(); setOpenBoth(true); }
  };
  const onKeys = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); void goTo(curRef.current + 1); }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); void goTo(curRef.current - 1); }
  };
  const angle = (i: number) => (n === 1 ? 0 : -58 + (116 * i) / (n - 1));

  const doorClass = [
    'fd-door',
    open && 'is-open',
    peek && !open && 'is-peek',
    ride && `is-ride-${ride}`,
    bump && `is-bump-${bump}`,
  ].filter(Boolean).join(' ');

  return (
    <motion.section variants={variants} className="fd-root mt-6" aria-labelledby="fd-heading" onKeyDown={onKeys}>
      <div className="flex items-center gap-3">
        <h3 id="fd-heading" className="text-[0.72rem] font-extrabold uppercase tracking-[0.16em] text-ink-soft">
          {t('rooms.heading')}
        </h3>
        <span className="h-px flex-1 bg-ink/10" />
      </div>
      <p className="mt-1.5 text-xs font-semibold text-ink-soft">{t('rooms.hint')}</p>

      <div className="fd-layout">
        <div className="fd-stage">
          {/* the dial on the lintel */}
          <svg className="fd-dial" viewBox="0 0 132 70" role="group" aria-label={t('rooms.dial')}>
            <path d={`M6 ${CY} A60 60 0 0 1 126 ${CY} Z`} fill={LEAF} stroke={FRAME} strokeWidth="2" strokeLinejoin="round" />
            <path d={`M10.5 ${CY} A55.5 55.5 0 0 1 121.5 ${CY}`} fill="none" stroke={FRAME} strokeWidth=".8" opacity=".7" />
            <path d={`M22 ${CY} A44 44 0 0 1 110 ${CY}`} fill="none" stroke={INNER_LINE} strokeWidth="1" />
            {TICKS.map((d) => {
              const [x1, y1] = at(d, 49.5), [x2, y2] = at(d, 53);
              return <line key={d} x1={f1(x1)} y1={f1(y1)} x2={f1(x2)} y2={f1(y2)} stroke={INNER_LINE} strokeWidth="1" strokeLinecap="round" />;
            })}
            {rooms.map((r, i) => {
              const a = angle(i), [x1, y1] = at(a, 46), [x2, y2] = at(a, 54), [nx, ny] = at(a, 35.5), on = i === cur;
              return (
                <g
                  key={r.id}
                  className="fd-dn"
                  role="button"
                  tabIndex={0}
                  aria-pressed={on}
                  aria-label={t('rooms.goTo', { floor: FLOOR_NUMERALS[i], title: t(r.floorKey ?? r.titleKey) })}
                  onClick={() => void goTo(i)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); void goTo(i); } }}
                >
                  <circle className="fd-hit" cx={f1(nx)} cy={f1(ny)} r="10" fill="transparent" />
                  <line x1={f1(x1)} y1={f1(y1)} x2={f1(x2)} y2={f1(y2)} stroke={on ? CORAL : FRAME} strokeWidth="1.8" strokeLinecap="round" />
                  <text x={f1(nx)} y={f1(ny + 3.7)} textAnchor="middle" fontFamily="Fredoka, Nunito, sans-serif" fontWeight={on ? 700 : 600} fontSize="10.5" fill={on ? INK : INK_SOFT}>
                    {FLOOR_NUMERALS[i]}
                  </text>
                </g>
              );
            })}
            <path d="M66 -1 L69 3.6 L66 8.2 L63 3.6 Z" fill="var(--butter)" stroke={FRAME} strokeWidth=".9" strokeLinejoin="round" />
            <g className="fd-needle" style={{ transform: `rotate(${angle(cur)}deg)` }}>
              <path d={`M66 ${CY} L64.7 ${CY - 7} L66 ${CY - 27} L67.3 ${CY - 7} Z`} fill={CORAL} />
              <circle cx="66" cy={CY - 27} r="1.5" fill={CORAL} />
            </g>
            <circle cx="66" cy={CY} r="4.6" fill="var(--butter)" stroke={FRAME} strokeWidth="1.5" />
            <circle cx="66" cy={CY} r="1.2" fill={FRAME} />
          </svg>

          {/* the door: the room sits behind, the two leaves cover it */}
          <a
            ref={doorRef}
            href={hrefFor(room.href)}
            target="_blank"
            rel="noreferrer"
            className={doorClass}
            style={{ '--dir': dir } as CSSProperties}
            aria-label={t('rooms.doorLabel', { floor: FLOOR_NUMERALS[shown], title })}
            onPointerEnter={onEnter}
            onPointerMove={onMove}
            onPointerLeave={onLeave}
            onPointerDown={onDown}
            onPointerUp={onUp}
            onClick={onClick}
          >
            <img src={room.shot} alt={title} className="fd-room" style={{ background: room.accent }} decoding="async" />
            {[0, 1].map((side) => (
              <div key={side} aria-hidden className={`fd-leaf ${side ? 'fd-right' : 'fd-left'}`}>
                <div className="fd-orn" style={side ? { transform: 'scaleX(-1)' } : undefined}>
                  <DoorOrnament motif={target.motif} oldMotif={medal.old} turn={medal.turn} />
                </div>
                <span className="fd-knob" />
              </div>
            ))}
            {/* the plate: the floor and today's minute tick */}
            <span aria-hidden className={`fd-plate ex-chip${ding ? ` is-ding-${ding}` : ''}`}>
              <RoomGlyph icon={target.Icon} className="h-3 w-3 text-coral" />
              <span className="fd-coord">
              <span className="fd-num-wrap">
                {numeral.old !== null && (
                  <span key={`o${numeral.turn}`} className={`fd-num is-gone ${numeral.dir > 0 ? 'go-up' : 'go-down'}`}>
                    {FLOOR_NUMERALS[numeral.old]}
                  </span>
                )}
                <span key={`n${numeral.turn}`} className={`fd-num${numeral.old !== null ? (numeral.dir > 0 ? ' come-up' : ' come-down') : ''}`}>
                  {FLOOR_NUMERALS[cur]}
                </span>
              </span>
              °{tickToday(target.coordSeed)}′
              </span>
            </span>
            <span aria-hidden className="fd-peek ex-chip">{t(touch ? 'rooms.peekTouch' : 'rooms.peek')}</span>
          </a>
          <div className={`fd-toast${toast ? ' is-show' : ''}`} role="status">{toast}</div>
        </div>

        {/* the panel of floors, top floor first on wide cards */}
        <aside className="fd-panel" aria-label={t('rooms.floors')}>
          <div className="fd-panel-head">
            <h4>{t('rooms.floors')}</h4>
            <span>{t('rooms.todayAt', { floor: FLOOR_NUMERALS[today] })}</span>
          </div>
          <ul className="fd-floors">
            {rooms.map((r, i) => (
              <li key={r.id}>
                <button type="button" className="fd-fb" aria-pressed={i === cur} onClick={() => void goTo(i)}>
                  <span className="fd-fb-num">{FLOOR_NUMERALS[i]}</span>
                  <span className="fd-fb-name font-hand">{t(r.floorKey ?? r.titleKey)}</span>
                  {i === today && <span className="fd-mini-today" aria-hidden />}
                  {i === today && <span className="fd-tag">{t('rooms.todayTag')}</span>}
                </button>
              </li>
            ))}
          </ul>
          <p className="fd-panel-foot">{t(touch ? 'rooms.footTouch' : 'rooms.footMouse')}</p>
        </aside>

        {/* the caption under the door */}
        <div className={`fd-caption${captionFade ? ' is-fade' : ''}`}>
          <h4 className="font-hand text-[1.35rem] leading-tight text-ink">{title}</h4>
          <p className="mt-0.5 text-xs font-semibold leading-relaxed text-ink-soft">{t(room.descKey)}</p>
          <a className="fd-enter" href={hrefFor(room.href)} target="_blank" rel="noreferrer">
            {t('rooms.enter')}
            <ArrowUpRight className="h-4 w-4 text-coral" />
          </a>
        </div>
      </div>
      <p className="sr-only" aria-live="polite">{live}</p>
    </motion.section>
  );
}
