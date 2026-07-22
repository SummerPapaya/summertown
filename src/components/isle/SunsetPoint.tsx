import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { usePrefersReducedMotion } from './hooks';

gsap.registerPlugin(ScrollTrigger);

const H2_WORDS = 'Sunset Point applauds daily at 6:47.'.split(' ');

const SKY_STOPS = [
  /* gold (base) → apricot → coral-rose → first-lavender */
  'linear-gradient(180deg, #FFDD94 0%, #FFE3B3 45%, #FFC9A3 100%)',
  'linear-gradient(180deg, #FFB37E 0%, #FFC9A3 45%, #FF9B9B 100%)',
  'linear-gradient(180deg, #FF9B9B 0%, #FFAB9E 45%, #FFC3D0 100%)',
  'linear-gradient(180deg, #9B8CE8 0%, #C6B6E8 50%, #E6DDF7 100%)',
];

const HANDS = [
  { left: '17%', bottom: '14.6vw', rot: '-rotate-12' },
  { left: '50%', bottom: '11.25vw', rot: 'rotate-6' },
  { left: '83%', bottom: '15.75vw', rot: '-rotate-3' },
];

/** tiny clapping-hand doodle (no emoji, per design) */
function HandDoodle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="none" aria-hidden>
      <path
        d="M8.4 16.8 V9.6 a2.3 2.3 0 0 1 4.6 0 V15 M13 15 V7.6 a2.3 2.3 0 0 1 4.6 0 V15 M17.6 15 V9.2 a2.3 2.3 0 0 1 4.6 0 v7.6 c0 5 -3 9.2 -7.6 9.2 c-4 0 -6.4 -2.4 -8.2 -6.2 l-1.8 -4 c-0.5 -1.2 0.2 -2.4 1.5 -2.4 c0.8 0 1.5 0.4 1.9 1.2 l0.4 6.2 Z"
        fill="#FFF9EF"
        stroke="#4A4470"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Section 4 — Sunset Point. Pinned 160vh: the live CSS sun sinks from
 * y:-10vh to +34vh (landing over the diorama's painted sun, swelling 1→1.25),
 * the sky crossfades gold → apricot → coral-rose → first-lavender, a sparkle
 * shimmer crosses the water at 60%, and at 100% the lighthouse window lights
 * up while three little hands applaud near the rocks.
 */
export default function SunsetPoint({
  sectionRef,
}: {
  sectionRef: RefObject<HTMLElement | null>;
}) {
  const reduced = usePrefersReducedMotion();
  const sceneRef = useRef<HTMLDivElement>(null);
  const sunRef = useRef<HTMLDivElement>(null);
  const stop2Ref = useRef<HTMLDivElement>(null);
  const stop3Ref = useRef<HTMLDivElement>(null);
  const stop4Ref = useRef<HTMLDivElement>(null);
  const shimmerRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const handsRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const wordsRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (reduced) return;
    const ctx = gsap.context(() => {
      const words = wordsRef.current ? Array.from(wordsRef.current.children) : [];
      const hands = handsRef.current ? Array.from(handsRef.current.children) : [];
      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top top',
          end: () => `+=${Math.round(window.innerHeight * 1.6)}`,
          pin: sceneRef.current,
          scrub: 1,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });
      tl.fromTo(
        sunRef.current,
        { y: () => -Math.round(window.innerHeight * 0.44), scale: 1 },
        { y: 0, scale: 1.25, duration: 1 },
        0,
      )
        .fromTo(stop2Ref.current, { opacity: 0 }, { opacity: 0.88, duration: 0.34 }, 0.12)
        .fromTo(stop3Ref.current, { opacity: 0 }, { opacity: 0.88, duration: 0.3 }, 0.42)
        .fromTo(stop4Ref.current, { opacity: 0 }, { opacity: 0.88, duration: 0.28 }, 0.66)
        .fromTo(
          words,
          { y: 34, opacity: 0 },
          { y: 0, opacity: 1, stagger: 0.025, duration: 0.14 },
          0.03,
        )
        .fromTo(
          shimmerRef.current,
          { xPercent: -140, opacity: 0 },
          { xPercent: 140, opacity: 1, duration: 0.16 },
          0.55,
        )
        .to(shimmerRef.current, { opacity: 0, duration: 0.05 }, 0.72)
        .to(textRef.current, { opacity: 0, duration: 0.1 }, 0.9)
        .fromTo(
          glowRef.current,
          { scale: 0.2, opacity: 0 },
          {
            scale: 1.2,
            opacity: 1,
            duration: 0.07,
            ease: 'back.out(2)',
            immediateRender: false,
          },
          0.93,
        )
        .fromTo(
          hands,
          { scale: 0, rotate: -14, opacity: 0 },
          {
            scale: 1,
            rotate: 0,
            opacity: 1,
            stagger: 0.02,
            duration: 0.06,
            ease: 'back.out(2.2)',
            immediateRender: false,
          },
          0.95,
        );
    }, sectionRef);
    return () => ctx.revert();
  }, [reduced, sectionRef]);

  return (
    <section ref={sectionRef} aria-label="Sunset Point" className="relative">
      <div ref={sceneRef} className="relative h-[100dvh] overflow-hidden">
        {/* bottom-anchored diorama (rocks + point + lighthouse silhouette) */}
        <img
          src="/isle-sunset-scene.png"
          alt="Sunset Point: lavender rocks and the lighthouse above a glassy sea"
          loading="lazy"
          className="absolute inset-x-0 bottom-0 block h-auto w-full"
          style={{
            maskImage: 'linear-gradient(to bottom, transparent 0, black 12%)',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent 0, black 12%)',
          }}
        />

        {/* live CSS sky (tints the diorama sky, fades out at the horizon) */}
        <div
          className="absolute inset-0"
          aria-hidden
          style={{
            maskImage: 'linear-gradient(to bottom, black 52%, transparent 76%)',
            WebkitMaskImage: 'linear-gradient(to bottom, black 52%, transparent 76%)',
          }}
        >
          <div className="absolute inset-0" style={{ background: SKY_STOPS[0], opacity: 0.85 }} />
          {reduced ? (
            <div className="absolute inset-0" style={{ background: SKY_STOPS[3], opacity: 0.88 }} />
          ) : (
            <>
              <div ref={stop2Ref} className="absolute inset-0 opacity-0" style={{ background: SKY_STOPS[1] }} />
              <div ref={stop3Ref} className="absolute inset-0 opacity-0" style={{ background: SKY_STOPS[2] }} />
              <div ref={stop4Ref} className="absolute inset-0 opacity-0" style={{ background: SKY_STOPS[3] }} />
            </>
          )}
        </div>

        {/* the sinking sun (ends exactly over the painted sun) */}
        <div className="absolute" style={{ left: '30.3%', bottom: '35.2vw' }} aria-hidden>
          <div className="-translate-x-1/2 translate-y-1/2">
            <div
              ref={sunRef}
              className="h-[30vmin] w-[30vmin] rounded-full will-change-transform"
              style={{
                background:
                  'radial-gradient(circle at 50% 46%, #FFF6D8 0%, #FFDD94 42%, #FFB37E 72%, rgba(255,179,126,0) 100%)',
                transform: reduced ? 'scale(1.25)' : undefined,
              }}
            />
          </div>
        </div>

        {/* lighthouse window glow (at 100%) */}
        <div className="absolute" style={{ left: '68.2%', bottom: '43.1vw' }} aria-hidden>
          <div className="-translate-x-1/2 translate-y-1/2">
            <div
              ref={glowRef}
              className={
                reduced
                  ? 'ambient h-[9vmin] w-[9vmin] rounded-full'
                  : 'h-[9vmin] w-[9vmin] rounded-full opacity-0'
              }
              style={{
                background:
                  'radial-gradient(circle, #FFF6D8 0%, #FFDD94 45%, rgba(255,221,148,0) 72%)',
                animation: reduced ? 'isle-glow 2.4s ease-in-out infinite' : undefined,
              }}
            />
          </div>
        </div>

        {/* the nightly applause — three tiny hand doodles near the rocks */}
        <div ref={handsRef} aria-hidden>
          {HANDS.map((h, i) => (
            <div
              key={i}
              className={`absolute ${reduced ? '' : 'opacity-0'}`}
              style={{ left: h.left, bottom: h.bottom }}
            >
              <div className="-translate-x-1/2 translate-y-1/2">
                <HandDoodle className={`h-9 w-9 ${h.rot}`} />
              </div>
            </div>
          ))}
        </div>

        {/* sparkle shimmer crossing the water band (at 60%) */}
        {!reduced && (
          <div
            ref={shimmerRef}
            className="pointer-events-none absolute inset-x-[8%] top-[44%] h-[14%] opacity-0"
            aria-hidden
            style={{
              background:
                'linear-gradient(100deg, transparent 15%, rgba(255,255,255,0.55) 50%, transparent 85%)',
            }}
          />
        )}

        {/* overlaid text */}
        <div ref={textRef} className="absolute inset-x-0 top-[12%] px-6 text-center">
          <p className="text-[0.72rem] font-extrabold uppercase tracking-[0.16em] text-ink/80">
            sunset point · nightly
          </p>
          <h2
            className="mt-3 font-display text-[clamp(2rem,4.5vw,3.5rem)] font-semibold leading-[1.05] text-ink"
            style={{ textShadow: '0 2px 0 rgba(255,249,239,0.65)' }}
          >
            <span ref={wordsRef} className="inline-block">
              {H2_WORDS.map((w, i) => (
                <span key={i} className="inline-block will-change-transform">
                  {w}
                  {i < H2_WORDS.length - 1 ? ' ' : ''}
                </span>
              ))}
            </span>
          </h2>
          <p
            className="mt-3 font-hand text-[clamp(1.3rem,2.2vw,1.9rem)] text-ink"
            style={{ textShadow: '0 2px 0 rgba(255,249,239,0.65)' }}
          >
            Seats: all of them. Tickets: none. Encore: tomorrow.
          </p>
        </div>
      </div>
    </section>
  );
}
