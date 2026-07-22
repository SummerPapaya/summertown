import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { usePrefersReducedMotion } from './hooks';

gsap.registerPlugin(ScrollTrigger);

/* stable star layout, generated once at module load (not during render) */
const STARS: Star[] = Array.from({ length: 90 }, (_, i) => ({
  id: i,
  left: Math.random() * 100,
  top: Math.random() * 100,
  size: 1.5 + Math.random() * 2.2,
  delay: Math.random() * 2.4,
  dur: 1.8 + Math.random() * 1.8,
}));

interface Props {
  arrivalRef: RefObject<HTMLElement | null>;
  sunsetRef: RefObject<HTMLElement | null>;
  climbRef: RefObject<HTMLElement | null>;
}

interface Star {
  id: number;
  left: number;
  top: number;
  size: number;
  delay: number;
  dur: number;
}

/**
 * Page sky progression (windbell-isle.md intro): the further you scroll, the
 * later the day gets. Full-page absolute layers (contained by the page root,
 * so the shared footer keeps its own sea gradient) crossfaded by scroll:
 * Day → soft gold → apricot/rose → lavender dusk, then a 90-star field.
 */
export default function IsleSky({ arrivalRef, sunsetRef, climbRef }: Props) {
  const reduced = usePrefersReducedMotion();
  const goldRef = useRef<HTMLDivElement>(null);
  const roseRef = useRef<HTMLDivElement>(null);
  const duskRef = useRef<HTMLDivElement>(null);
  const starsRef = useRef<HTMLDivElement>(null);

  const stars = STARS;

  useEffect(() => {
    if (reduced) return;
    const ctx = gsap.context(() => {
      const fade = (
        el: HTMLElement | null,
        trigger: HTMLElement | null,
        start: string,
        end: string,
      ) => {
        if (!el || !trigger) return;
        gsap.fromTo(
          el,
          { opacity: 0 },
          {
            opacity: 1,
            ease: 'none',
            scrollTrigger: { trigger, start, end, scrub: true },
          },
        );
      };
      /* gold arrives with the meadow, rose while approaching Sunset Point,
         dusk hands off across the sunset pin, stars across the climb */
      fade(goldRef.current, arrivalRef.current, 'top bottom', 'top 30%');
      fade(roseRef.current, sunsetRef.current, 'top bottom', 'top 15%');
      fade(duskRef.current, sunsetRef.current, 'top top', 'bottom bottom');
      fade(starsRef.current, climbRef.current, 'top 70%', 'top 5%');
    });
    return () => ctx.revert();
  }, [reduced, arrivalRef, sunsetRef, climbRef]);

  /* reduced motion: one static full-page gradient, stars visible at the end */
  if (reduced) {
    return (
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, #CFEBF7 0%, #A5E3D8 9%, #FFE9B8 22%, #FFDD94 30%, #FFB37E 44%, #FF9B9B 56%, #C6B6E8 68%, #6E5E9E 84%, #3E3965 100%)',
          }}
        />
        <Stars stars={stars} />
      </div>
    );
  }

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(180deg, #CFEBF7 0%, #A5E3D8 100%)' }}
      />
      <div
        ref={goldRef}
        className="absolute inset-0 opacity-0"
        style={{
          background: 'linear-gradient(180deg, #FFE9B8 0%, #FFDD94 45%, #FFC9A3 100%)',
        }}
      />
      <div
        ref={roseRef}
        className="absolute inset-0 opacity-0"
        style={{
          background: 'linear-gradient(180deg, #FFB37E 0%, #FF9B9B 55%, #FFC3D0 100%)',
        }}
      />
      <div
        ref={duskRef}
        className="absolute inset-0 opacity-0"
        style={{
          background: 'linear-gradient(180deg, #3E3965 0%, #6E5E9E 100%)',
        }}
      />
      <div ref={starsRef} className="absolute inset-0 opacity-0">
        <Stars stars={stars} />
      </div>
    </div>
  );
}

function Stars({ stars }: { stars: Star[] }) {
  return (
    <>
      {stars.map((s) => (
        <span
          key={s.id}
          className="ambient absolute rounded-full bg-white"
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: s.size,
            height: s.size,
            animation: `st-twinkle ${s.dur}s ease-in-out ${s.delay}s infinite`,
          }}
        />
      ))}
    </>
  );
}
