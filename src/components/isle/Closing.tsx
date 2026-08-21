import { useEffect, useRef } from 'react';
import { Link } from 'react-router';
import { motion } from 'framer-motion';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowRight, Stamp } from 'lucide-react';
import { useTown } from '@/lib/town';
import { useLanguage, enText } from '@/lib/i18n';
import { playChime } from '@/lib/sound';
import { byId } from '@/lib/landmarks';
import { WordRise } from './shared';
import { usePrefersReducedMotion, SQUASH, BACK_OUT } from './hooks';

gsap.registerPlugin(ScrollTrigger);

const MINIS = ['apple-cottage', 'magic-house', 'radio'];

/**
 * Section 6 — When the Bells Ring. Closing proverb on the dusk sky, stamp /
 * journal CTAs, three mini landmark cards dealt in like playing cards, and
 * one final windbell ripple when the section hits mid-viewport.
 */
export default function Closing() {
  const reduced = usePrefersReducedMotion();
  const { soundOn } = useTown();
  const { t } = useLanguage();
  const soundRef = useRef(soundOn);
  useEffect(() => {
    soundRef.current = soundOn;
  }, [soundOn]);
  const sectionRef = useRef<HTMLElement>(null);
  const ringsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reduced) return;
    const ctx = gsap.context(() => {
      const rings = ringsRef.current ? Array.from(ringsRef.current.children) : [];
      gsap.set(rings, { scale: 0.2, opacity: 0 });
      ScrollTrigger.create({
        trigger: sectionRef.current,
        start: 'top 50%',
        onEnter: () => {
          gsap.fromTo(
            rings,
            { scale: 0.2, opacity: 0.7 },
            { scale: 3.2, opacity: 0, stagger: 0.12, duration: 1.4, ease: 'power1.out' },
          );
          if (soundRef.current) playChime();
        },
      });
    }, sectionRef);
    return () => ctx.revert();
  }, [reduced]);

  return (
    <section
      ref={sectionRef}
      aria-label={t('isle.closing.sectionAria')}
      className="relative overflow-hidden px-6 py-28 md:py-36"
    >
      {/* screen-crossing windbell ripple */}
      <div ref={ringsRef} className="pointer-events-none absolute left-1/2 top-1/2" aria-hidden>
        {[0, 1, 2].map((r) => (
          <span
            key={r}
            className="absolute left-0 top-0 h-[42vmin] w-[42vmin] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-butter/70"
          />
        ))}
      </div>

      <div className="relative mx-auto max-w-[760px] text-center">
        <p className="text-[0.72rem] font-extrabold uppercase tracking-[0.16em] text-butter">
          {t('isle.closing.kicker')}
        </p>
        <h2
          className="mt-4 font-hand text-[clamp(2.1rem,5.2vw,3.9rem)] font-medium leading-[1.2] text-cream"
          style={{ textShadow: '0 3px 0 rgba(54,48,92,0.5)' }}
        >
          <WordRise
            text={t('isle.closing.quote')}
            stagger={0.04}
          />
        </h2>

        <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: BACK_OUT }}
          >
            <Link to="/?place=windbell-isle" className="btn-primary">
              <Stamp className="h-4 w-4" aria-hidden />
              {t('isle.closing.stampCta')}
            </Link>
          </motion.div>
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1, ease: BACK_OUT }}
          >
            <Link to="/journal" className="btn-secondary">
              {t('isle.closing.journalCta')}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </motion.div>
        </div>

        <p className="mt-12 font-hand text-2xl text-lilac">{t('isle.closing.moreDoors')}</p>
        <div className="mt-5 flex flex-wrap items-stretch justify-center gap-5">
          {MINIS.map((id, i) => {
            const lm = byId(id)!;
            return (
              <motion.div
                key={id}
                initial={{ y: 80, rotate: 20, opacity: 0 }}
                whileInView={{ y: 0, rotate: -2, opacity: 1 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{
                  delay: reduced ? 0 : i * 0.12,
                  duration: 0.7,
                  ease: SQUASH,
                }}
              >
                <Link
                  to={`/?place=${id}`}
                  className="sticker-card group block w-[190px] p-3 text-left transition-transform duration-300 ease-squash hover:-translate-y-1.5 hover:rotate-0"
                >
                  <div className="relative h-[110px] overflow-hidden rounded-2xl bg-lilac/40">
                    <img
                      src={lm.scene}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-500 ease-squash group-hover:scale-105"
                    />
                    <span
                      className="absolute right-2 top-2 h-3.5 w-3.5 rounded-full border-2 border-white"
                      style={{ background: lm.accent }}
                      aria-hidden
                    />
                  </div>
                  <div className="mt-2.5 px-1 pb-1">
                    <div className="font-display text-[0.95rem] font-semibold leading-tight text-ink">
                      {t(lm.nameKey)}
                    </div>
                    <div lang="en" className="mt-1 font-hand text-lg leading-none text-ink-soft">
                      {enText(lm.whisperKey)}
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
