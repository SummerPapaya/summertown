import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowRight, Pin } from 'lucide-react';
import { toast } from 'sonner';
import { LANDMARKS } from '@/lib/landmarks';
import { trpc } from '@/providers/trpc';
import { useLanguage } from '@/lib/i18n';

gsap.registerPlugin(ScrollTrigger);

/* ================= Section 6 — Field Notes ================= */
export function FieldNotes({ onOpen }: { onOpen: (id: string) => void }) {
  const { t } = useLanguage();
  const rowRef = useRef<HTMLDivElement>(null);
  const hovering = useRef(false);

  /* gentle auto-scroll until hovered */
  useEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let raf = 0;
    const step = () => {
      raf = requestAnimationFrame(step);
      if (!hovering.current) {
        row.scrollLeft += 0.5;
        if (row.scrollLeft >= row.scrollWidth - row.clientWidth - 1) {
          row.scrollLeft = 0;
        }
      }
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <section className="relative mx-auto max-w-[1200px] px-6 py-24">
      <p className="kicker text-coral">
        {t('home.fieldNotes.kicker')}
      </p>
      <div className="mt-2 flex flex-wrap items-end gap-4">
        <h2 className="font-display text-[clamp(2rem,4vw,3.5rem)] font-semibold leading-[1.05] text-ink">
          {t('home.fieldNotes.title')}
        </h2>
        <p className="font-hand text-2xl text-ink-soft">{t('home.fieldNotes.hand')}</p>
      </div>

      <div
        ref={rowRef}
        onMouseEnter={() => (hovering.current = true)}
        onMouseLeave={() => (hovering.current = false)}
        className="no-scrollbar mt-10 flex snap-x snap-mandatory gap-5 overflow-x-auto pb-4"
      >
        {LANDMARKS.map((lm, i) => (
          <motion.button
            key={lm.id}
            type="button"
            onClick={() => onOpen(lm.id)}
            initial={{ y: 60, rotate: 3, opacity: 0 }}
            whileInView={{ y: 0, rotate: 0, opacity: 1 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{
              delay: (i % 7) * 0.06,
              duration: 0.7,
              ease: [0.22, 1.2, 0.36, 1],
            }}
            whileHover={{ y: -8, rotate: -2 }}
            className="sticker-card group w-[210px] shrink-0 snap-start p-3 text-left"
          >
            <div className="relative h-[150px] overflow-hidden rounded-2xl bg-lilac/40">
              <img
                src={lm.scene}
                alt=""
                loading="lazy"
                onError={(e) => {
                  const t = e.currentTarget;
                  if (!t.src.endsWith(lm.img)) t.src = lm.img;
                }}
                className="h-full w-full object-cover transition-transform duration-500 ease-squash group-hover:scale-105"
              />
              <span
                className="absolute right-2 top-2 h-3.5 w-3.5 rounded-full border-2 border-white"
                style={{ background: lm.accent }}
              />
            </div>
            <div className="mt-3 px-1 pb-1">
              <div className="font-display text-[0.98rem] font-semibold leading-tight text-ink">
                {t(lm.nameKey)}
              </div>
              <span className="mt-1.5 inline-block rounded-full bg-white/70 px-2.5 py-0.5 text-[0.65rem] font-extrabold uppercase tracking-[0.12em] text-ink-soft">
                {t(lm.chipKey)}
              </span>
            </div>
          </motion.button>
        ))}
      </div>
    </section>
  );
}

/* ================= Section 7 — Golden Hour banner ================= */
export function GoldenHour() {
  const { t } = useLanguage();
  const wrapRef = useRef<HTMLDivElement>(null);
  const sunRef = useRef<HTMLDivElement>(null);
  const gullsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const ctx = gsap.context(() => {
      if (reduced) return;
      gsap.fromTo(
        sunRef.current,
        { yPercent: -20 },
        {
          yPercent: 18,
          ease: 'none',
          scrollTrigger: {
            trigger: wrap,
            start: 'top top',
            end: '+=120%',
            pin: true,
            scrub: 0.6,
          },
        },
      );
      gsap.fromTo(
        gullsRef.current,
        { x: '-20vw' },
        {
          x: '110vw',
          ease: 'none',
          scrollTrigger: {
            trigger: wrap,
            start: 'top top',
            end: '+=120%',
            scrub: 1,
          },
        },
      );
    }, wrap);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={wrapRef} className="relative">
      <section className="relative flex h-[80dvh] items-center justify-center overflow-hidden">
        {/* sunset gradient sky */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to bottom, var(--butter), var(--apricot) 40%, var(--coral) 72%, var(--lavender))',
          }}
        />
        {/* parallax sun */}
        <div
          ref={sunRef}
          className="absolute left-1/2 top-[16%] h-[26vmin] w-[26vmin] -translate-x-1/2 rounded-full"
          style={{
            background: 'radial-gradient(circle, #fff6d8 0%, var(--butter) 55%, rgba(255,221,148,0) 72%)',
          }}
        />
        {/* gull flock */}
        <div ref={gullsRef} className="absolute left-0 top-[30%] flex gap-6" aria-hidden>
          {[0, 1, 2].map((i) => (
            <svg key={i} width="30" height="14" viewBox="0 0 34 16" style={{ marginTop: i * 10 }}>
              <path d="M2 10 Q 9 2 17 9 Q 25 2 32 10" fill="none" stroke="var(--ink)" strokeWidth="2.4" strokeLinecap="round" opacity="0.55" />
            </svg>
          ))}
        </div>
        {/* lighthouse silhouette */}
        <svg
          className="absolute bottom-0 right-[6%] h-[46%] opacity-10"
          viewBox="0 0 80 200"
          aria-hidden
        >
          <path d="M30 200 L34 60 L46 60 L50 200 Z" fill="var(--ink)" />
          <rect x="26" y="40" width="28" height="20" rx="4" fill="var(--ink)" />
          <path d="M22 40 L40 22 L58 40 Z" fill="var(--ink)" />
          <path d="M10 200 L70 200 L60 178 L20 178 Z" fill="var(--ink)" />
        </svg>

        <div className="relative z-10 max-w-3xl px-6 text-center">
          <motion.h2
            initial={{ y: 40, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.7, ease: [0.22, 1.2, 0.36, 1] }}
            className="font-display text-[clamp(2rem,4vw,3.5rem)] font-semibold leading-[1.08] text-ink"
          >
            {t('home.goldenHour.title')}
          </motion.h2>
          <motion.p
            initial={{ y: 30, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ delay: 0.15, duration: 0.6, ease: [0.22, 1.2, 0.36, 1] }}
            className="mx-auto mt-4 max-w-xl text-lg font-semibold text-ink/80"
          >
            {t('home.goldenHour.body')}
          </motion.p>
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ delay: 0.25, duration: 0.6, ease: [0.22, 1.2, 0.36, 1] }}
            className="mt-8"
          >
            <Link
              to="/windbell-isle"
              className="btn-primary ambient px-7 py-3.5 text-base"
              style={{ animation: 'st-match-pulse 2s ease-in-out infinite' }}
            >
              {t('home.goldenHour.cta')} <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}

