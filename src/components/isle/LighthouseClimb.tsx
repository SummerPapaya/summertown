import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { BookOpen, Flashlight, Footprints } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import { usePrefersReducedMotion } from './hooks';

gsap.registerPlugin(ScrollTrigger);

const FACTS = [
  { icon: Footprints, labelKey: 'isle.lighthouse.facts.0' },
  { icon: BookOpen, labelKey: 'isle.lighthouse.facts.1' },
  { icon: Flashlight, labelKey: 'isle.lighthouse.facts.2' },
];

/* winding climb path in the image's own coordinate space (1024×1536) */
const CLIMB_PATH =
  'M512 1470 C420 1380 560 1320 500 1250 C440 1180 620 1150 590 1080 C560 1010 700 1000 660 930 C620 860 720 840 680 770 C640 700 740 690 700 620 C660 550 720 520 690 460 C665 410 660 360 652 305';

/* step-number tags along the path (% of the image box, pop position in the pin) */
const STEP_TAGS = [
  { n: 27, x: 48.8, y: 81.4, at: 0.15 },
  { n: 68, x: 63, y: 60.5, at: 0.4 },
  { n: 104, x: 68.4, y: 40.4, at: 0.63 },
  { n: 137, x: 63.7, y: 19.6, at: 0.86 },
];

/**
 * Section 5 — The Lighthouse Climb. Pinned 220vh (160vh <1024px): the tall
 * scene rises inside its frame (stairs → keeper's garden → lantern room), the
 * dotted path draws with progress, step tags pop as you pass them, and at 95%
 * the lantern beam ignites (one 360° sweep, then a slow 14s loop).
 */
