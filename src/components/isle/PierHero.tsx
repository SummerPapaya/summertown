import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ChevronDown } from 'lucide-react';
import { useTown } from '@/lib/town';
import { useLanguage } from '@/lib/i18n';
import { playChime } from '@/lib/sound';
import { playKnock } from './sounds';
import { usePrefersReducedMotion } from './hooks';

gsap.registerPlugin(ScrollTrigger);

const TITLE_SHADOW = [
  '-6px 0 0 var(--ink)',
  '6px 0 0 var(--ink)',
  '0 -6px 0 var(--ink)',
  '0 6px 0 var(--ink)',
  '-4px -4px 0 var(--ink)',
  '4px -4px 0 var(--ink)',
  '-4px 4px 0 var(--ink)',
  '4px 4px 0 var(--ink)',
  '0 14px 28px rgba(74,68,112,0.4)',
].join(', ');

function Gull({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 54 20" className={className} aria-hidden fill="none">
      <path
        d="M2 15 Q12 3 27 12 Q42 3 52 15"
        stroke="#ffffff"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Section 1 — The Long Pier. Pinned (200vh, 140vh <768px): scroll = walking.
 * One panorama in three clip-path depths: foreground planks 2.2×, mid water,
 * far isle; gulls cross at 1.4×; chime ripple at 90% progress.
 */
export default function PierHero() {
  const reduced = usePrefersReducedMotion();
  const { soundOn } = useTown();
  const { t } = useLanguage();
  const title = t('isle.pierHero.title').split('');
  const soundRef = useRef(soundOn);
  useEffect(() => {
    soundRef.current = soundOn;
  }, [soundOn]);

  const sectionRef = useRef<HTMLElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const farRef = useRef<HTMLDivElement>(null);
  const midRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<HTMLDivElement>(null);
  const gullsRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);
  const charsRef = useRef<HTMLSpanElement>(null);
  const knockBucket = useRef(0);

  useEffect(() => {
    if (reduced) return;
    const ctx = gsap.context(() => {
      /* title chars enter on load (stagger 0.05, y70 rotate-6, back.out 1.6) */
      gsap.fromTo(
        charsRef.current ? Array.from(charsRef.current.children) : [],
        { y: 70, rotate: -6, opacity: 0 },
        {
          y: 0,
          rotate: 0,
          opacity: 1,
          stagger: 0.05,
          duration: 0.9,
          ease: 'back.out(1.6)',
          delay: 0.35,
        },
      );

      const rings = gsap.utils.toArray<HTMLElement>('.isle-hero-ring');
      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top top',
          end: () =>
            `+=${Math.round(window.innerHeight * (window.innerWidth < 768 ? 1.4 : 2))}`,
          pin: sceneRef.current,
          scrub: 1,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onEnter: () => {
            if (soundRef.current) playChime();
          },
          onUpdate: (self) => {
            /* soft plank knock each 20% of the walk (sound on only) */
            const b = Math.floor(self.progress * 5);
            if (b > knockBucket.current) {
              knockBucket.current = b;
              if (soundRef.current && b < 5) playKnock();
            } else if (b < knockBucket.current) {
              knockBucket.current = b;
            }
          },
        },
      });

      tl.to(farRef.current, { xPercent: 4 }, 0)
        .to(midRef.current, { xPercent: 5.6 }, 0)
        .to(fgRef.current, { xPercent: 9 }, 0)
        .to(gullsRef.current, { xPercent: 125 }, 0)
        .to(titleRef.current, { yPercent: -30, opacity: 0.4 }, 0)
        .to(hintRef.current, { opacity: 0, duration: 0.12 }, 0)
        .fromTo(
          rings,
          { scale: 0.35, opacity: 0.85 },
          {
            scale: 2.4,
            opacity: 0,
            stagger: 0.03,
            duration: 0.1,
            immediateRender: false,
          },
          0.9,
        );
    }, sectionRef);
    return () => ctx.revert();
  }, [reduced]);

  return (
    <section ref={sectionRef} aria-label={t('isle.pierHero.sectionAria')} className="relative">
      <div ref={sceneRef} className="relative h-[100dvh] overflow-hidden">
        {/* one panorama, three clip-path depths (paper-theatre parallax) */}
        <div ref={farRef} className="absolute inset-y-0 left-[-12%] w-[124%] will-change-transform">
          <img
            src="/isle-pier-pano.png"
            alt={t('isle.pierHero.panoAlt')}
            fetchPriority="high"
            className="h-full w-full object-cover"
            style={{ clipPath: 'inset(0 0 30% 0)' }}
          />
        </div>
        <div ref={midRef} className="absolute inset-y-0 left-[-12%] w-[124%] will-change-transform">
          <img
            src="/isle-pier-pano.png"
            alt=""
            aria-hidden
            className="h-full w-full object-cover"
            style={{ clipPath: 'inset(36% 0 24% 0)' }}
          />
        </div>
        <div ref={fgRef} className="absolute inset-y-0 left-[-12%] w-[124%] will-change-transform">
          <img
            src="/isle-pier-pano.png"
            alt=""
            aria-hidden
            className="h-full w-full object-cover"
            style={{ clipPath: 'inset(68% 0 0 0)' }}
          />
        </div>

        {/* water shimmer pulse */}
        <div
          className="ambient pointer-events-none absolute inset-x-0 bottom-[26%] top-[40%]"
          aria-hidden
          style={{
            background:
              'linear-gradient(100deg, transparent 20%, rgba(255,255,255,0.5) 50%, transparent 80%)',
            animation: 'isle-shimmer 3.4s ease-in-out infinite',
          }}
        />

        {/* gulls cross at 1.4×, bobbing */}
        <div ref={gullsRef} className="pointer-events-none absolute inset-x-0 top-[14%] will-change-transform" aria-hidden>
          <div className="ambient" style={{ animation: 'st-bob 4.2s ease-in-out infinite' }}>
            <Gull className="h-5 w-14" />
          </div>
          <div className="ambient ml-[22%] mt-6" style={{ animation: 'st-bob 5s ease-in-out 0.8s infinite' }}>
            <Gull className="h-4 w-11 opacity-90" />
          </div>
        </div>

        {/* title block */}
        <div ref={titleRef} className="absolute inset-x-0 top-[15%] px-6 text-center">
          <span className="kicker inline-block rounded-full border-[3px] border-white bg-[rgba(255,249,239,0.85)] px-4 py-1.5 text-ink shadow-sticker">
            {t('isle.pierHero.badge')}
          </span>
          <h1 className="mt-5 font-display text-[clamp(2.75rem,8vw,6.5rem)] font-bold leading-[1.0] tracking-[-0.015em]">
            <span ref={charsRef} className="inline-block">
              {title.map((c, i) => (
                <span
                  key={i}
                  className="inline-block will-change-transform"
                  style={{ color: 'var(--cream)', textShadow: TITLE_SHADOW }}
                >
                  {c === ' ' ? ' ' : c}
                </span>
              ))}
            </span>
          </h1>
          <p
            className="mt-4 font-hand text-[clamp(1.4rem,2.4vw,2rem)] text-ink"
            style={{ textShadow: '0 2px 0 rgba(255,255,255,0.65)' }}
          >
            {t('isle.pierHero.hand')}
          </p>
        </div>

        {/* windbell chime ripple at 90% — the isle hears you */}
        <div className="pointer-events-none absolute left-[62%] top-[46%]" aria-hidden>
          {[0, 1, 2].map((r) => (
            <span
              key={r}
              className="isle-hero-ring absolute left-0 top-0 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white/80 opacity-0"
            />
          ))}
        </div>

        {/* scroll hint */}
        <div ref={hintRef} className="absolute inset-x-0 bottom-8 flex flex-col items-center gap-1 text-ink">
          <span className="ambient" style={{ animation: 'st-bob 1.8s ease-in-out infinite' }}>
            <ChevronDown className="h-7 w-7" aria-hidden />
          </span>
          <span
            className="kicker"
            style={{ textShadow: '0 1px 0 rgba(255,255,255,0.7)' }}
          >
            {t('isle.pierHero.scrollHint')}
          </span>
        </div>
      </div>
    </section>
  );
}