/* ================= Section 8 — Bulletin Board ================= */
const NOTES = [
  { titleKey: 'home.bulletin.notes.0.title', bodyKey: 'home.bulletin.notes.0.body', rotate: -3, accent: '#F4B942' },
  { titleKey: 'home.bulletin.notes.1.title', bodyKey: 'home.bulletin.notes.1.body', rotate: 2, accent: '#FF9B9B' },
  { titleKey: 'home.bulletin.notes.2.title', bodyKey: 'home.bulletin.notes.2.body', rotate: -1.5, accent: '#8FD3A8' },
];

export function BulletinBoard() {
  const { t } = useLanguage();
  return (
    <section className="mx-auto max-w-[1200px] px-6 py-24">
      <div className="relative rounded-[32px] border-[3px] border-white bg-sand p-8 shadow-sticker md:p-12">
        {/* washi tape border corners */}
        {['-left-3 -top-3 -rotate-45', '-right-3 -top-3 rotate-45', '-left-3 -bottom-3 rotate-45', '-right-3 -bottom-3 -rotate-45'].map(
          (pos, i) => (
            <span key={i} className={`absolute h-8 w-20 bg-butter/70 ${pos}`} aria-hidden />
          ),
        )}
        <h2 className="text-center font-display text-[clamp(2rem,4vw,3.5rem)] font-semibold text-ink">
          {t('home.bulletin.title')}
        </h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {NOTES.map((n, i) => (
            <motion.div
              key={n.titleKey}
              initial={{ y: -40, rotate: 10, opacity: 0 }}
              whileInView={{ y: 0, rotate: n.rotate, opacity: 1 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{
                delay: i * 0.15,
                duration: 0.5,
                ease: [0.34, 2, 0.64, 1],
              }}
              whileHover={{ rotate: 0, scale: 1.03 }}
              className="relative bg-paper p-6 pt-8 shadow-sticker"
              style={{ borderRadius: 6 }}
            >
              <span
                className="absolute -top-3 left-1/2 flex h-7 w-7 -translate-x-1/2 items-center justify-center rounded-full border-2 border-white shadow-md"
                style={{ background: n.accent }}
                aria-hidden
              >
                <Pin className="h-3.5 w-3.5 text-ink" />
              </span>
              <h3 className="font-display text-lg font-semibold text-ink">{t(n.titleKey)}</h3>
              <p className="mt-2 font-hand text-xl leading-snug text-ink-soft">{t(n.bodyKey)}</p>
            </motion.div>
          ))}
        </div>
        <div className="mt-10 text-center">
          <Link to="/journal" className="btn-secondary px-6 py-3">
            {t('home.bulletin.readJournal')}
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ================= Section 9 — Summer Pledge ================= */
const PLEDGE_ITEM_KEYS = ['home.pledge.items.0', 'home.pledge.items.1', 'home.pledge.items.2'];

/* Live footprint counter. Renders nothing when the backend is unreachable
   (e.g. the static GitHub Pages build), so the pledge stays clean. */
function Footprints() {
  const { t } = useLanguage();
  const [bump, setBump] = useState<number | null>(null);
  const [pops, setPops] = useState<number[]>([]);
  const footprints = trpc.town.getFootprints.useQuery(undefined, { retry: false });
  const addFootprint = trpc.town.addFootprint.useMutation();

  const count = bump ?? footprints.data?.count ?? null;
  if (footprints.isError || count === null) return null;

  const leaveFootprint = () => {
    addFootprint.mutate(undefined, {
      onSuccess: (data) => {
        if (data.added) {
          setBump(data.count);
          const id = Date.now();
          setPops((p) => [...p, id]);
          window.setTimeout(() => setPops((p) => p.filter((x) => x !== id)), 900);
        } else {
          toast(t('home.footprints.alreadyToday'));
        }
      },
      onError: () => undefined, // static build: stay quiet
    });
  };

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      whileInView={{ y: 0, opacity: 1 }}
      viewport={{ once: true, amount: 0.6 }}
      transition={{ delay: 0.8, duration: 0.5, ease: [0.22, 1.2, 0.36, 1] }}
      className="mt-10 flex flex-col items-center gap-2"
    >
      <div className="relative">
        <button
          type="button"
          onClick={leaveFootprint}
          disabled={addFootprint.isPending}
          className="btn-primary px-6 py-3 font-hand text-2xl"
        >
          {t('home.footprints.button')}
        </button>
        <AnimatePresence>
          {pops.map((id) => (
            <motion.span
              key={id}
              initial={{ scale: 0, y: 0, opacity: 1, rotate: -12 }}
              animate={{ scale: 1.6, y: -46, opacity: 0, rotate: 10 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="pointer-events-none absolute -top-2 left-1/2 text-2xl"
              aria-hidden
            >
              🐾
            </motion.span>
          ))}
        </AnimatePresence>
      </div>
      <p className="font-hand text-2xl text-ink-soft">
        {t('home.footprints.count', { n: count.toLocaleString() })}
      </p>
    </motion.div>
  );
}

export function Pledge() {
  const { t } = useLanguage();
  return (
    <section className="mx-auto max-w-[720px] px-6 pb-28 pt-8 text-center">
      <motion.p
        initial={{ y: 30, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 0.6, ease: [0.22, 1.2, 0.36, 1] }}
        className="font-hand text-[clamp(1.8rem,4vw,2.6rem)] leading-snug text-ink"
      >
        {t('home.pledge.quote')}
      </motion.p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
        {PLEDGE_ITEM_KEYS.map((key, i) => (
          <motion.div
            key={key}
            initial={{ x: -12, opacity: 0 }}
            whileInView={{ x: 0, opacity: 1 }}
            viewport={{ once: true, amount: 0.6 }}
            transition={{ delay: i * 0.25, duration: 0.4 }}
            className="flex items-center gap-2.5"
          >
            <svg width="26" height="26" viewBox="0 0 26 26">
              <circle cx="13" cy="13" r="11.5" fill="var(--mint)" />
              <motion.path
                d="M8 13.5 L11.5 17 L18 9.5"
                fill="none"
                stroke="var(--ink)"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 + i * 0.25, duration: 0.4 }}
              />
            </svg>
            <span className="text-sm font-extrabold text-ink">{t(key)}</span>
          </motion.div>
        ))}
      </div>
      <Footprints />
    </section>
  );
}
