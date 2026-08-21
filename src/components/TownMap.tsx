import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import gsap from 'gsap';
import { Plus, Minus, Compass as CompassIcon, X } from 'lucide-react';
import {
  LANDMARKS,
  FILTERS,
  PIER,
  WORLD,
  byId,
} from '@/lib/landmarks';
import type { Landmark, FilterId } from '@/lib/landmarks';
import { useTown } from '@/lib/town';
import { useLanguage, enText } from '@/lib/i18n';
import { playChime, playStatic } from '@/lib/sound';
import SparkleField from './SparkleField';
import DetailCard from './DetailCard';
import { cn } from '@/lib/utils';

const TOUR_STOPS = ['town-hall', 'radio', 'apple-cottage', 'windbell-isle'];

interface Cam {
  x: number;
  y: number;
  s: number;
}

export interface OpenRequest {
  id: string;
  key: number;
}

interface TownMapProps {
  heroVisible: boolean;
  tourSignal: number;
  openRequest: OpenRequest | null;
  onTourDone: (completed: boolean) => void;
}

export default function TownMap({
  heroVisible,
  tourSignal,
  openRequest,
  onTourDone,
}: TownMapProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const cam = useRef<Cam>({ x: 0, y: 0, s: 0.5 });
  const sway = useRef({ x: 0, y: 0 });
  const baseScale = useRef(0.5);
  const priorView = useRef<Cam | null>(null);
  const dragMoved = useRef(false);
  const idleTimer = useRef<number>(0);
  const swayTween = useRef<gsap.core.Tween | null>(null);
  const tourCancel = useRef(false);
  const reduced = useRef(false);

  const { stamps, setMapDetailOpen, soundOn } = useTown();
  const { t } = useLanguage();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterId>('all');
  const [pierOpen, setPierOpen] = useState(false);
  const [touring, setTouring] = useState(false);
  const [tourStop, setTourStop] = useState<string | null>(null);
  const [zoomedOnce, setZoomedOnce] = useState(false);
  const [compassSpin, setCompassSpin] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  const selected = byId(selectedId) ?? null;
  const hudIn = !heroVisible && !selected && !touring;

  /* ---------------- camera helpers ---------------- */
  const applyCam = useCallback(() => {
    const el = worldRef.current;
    if (!el) return;
    const { x, y, s } = cam.current;
    el.style.transform = `translate3d(${x + sway.current.x}px, ${y + sway.current.y}px, 0) scale(${s})`;
  }, []);

  const centerOn = useCallback((wx: number, wy: number, s: number): Cam => {
    const stage = stageRef.current;
    const vw = stage ? stage.clientWidth : window.innerWidth;
    const vh = stage ? stage.clientHeight : window.innerHeight;
    const mx = vw * 0.3;
    const my = vh * 0.3;
    let x = vw / 2 - wx * s;
    let y = vh / 2 - wy * s;
    const minX = vw - WORLD.w * s - mx;
    const maxX = mx;
    const minY = vh - WORLD.h * s - my;
    const maxY = my;
    x = Math.min(maxX, Math.max(minX, x));
    y = Math.min(maxY, Math.max(minY, y));
    return { x, y, s };
  }, []);

  const tweenCam = useCallback(
    (to: Cam, duration: number, ease = 'power3.inOut') => {
      gsap.killTweensOf(cam.current);
      return new Promise<void>((resolve) => {
        gsap.to(cam.current, {
          ...to,
          duration: reduced.current ? Math.min(duration, 0.3) : duration,
          ease,
          onUpdate: applyCam,
          onComplete: resolve,
        });
      });
    },
    [applyCam],
  );

  const overviewCam = useCallback((): Cam => {
    const stage = stageRef.current;
    const vw = stage ? stage.clientWidth : window.innerWidth;
    const vh = stage ? stage.clientHeight : window.innerHeight;
    const s = baseScale.current;
    return { x: (vw - WORLD.w * s) / 2, y: (vh - WORLD.h * s) / 2, s };
  }, []);

  const landmarkCam = useCallback(
    (lm: Landmark, zoomOverride?: number): Cam => {
      const zoomFactor = (zoomOverride ?? lm.zoom) * (isMobile ? 0.7 : 1);
      const s = baseScale.current * zoomFactor;
      return centerOn(lm.anchor.x, lm.anchor.y + 80, s);
    },
    [centerOn, isMobile],
  );

  /* ---------------- idle sway ---------------- */
  const stopSway = useCallback(() => {
    swayTween.current?.kill();
    swayTween.current = null;
    gsap.to(sway.current, { x: 0, y: 0, duration: 0.6, onUpdate: applyCam });
    if (idleTimer.current) window.clearTimeout(idleTimer.current);
  }, [applyCam]);

  const armIdle = useCallback(() => {
    if (idleTimer.current) window.clearTimeout(idleTimer.current);
    if (reduced.current) return;
    idleTimer.current = window.setTimeout(() => {
      if (selectedId || touring || heroVisible) return;
      const stage = stageRef.current;
      const amp = stage ? stage.clientWidth * 0.01 : 14;
      const proxy = { t: 0 };
      swayTween.current = gsap.to(proxy, {
        t: Math.PI * 2,
        duration: 20,
        repeat: -1,
        ease: 'none',
        onUpdate: () => {
          sway.current.x = Math.sin(proxy.t) * amp;
          sway.current.y = Math.sin(proxy.t * 2) * amp * 0.6;
          applyCam();
        },
      });
    }, 8000);
  }, [applyCam, selectedId, touring, heroVisible]);

  const interact = useCallback(() => {
    stopSway();
    armIdle();
  }, [stopSway, armIdle]);

  /* ---------------- init & resize ---------------- */
  useEffect(() => {
    reduced.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const stage = stageRef.current;
    if (!stage) return;
    const layout = () => {
      const w = stage.clientWidth;
      const h = stage.clientHeight;
      baseScale.current = Math.max(w / WORLD.w, h / WORLD.h);
      setIsMobile(w < 768);
      if (!selectedId) {
        const s = baseScale.current * (heroVisible ? 0.92 : 1);
        cam.current = {
          x: (w - WORLD.w * s) / 2,
          y: (h - WORLD.h * s) / 2,
          s,
        };
        applyCam();
      }
    };
    layout();
    const ro = new ResizeObserver(layout);
    ro.observe(stage);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* hero state → camera: dimmed 0.92 drift vs descend to 1.0 */
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const w = stage.clientWidth;
    const h = stage.clientHeight;
    if (heroVisible) {
      const s = baseScale.current * 0.92;
      gsap.killTweensOf(cam.current);
      cam.current = { x: (w - WORLD.w * s) / 2, y: (h - WORLD.h * s) / 2, s };
      applyCam();
      if (!reduced.current) {
        gsap.to(cam.current, {
          x: cam.current.x - WORLD.w * s * 0.015,
          duration: 20,
          ease: 'sine.inOut',
          yoyo: true,
          repeat: -1,
          onUpdate: applyCam,
        });
      }
    } else {
      const target = overviewCam();
      void tweenCam(target, 1.1, 'power3.inOut').then(() => armIdle());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [heroVisible]);

  /* ---------------- landmark open / close ---------------- */
  const openLandmark = useCallback(
    (lm: Landmark) => {
      if (touring) {
        tourCancel.current = true;
        setTouring(false);
        setTourStop(null);
        onTourDone(false);
      }
      if (!selectedId) priorView.current = { ...cam.current };
      setPierOpen(false);
      setHoveredId(null);
      setSelectedId(lm.id);
      setMapDetailOpen(true);
      setZoomedOnce(true);
      if (soundOn) {
        if (lm.id === 'windbell-isle') playChime();
        if (lm.id === 'radio') playStatic();
      }
      void tweenCam(landmarkCam(lm), 1.1, 'power3.inOut');
    },
    [touring, selectedId, setMapDetailOpen, tweenCam, landmarkCam, soundOn, onTourDone],
  );

  const closeLandmark = useCallback(() => {
    if (!selectedId) return;
    setSelectedId(null);
    setMapDetailOpen(false);
    const back = priorView.current ?? overviewCam();
    void tweenCam(back, 0.9, 'power3.inOut').then(() => armIdle());
  }, [selectedId, setMapDetailOpen, tweenCam, overviewCam, armIdle]);

  const nextLandmark = useCallback(() => {
    if (!selected) return;
    const idx = LANDMARKS.findIndex((l) => l.id === selected.id);
    const next = LANDMARKS[(idx + 1) % LANDMARKS.length];
    setSelectedId(next.id);
    if (soundOn && next.id === 'windbell-isle') playChime();
    void tweenCam(landmarkCam(next), 1.1, 'power3.inOut');
  }, [selected, tweenCam, landmarkCam, soundOn]);

  /* external open requests (deep links, field notes, pier popover) */
  useEffect(() => {
    if (!openRequest) return;
    const lm = byId(openRequest.id);
    if (lm) openLandmark(lm);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openRequest?.key]);

  /* Esc closes */
  useEffect(() => {
    if (!selectedId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLandmark();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedId, closeLandmark]);

  /* ---------------- ferry tour ---------------- */
  useEffect(() => {
    if (tourSignal === 0) return;
    let alive = true;
    tourCancel.current = false;
    setTouring(true);
    (async () => {
      for (const id of TOUR_STOPS) {
        if (!alive || tourCancel.current) break;
        const lm = byId(id);
        if (!lm) continue;
        setTourStop(id);
        if (soundOn && id === 'windbell-isle') playChime();
        await tweenCam(landmarkCam(lm, 2.2), 1.4, 'power3.inOut');
        await new Promise((r) => window.setTimeout(r, 2400));
      }
      if (alive) {
        setTourStop(null);
        setTouring(false);
        await tweenCam(overviewCam(), 1.2, 'power3.inOut');
        onTourDone(true);
        armIdle();
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tourSignal]);

  const cancelTour = useCallback(() => {
    tourCancel.current = true;
    setTourStop(null);
    setTouring(false);
    void tweenCam(overviewCam(), 0.9, 'power3.inOut').then(() => {
      onTourDone(false);
      armIdle();
    });
  }, [tweenCam, overviewCam, onTourDone, armIdle]);

  /* ---------------- drag pan + wheel zoom ---------------- */
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    let dragging = false;
    let sx = 0;
    let sy = 0;
    let startX = 0;
    let startY = 0;

    const bounds = (s: number) => {
      const vw = stage.clientWidth;
      const vh = stage.clientHeight;
      return {
        minX: vw - WORLD.w * s,
        maxX: 0,
        minY: vh - WORLD.h * s,
        maxY: 0,
        vw,
        vh,
      };
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (selectedId) return;
      dragging = true;
      dragMoved.current = false;
      sx = e.clientX;
      sy = e.clientY;
      startX = cam.current.x;
      startY = cam.current.y;
      gsap.killTweensOf(cam.current);
      interact();
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - sx;
      const dy = e.clientY - sy;
      if (Math.abs(dx) + Math.abs(dy) > 6) {
        if (!dragMoved.current) {
          // capture only once it's a real drag, so plain clicks still reach buttons
          try {
            stage.setPointerCapture(e.pointerId);
          } catch {
            /* ignore */
          }
        }
        dragMoved.current = true;
      }
      const s = cam.current.s;
      const b = bounds(s);
      const overX = b.vw * 0.1;
      const overY = b.vh * 0.1;
      let nx = startX + dx;
      let ny = startY + dy;
      if (nx > b.maxX) nx = b.maxX + (nx - b.maxX) * 0.35;
      if (nx < b.minX) nx = b.minX + (nx - b.minX) * 0.35;
      if (ny > b.maxY) ny = b.maxY + (ny - b.maxY) * 0.35;
      if (ny < b.minY) ny = b.minY + (ny - b.minY) * 0.35;
      cam.current.x = Math.min(b.maxX + overX, Math.max(b.minX - overX, nx));
      cam.current.y = Math.min(b.maxY + overY, Math.max(b.minY - overY, ny));
      applyCam();
    };

    const onPointerUp = () => {
      if (!dragging) return;
      dragging = false;
      const s = cam.current.s;
      const b = bounds(s);
      const cx = Math.min(b.maxX, Math.max(b.minX, cam.current.x));
      const cy = Math.min(b.maxY, Math.max(b.minY, cam.current.y));
      if (cx !== cam.current.x || cy !== cam.current.y) {
        gsap.to(cam.current, {
          x: cx,
          y: cy,
          duration: 0.5,
          ease: 'elastic.out(1, 0.6)',
          onUpdate: applyCam,
        });
      }
      window.setTimeout(() => {
        dragMoved.current = false;
      }, 50);
    };

    const onWheel = (e: WheelEvent) => {
      // let the detail card scroll natively
      if ((e.target as HTMLElement | null)?.closest?.('[role="dialog"]')) return;
      e.preventDefault();
      if (selectedId) return;
      interact();
      const rect = stage.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      const maxZoom = isMobile ? 1.6 : 2;
      const minS = baseScale.current * 0.8;
      const maxS = baseScale.current * maxZoom;
      const old = cam.current.s;
      const next = Math.min(maxS, Math.max(minS, old * Math.exp(-e.deltaY * 0.0012)));
      if (next === old) return;
      const wx = (cx - cam.current.x) / old;
      const wy = (cy - cam.current.y) / old;
      gsap.killTweensOf(cam.current);
      cam.current.s = next;
      cam.current.x = cx - wx * next;
      cam.current.y = cy - wy * next;
      applyCam();
    };

    stage.addEventListener('pointerdown', onPointerDown);
    stage.addEventListener('pointermove', onPointerMove);
    stage.addEventListener('pointerup', onPointerUp);
    stage.addEventListener('pointercancel', onPointerUp);
    stage.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      stage.removeEventListener('pointerdown', onPointerDown);
      stage.removeEventListener('pointermove', onPointerMove);
      stage.removeEventListener('pointerup', onPointerUp);
      stage.removeEventListener('pointercancel', onPointerUp);
      stage.removeEventListener('wheel', onWheel);
    };
  }, [applyCam, interact, selectedId, isMobile]);

  /* ---------------- HUD zoom buttons ---------------- */
  const stepZoom = (dir: 1 | -1) => {
    interact();
    const maxZoom = isMobile ? 1.6 : 2;
    const old = cam.current.s;
    const next = Math.min(
      baseScale.current * maxZoom,
      Math.max(baseScale.current * 0.8, old * (dir === 1 ? 1.2 : 1 / 1.2)),
    );
    const stage = stageRef.current;
    const vw = stage ? stage.clientWidth : window.innerWidth;
    const vh = stage ? stage.clientHeight : window.innerHeight;
    const wx = (vw / 2 - cam.current.x) / old;
    const wy = (vh / 2 - cam.current.y) / old;
    void tweenCam({ x: vw / 2 - wx * next, y: vh / 2 - wy * next, s: next }, 0.5, 'power2.out');
  };

  const resetView = () => {
    setCompassSpin((n) => n + 1);
    interact();
    void tweenCam(overviewCam(), 0.9, 'power3.inOut');
  };

  const showHint = hudIn && (!zoomedOnce || stamps.length < 3);

  const hudSlide = (side: 'left' | 'right' | 'top' | 'bottom', i: number) => ({
    transform: hudIn
      ? 'translate(0,0)'
      : side === 'left'
        ? 'translateX(-60px)'
        : side === 'right'
          ? 'translateX(60px)'
          : side === 'top'
            ? 'translateY(-40px)'
            : 'translateY(40px)',
    opacity: hudIn ? 1 : 0,
    transition: `transform 0.6s cubic-bezier(0.22,1.2,0.36,1) ${i * 0.07}s, opacity 0.4s ease ${i * 0.07}s`,
    pointerEvents: hudIn ? ('auto' as const) : ('none' as const),
  });

  const tagFor = hoveredId ? byId(hoveredId) : tourStop ? byId(tourStop) : null;

  return (
    <div
      ref={stageRef}
      className="relative h-[100dvh] w-full select-none overflow-hidden"
      style={{
        touchAction: 'pan-y',
        background:
          'linear-gradient(to bottom, var(--sky-top), var(--sky-bottom) 42%, var(--water) 58%, var(--water-deep))',
        transition: 'background 1.2s ease',
      }}
    >
      {/* hero dim veil */}
      <div
        className="pointer-events-none absolute inset-0 z-[3000] bg-ink transition-opacity duration-700"
        style={{ opacity: heroVisible ? 0.25 : 0 }}
      />

      {/* ============ WORLD ============ */}
      <div
        ref={worldRef}
        className="absolute left-0 top-0 will-change-transform"
        style={{ width: WORLD.w, height: WORLD.h, transformOrigin: '0 0' }}
      >
        {/* terrain (extended canvas: +80px of northern sea) */}
        <img
          src="/map-base-ext.png"
          alt={t('map.mapAlt')}
          draggable={false}
          className="absolute inset-0 h-full w-full object-cover"
          style={{ zIndex: 1 }}
        />

        {/* map content — shifted +80px to match the extended canvas */}
        <div className="absolute left-0 w-full" style={{ top: 80, height: WORLD.h - 80 }}>
          {/* air / sparkle layer */}
          <SparkleField />

        {/* wave rings near south shore */}
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="ambient absolute rounded-full border-4 border-white/50"
            style={{
              left: 1450 + i * 260,
              top: 1310 + (i % 2) * 60,
              width: 120,
              height: 44,
              zIndex: 3,
              animation: `st-wave-pulse 3s ease-out ${i * 1}s infinite`,
            }}
          />
        ))}

        {/* boats */}
        <img
          src="/prop-boats.png"
          alt=""
          draggable={false}
          className="ambient absolute"
          style={{
            left: 1580,
            top: 1180,
            width: 420,
            zIndex: 4,
            animation: 'st-bob 3.8s ease-in-out infinite',
          }}
        />
        <img
          src="/prop-boats.png"
          alt=""
          draggable={false}
          className="ambient absolute"
          style={{
            left: 560,
            top: 240,
            width: 300,
            zIndex: 4,
            transform: 'scaleX(-1)',
            animation: 'st-bob 4.6s ease-in-out 0.8s infinite',
          }}
        />

        {/* fountain droplets in Central Garden */}
        <svg
          className="ambient absolute"
          style={{ left: 1323, top: 530, width: 76, height: 60, zIndex: 60 }}
          viewBox="0 0 76 60"
        >
          {[0, 1, 2].map((i) => (
            <circle
              key={i}
              cx={38}
              cy={46}
              r={6 + i * 7}
              fill="none"
              stroke="rgba(255,255,255,0.75)"
              strokeWidth="3"
              style={{
                transformOrigin: '38px 46px',
                animation: `st-wave-pulse 2.2s ease-out ${i * 0.7}s infinite`,
              }}
            />
          ))}
        </svg>

        {/* ============ LANDMARK CUTOUTS ============ */}
        {LANDMARKS.map((lm) => {
          const dimmed = filter !== 'all' && lm.filter !== filter;
          const pulsing = filter !== 'all' && lm.filter === filter;
          const zBase = 100 + Math.round(lm.anchor.y);
          return (
            <button
              key={lm.id}
              type="button"
              aria-label={t('map.open', { name: t(lm.nameKey) })}
              onClick={() => {
                if (!dragMoved.current && !heroVisible && !touring) openLandmark(lm);
              }}
              onMouseEnter={() => setHoveredId(lm.id)}
              onMouseLeave={() => setHoveredId(null)}
              onFocus={() => setHoveredId(lm.id)}
              onBlur={() => setHoveredId(null)}
              className="group absolute bg-transparent p-0 outline-none focus-visible:outline-none"
              style={{
                left: lm.anchor.x - lm.w / 2,
                top: lm.anchor.y - lm.w * 0.72,
                width: lm.w,
                height: lm.id === 'windbell-isle' ? lm.w * 0.72 : lm.w,
                zIndex: zBase,
                opacity: dimmed ? 0.35 : 1,
                filter: dimmed ? 'saturate(0.6)' : 'none',
                transition: 'opacity 0.4s ease, filter 0.4s ease',
              }}
            >
              {/* contact shadow */}
              <span
                className="absolute bottom-[2%] left-[12%] right-[12%] h-[7%] rounded-[50%] transition-all duration-300 group-hover:left-[8%] group-hover:right-[8%] group-hover:opacity-70"
                style={{ background: 'radial-gradient(ellipse, rgba(74,68,112,0.22), transparent 70%)' }}
              />
              {lm.id === 'windbell-isle' ? (
                <>
                  <img
                    src="/i-lighthouse.png"
                    alt=""
                    draggable={false}
                    className="absolute bottom-0 left-[2%] w-[38%] transition-transform duration-300 ease-squash group-hover:-translate-y-3 group-hover:scale-[1.04]"
                    style={{ zIndex: 2 }}
                  />
                  <img
                    src="/i-pavilion.png"
                    alt=""
                    draggable={false}
                    className="absolute bottom-0 left-1/2 w-[62%] -translate-x-1/2 transition-transform duration-300 ease-squash group-hover:-translate-y-2 group-hover:scale-[1.03]"
                    style={{ left: 'calc(50% - 50px)', bottom: 50, zIndex: 1 }}
                  />
                </>
              ) : (
                <img
                  src={lm.img}
                  alt=""
                  draggable={false}
                  className={cn(
                    'ambient relative w-full transition-transform duration-300 ease-squash group-hover:-translate-y-3 group-hover:scale-[1.05]',
                  )}
                  style={{
                    animation: pulsing
                      ? 'st-match-pulse 0.6s cubic-bezier(0.22,1.2,0.36,1)'
                      : undefined,
                  }}
                />
              )}
              {/* window glow dots (golden hour / starlight) */}
              <span
                className="pointer-events-none absolute inset-x-[20%] bottom-[18%] h-[30%] rounded-[50%]"
                style={{
                  background:
                    'radial-gradient(ellipse, rgba(255,221,148,0.55), transparent 65%)',
                  opacity: 'var(--window-glow-opacity)' as unknown as number,
                  transition: 'opacity 1.2s ease',
                }}
              />
              {/* focus ring */}
              <span className="pointer-events-none absolute inset-0 rounded-3xl border-[3px] border-dashed border-coral opacity-0 transition-opacity group-focus-visible:opacity-100" />
            </button>
          );
        })}

        {/* Long Pier hotspot — invisible click area */}
        <button
          type="button"
          aria-label={t('map.pier.aria')}
          onClick={() => {
            if (!dragMoved.current && !heroVisible && !touring) setPierOpen((v) => !v);
          }}
          className="absolute"
          style={{
            left: PIER.anchor.x - 40,
            top: PIER.anchor.y - 24,
            width: 80,
            height: 48,
            zIndex: 950,
          }}
        />

        {/* name tag */}
        <AnimatePresence>
          {tagFor && !selected && (
            <div
              className="pointer-events-none absolute z-[2500] -translate-x-1/2 -translate-y-full"
              style={{
                left: tagFor.anchor.x,
                top: tagFor.anchor.y - tagFor.w * 0.78,
              }}
            >
              <motion.div
                key={tagFor.id}
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.6, opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.22, 1.2, 0.36, 1] }}
                className="flex flex-col items-center"
              >
                <div className="rounded-[14px] border-[3px] border-white bg-paper px-4 py-2 text-center shadow-sticker">
                  <div className="font-display text-[0.95rem] font-semibold text-ink">
                    {t(tagFor.nameKey)}
                  </div>
                  <div lang="en" className="font-hand text-lg leading-tight text-ink-soft">
                    {enText(tagFor.whisperKey)}
                  </div>
                </div>
                <div className="h-3 w-3 -translate-y-[7px] rotate-45 border-b-[3px] border-r-[3px] border-white bg-paper" />
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* pier popover */}
        <AnimatePresence>
          {pierOpen && !selected && (
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.7, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1.2, 0.36, 1] }}
              className="sticker-card absolute z-[2600] w-[300px] p-5"
              style={{ left: PIER.anchor.x + 60, top: PIER.anchor.y - 150 }}
            >
              <button
                type="button"
                onClick={() => setPierOpen(false)}
                className="absolute right-3 top-3 text-ink-soft hover:text-ink"
                aria-label={t('map.close')}
              >
                <X className="h-4 w-4" />
              </button>
              <div className="font-display text-lg font-semibold text-ink">{t(PIER.nameKey)}</div>
              <div lang="en" className="font-hand text-xl text-ink-soft">
                {enText(PIER.whisperKey)}
              </div>
              <p className="mt-2 text-sm font-semibold leading-relaxed text-ink">{t(PIER.lineKey)}</p>
              <button
                type="button"
                onClick={() => {
                  const isle = byId('windbell-isle');
                  if (isle) openLandmark(isle);
                }}
                className="btn-primary mt-3 px-4 py-2 text-sm"
              >
                {t('map.pier.meetIsle')}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* gulls */}
        {[
          { left: 760, top: 620, dur: '14s', anim: 'st-gull-a' },
          { left: 900, top: 560, dur: '18s', anim: 'st-gull-b' },
          { left: 660, top: 700, dur: '12s', anim: 'st-gull-a' },
        ].map((g, i) => (
          <svg
            key={i}
            className="ambient absolute z-[900]"
            style={{
              left: g.left,
              top: g.top,
              width: 34,
              height: 16,
              animation: `${g.anim} ${g.dur} ease-in-out infinite`,
            }}
            viewBox="0 0 34 16"
          >
            <path
              d="M2 10 Q 9 2 17 9 Q 25 2 32 10"
              fill="none"
              stroke="var(--ink)"
              strokeWidth="2.6"
              strokeLinecap="round"
              opacity="0.6"
            />
          </svg>
        ))}

        {/* the promenade cat */}
        <svg
          className="ambient absolute z-[960]"
          style={{ left: 700, top: 1052, width: 34, height: 20, animation: 'st-cat-cross 45s linear infinite' }}
          viewBox="0 0 34 20"
        >
          <ellipse cx="15" cy="13" rx="11" ry="6" fill="var(--ink)" opacity="0.75" />
          <circle cx="27" cy="9" r="4.5" fill="var(--ink)" opacity="0.75" />
          <path d="M24 5 L26 1 L28 5 M28 5 L31 2 L31 6" fill="var(--ink)" opacity="0.75" />
          <path d="M4 12 Q 0 6 4 3" fill="none" stroke="var(--ink)" strokeWidth="2" opacity="0.75" />
        </svg>

        {/* clouds */}
        {[
          { top: 90, dur: '40s', w: 340, o: 0.9 },
          { top: 220, dur: '65s', w: 240, o: 0.7 },
        ].map((c, i) => (
          <svg
            key={i}
            className="ambient absolute z-[1700]"
            style={{
              top: c.top,
              width: c.w,
              opacity: c.o,
              animation: `st-cloud-drift ${c.dur} linear infinite`,
            }}
            viewBox="0 0 200 70"
          >
            <ellipse cx="70" cy="48" rx="52" ry="18" fill="var(--cloud)" />
            <ellipse cx="110" cy="36" rx="42" ry="20" fill="var(--cloud)" />
            <ellipse cx="140" cy="50" rx="36" ry="14" fill="var(--cloud)" />
          </svg>
        ))}

        {/* lighthouse beam (golden hour + starlight) */}
        <div
          className="ambient pointer-events-none absolute z-[1700]"
          style={{
            left: 310,
            top: 560,
            width: 720,
            height: 120,
            transformOrigin: '0 50%',
            background:
              'conic-gradient(from -8deg at 0% 50%, rgba(255,221,148,0.55), transparent 18deg)',
            opacity: 'var(--beam-opacity)' as unknown as number,
            transition: 'opacity 1.2s ease',
            animation: 'st-beam 12s linear infinite',
          }}
        />

        </div>

        {/* world tint per time-of-day */}
        <div
          className="pointer-events-none absolute inset-0 z-[1800]"
          style={{ background: 'var(--world-tint)', transition: 'background 1.2s ease' }}
        />
      </div>

      {/* ============ HUD ============ */}
      {/* top-left: passport chip */}
      <div className="absolute left-4 top-[96px] z-[3200]">
        <div style={hudSlide('top', 0)}>
          <div className="flex items-center gap-2 rounded-full border-[3px] border-white bg-paper/90 py-2 pl-3 pr-4 shadow-sticker backdrop-blur-sm">
            <StampIcon className="h-6 w-6" />
            <span className="font-display text-sm font-semibold text-ink">
              {t('map.passport', { n: stamps.length })}
            </span>
          </div>
        </div>
      </div>

      {/* left rail: legend filters */}
      <div className="absolute left-4 top-1/2 z-[3200] -translate-y-1/2 md:left-5 max-md:bottom-24 max-md:left-1/2 max-md:top-auto max-md:-translate-x-1/2 max-md:translate-y-0">
        <div style={hudSlide('left', 1)}>
          <div className="flex max-h-[52dvh] flex-col gap-2 overflow-y-auto rounded-[24px] border-[3px] border-white bg-paper/90 p-2 shadow-sticker backdrop-blur-sm max-md:max-h-none max-md:flex-row max-md:overflow-x-auto">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                aria-pressed={filter === f.id}
                className={cn(
                  'flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-extrabold text-ink transition-all duration-300 ease-squash hover:bg-white',
                  filter === f.id && 'bg-white shadow-sm',
                )}
              >
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: f.accent }} />
                {t(f.labelKey)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* right rail: zoom + compass */}
      <div className="absolute right-4 top-1/2 z-[3200] -translate-y-1/2 md:right-5">
        <div style={hudSlide('right', 2)}>
          <div className="flex flex-col items-center gap-2 rounded-[24px] border-[3px] border-white bg-paper/90 p-2 shadow-sticker backdrop-blur-sm">
            <button
              type="button"
              onClick={() => stepZoom(1)}
              aria-label={t('map.zoomIn')}
              className="flex h-9 w-9 items-center justify-center rounded-full text-ink transition-all duration-300 ease-squash hover:bg-white"
            >
              <Plus className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => stepZoom(-1)}
              aria-label={t('map.zoomOut')}
              className="flex h-9 w-9 items-center justify-center rounded-full text-ink transition-all duration-300 ease-squash hover:bg-white"
            >
              <Minus className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={resetView}
              aria-label={t('map.resetView')}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white/70 text-ink transition-transform duration-300 ease-squash hover:scale-110"
            >
              <span
                key={compassSpin}
                className="inline-flex"
                style={{ animation: 'st-spin-slow 0.8s cubic-bezier(0.22,1.2,0.36,1)' }}
              >
                <CompassIcon className="h-5 w-5" />
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* bottom-center hint */}
      <AnimatePresence>
        {showHint && (
          <div className="absolute bottom-6 left-1/2 z-[3200] -translate-x-1/2">
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1.2, 0.36, 1] }}
            >
              <div className="rounded-full border-[3px] border-white bg-paper/90 px-5 py-2.5 text-center text-sm font-extrabold text-ink shadow-sticker backdrop-blur-sm">
                {t('map.hint')}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* tour cancel pill */}
      <AnimatePresence>
        {touring && (
          <div className="absolute bottom-6 left-1/2 z-[3200] -translate-x-1/2">
            <motion.button
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              type="button"
              onClick={cancelTour}
              className="flex items-center gap-2 rounded-full border-[3px] border-white bg-ink/80 px-5 py-2.5 text-sm font-extrabold text-cream shadow-sticker backdrop-blur-sm"
            >
              <X className="h-4 w-4" /> {t('map.skipTour')}
            </motion.button>
          </div>
        )}
      </AnimatePresence>

      {/* ============ DETAIL CARD ============ */}
      <AnimatePresence>
        {selected && (
          <DetailCard
            key={selected.id}
            landmark={selected}
            onClose={closeLandmark}
            onNext={nextLandmark}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function StampIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <circle cx="12" cy="12" r="10" fill="none" stroke="var(--coral)" strokeWidth="2" strokeDasharray="3 2" />
      <circle cx="12" cy="12" r="6.5" fill="var(--butter)" />
      <path d="M12 8.5 L13.2 11 L16 11.3 L13.9 13.1 L14.5 16 L12 14.6 L9.5 16 L10.1 13.1 L8 11.3 L10.8 11 Z" fill="var(--coral)" />
    </svg>
  );
}