export default function LighthouseClimb({
  sectionRef,
}: {
  sectionRef: RefObject<HTMLElement | null>;
}) {
  const reduced = usePrefersReducedMotion();
  const { t } = useLanguage();
  const sceneRef = useRef<HTMLDivElement>(null);
  const imgWrapRef = useRef<HTMLDivElement>(null);
  const maskPathRef = useRef<SVGPathElement>(null);
  const beamRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const factsRef = useRef<HTMLUListElement>(null);
  const tagsRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const ignited = useRef(false);
  const beamTween = useRef<gsap.core.Tween | null>(null);

  useEffect(() => {
    if (reduced) return;
    const path = maskPathRef.current;
    let L = 0;
    if (path) {
      L = path.getTotalLength();
      path.style.strokeDasharray = `${L}`;
      path.style.strokeDashoffset = `${L}`;
    }

    const ignite = () => {
      const beam = beamRef.current;
      if (!beam) return;
      gsap.set(beam, { opacity: 0.9 });
      beamTween.current = gsap.fromTo(beam, { rotation: 0 }, {
        rotation: 360,
        duration: 2.5,
        ease: 'power1.inOut',
        onComplete: () => beam.classList.add('isle-beam-loop'),
      });
    };
    const extinguish = () => {
      const beam = beamRef.current;
      if (!beam) return;
      beamTween.current?.kill();
      beam.classList.remove('isle-beam-loop');
      gsap.set(beam, { rotation: 0, opacity: 0 });
    };

    const ctx = gsap.context(() => {
      const tags = tagsRef.current ? Array.from(tagsRef.current.children) : [];
      const facts = factsRef.current ? Array.from(factsRef.current.children) : [];

      /* text stack entrance */
      gsap.fromTo(
        textRef.current ? Array.from(textRef.current.children) : [],
        { y: 40, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          stagger: 0.09,
          duration: 0.7,
          ease: 'power3.out',
          scrollTrigger: { trigger: sectionRef.current, start: 'top 65%' },
        },
      );

      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top top',
          end: () =>
            `+=${Math.round(window.innerHeight * (window.innerWidth < 1024 ? 1.6 : 2.2))}`,
          pin: sceneRef.current,
          scrub: 1,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            if (self.progress >= 0.95 && !ignited.current) {
              ignited.current = true;
              ignite();
            } else if (self.progress < 0.9 && ignited.current) {
              ignited.current = false;
              extinguish();
            }
          },
        },
      });

      /* scroll = climbing: the tall image rises past the frame */
      tl.fromTo(imgWrapRef.current, { yPercent: -38 }, { yPercent: 0, duration: 1 }, 0);
      if (path) {
        tl.fromTo(path, { strokeDashoffset: L }, { strokeDashoffset: 0, duration: 1 }, 0);
      }
      STEP_TAGS.forEach((t, i) => {
        tl.fromTo(
          tags[i],
          { scale: 0, opacity: 0 },
          {
            scale: 1,
            opacity: 1,
            duration: 0.05,
            ease: 'back.out(2.2)',
            immediateRender: false,
          },
          t.at,
        );
      });
      tl.fromTo(
        facts,
        { x: -20, opacity: 0 },
        { x: 0, opacity: 1, stagger: 0.03, duration: 0.1 },
        0.85,
      ).fromTo(
        glowRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.06, immediateRender: false },
        0.94,
      );
    }, sectionRef);
    return () => {
      beamTween.current?.kill();
      ctx.revert();
    };
  }, [reduced, sectionRef]);

  return (
    <>
      <section ref={sectionRef} aria-label={t('isle.lighthouse.sectionAria')} className="relative">
        <div ref={sceneRef} className="relative flex h-[100dvh] items-center overflow-hidden py-6">
          <div className="mx-auto grid w-full max-w-[1200px] items-center gap-8 px-6 lg:grid-cols-[40fr_60fr]">
            {/* text stack */}
            <div>
              <div ref={textRef}>
                <p className="text-[0.72rem] font-extrabold uppercase tracking-[0.16em] text-butter">
                  {t('isle.lighthouse.kicker')}
                </p>
                <h2
                  className="mt-3 font-display text-[clamp(2rem,4vw,3.5rem)] font-semibold leading-[1.05] text-cream"
                  style={{ textShadow: '0 3px 0 rgba(54,48,92,0.5)' }}
                >
                  {t('isle.lighthouse.title')}
                </h2>
                <p className="mt-4 max-w-[46ch] text-[clamp(1rem,1.15vw,1.15rem)] font-semibold leading-[1.65] text-lilac">
                  {t('isle.lighthouse.body')}
                </p>
              </div>
              <ul ref={factsRef} className="mt-6 hidden flex-col items-start gap-2.5 lg:flex">
                {FACTS.map((f) => (
                  <li
                    key={f.labelKey}
                    className="flex items-center gap-3 rounded-full border-2 border-white/90 bg-paper/95 px-4 py-2 font-extrabold text-ink shadow-pop"
                  >
                    <f.icon className="h-4 w-4 text-coral" aria-hidden />
                    {t(f.labelKey)}
                  </li>
                ))}
              </ul>
            </div>

            {/* the climb window */}
            <div
              className="relative mx-auto w-full max-w-[560px] overflow-hidden rounded-panel border-[3px] border-white bg-lilac shadow-sticker"
              style={{ aspectRatio: '25 / 23' }}
            >
              <div ref={imgWrapRef} className="absolute inset-x-0 top-0 will-change-transform">
                <img
                  src="/isle-lighthouse-scene.png"
                  alt={t('isle.lighthouse.sceneAlt')}
                  loading="lazy"
                  className="block h-auto w-full"
                />

                {/* winding dotted path, drawn by scroll */}
                <svg
                  className="absolute inset-0 h-full w-full"
                  viewBox="0 0 1024 1536"
                  preserveAspectRatio="none"
                  aria-hidden
                >
                  <defs>
                    <mask id="isle-climb-mask">
                      <path
                        ref={maskPathRef}
                        d={CLIMB_PATH}
                        fill="none"
                        stroke="#fff"
                        strokeWidth="34"
                        strokeLinecap="round"
                      />
                    </mask>
                  </defs>
                  <path
                    d={CLIMB_PATH}
                    fill="none"
                    stroke="#FFF9EF"
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeDasharray="0.1 16"
                    vectorEffect="non-scaling-stroke"
                    mask="url(#isle-climb-mask)"
                  />
                </svg>

                {/* step-number tags */}
                <div ref={tagsRef} aria-hidden>
                  {STEP_TAGS.map((tag) => (
                    <div
                      key={tag.n}
                      className={`absolute ${reduced ? '' : 'opacity-0'}`}
                      style={{ left: `${tag.x}%`, top: `${tag.y}%` }}
                    >
                      <span className="block -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border-2 border-white bg-butter px-2.5 py-1 text-[0.7rem] font-extrabold text-ink shadow-pop">
                        {t('isle.lighthouse.stepTag', { n: tag.n })}
                      </span>
                    </div>
                  ))}
                </div>

                {/* lantern beam (ignites at 95%) */}
                <div className="absolute" style={{ left: '63.5%', top: '18.5%' }} aria-hidden>
                  <div className="-translate-x-1/2 -translate-y-1/2">
                    <div
                      ref={beamRef}
                      className={`aspect-square w-[150%] rounded-full ${reduced ? '' : 'opacity-0'}`}
                      style={{
                        background:
                          'conic-gradient(from 0deg, rgba(255,241,196,0.95) 0deg, rgba(255,221,148,0.55) 10deg, rgba(255,221,148,0) 24deg)',
                        opacity: reduced ? 0.9 : undefined,
                      }}
                    />
                  </div>
                </div>

                {/* lantern window glow */}
                <div className="absolute" style={{ left: '63.5%', top: '18.5%' }} aria-hidden>
                  <div className="-translate-x-1/2 -translate-y-1/2">
                    <div
                      ref={glowRef}
                      className={`ambient h-16 w-16 rounded-full ${reduced ? '' : 'opacity-0'}`}
                      style={{
                        background:
                          'radial-gradient(circle, #FFF6D8 0%, #FFDD94 45%, rgba(255,221,148,0) 70%)',
                        animation: 'isle-glow 2.4s ease-in-out infinite',
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* fact list moves below the climb window on small screens */}
      <ul className="mx-auto flex w-full max-w-[1200px] flex-wrap gap-2.5 px-6 pb-16 lg:hidden">
        {FACTS.map((f) => (
          <li
            key={f.labelKey}
            className="flex items-center gap-2.5 rounded-full border-2 border-white/90 bg-paper/95 px-4 py-2 text-sm font-extrabold text-ink shadow-pop"
          >
            <f.icon className="h-4 w-4 text-coral" aria-hidden />
            {t(f.labelKey)}
          </li>
        ))}
      </ul>
    </>
  );
}
