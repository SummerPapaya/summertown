import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowUpRight, Download, Stamp } from 'lucide-react';
import { FILTERS, LANDMARKS } from '@/lib/landmarks';
import type { FilterId, Landmark } from '@/lib/landmarks';
import { useTown } from '@/lib/town';
import { useLanguage } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { downloadBlob, renderPassportImage } from '@/lib/passportImage';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { EASE_BACK_156, EASE_SQUASH } from './presets';
import { ArrowDoodle, CollectedStamp, TapeStrip } from './bits';

/** journal chip labels (FILTERS ids come from landmarks.ts) */
const CHIP_KEY: Record<FilterId, string> = {
  all: 'journal.passport.chips.all',
  culture: 'journal.passport.chips.culture',
  food: 'journal.passport.chips.food',
  stay: 'journal.passport.chips.stay',
  magic: 'journal.passport.chips.magic',
  isle: 'journal.passport.chips.isle',
};

export default function Passport() {
  const { stamps } = useTown();
  const { t } = useLanguage();
  const reduced = useReducedMotion();
  const [filter, setFilter] = useState<FilterId>('all');

  const visible = LANDMARKS.filter((l) => filter === 'all' || l.filter === filter);
  const n = stamps.length;
  const complete = n >= LANDMARKS.length;
  const [passportOpen, setPassportOpen] = useState(false);

  return (
    <section className="relative" aria-labelledby="passport-title">
      <h2 id="passport-title" className="sr-only">
        {t('journal.passport.srTitle')}
      </h2>

      {/* sticky toolbar under the navbar */}
      <div className="sticky top-[76px] z-30 px-3 sm:px-6">
        <div className="mx-auto flex max-w-[1200px] items-center gap-3 rounded-[28px] border-[3px] border-white bg-[rgba(255,249,239,0.85)] py-2 pl-3 pr-2 shadow-sticker backdrop-blur-[12px] sm:pl-4">
          {/* filter chips — horizontal scroll on mobile */}
          <div
            className="no-scrollbar flex flex-1 items-center gap-2 overflow-x-auto"
            role="group"
            aria-label={t('journal.passport.filterAria')}
          >
            {FILTERS.map((f) => {
              const active = filter === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setFilter(f.id)}
                  className={cn(
                    'shrink-0 rounded-full border-2 px-4 py-2 text-[0.72rem] font-extrabold uppercase tracking-[0.14em] transition-all duration-300 ease-squash',
                    active
                      ? 'scale-105 border-white text-ink shadow-pop'
                      : 'border-ink/10 bg-white/60 text-ink-soft hover:scale-105 hover:border-white hover:bg-white',
                  )}
                  style={active ? { background: f.accent } : undefined}
                >
                  {t(CHIP_KEY[f.id])}
                </button>
              );
            })}
          </div>

          {/* passport progress */}
          <div className="flex shrink-0 items-center gap-2.5">
            <div className="hidden text-right sm:block">
              <p className="text-[0.72rem] font-extrabold uppercase tracking-[0.14em] text-ink">
                {t('journal.passport.collected', { n })}
              </p>
              <p className="font-hand text-lg leading-[1.1] text-ink-soft">
                {complete ? t('journal.passport.completeHint') : t('journal.passport.dareYou')}
              </p>
            </div>
            {complete && (
              <button
                type="button"
                onClick={() => setPassportOpen(true)}
                className="btn-primary hidden h-11 shrink-0 px-4 py-0 text-[0.78rem] sm:inline-flex"
              >
                <Stamp className="h-4 w-4" aria-hidden />
                {t('journal.passport.make')}
              </button>
            )}
            <PassportBadge n={n} />
          </div>
        </div>

        {complete && (
          <div className="mx-auto mt-2 max-w-[1200px] sm:hidden">
            <button
              type="button"
              onClick={() => setPassportOpen(true)}
              className="btn-primary w-full"
            >
              <Stamp className="h-4 w-4" aria-hidden />
              {t('journal.passport.make')}
            </button>
          </div>
        )}

        {/* empty-collection nudge */}
        {n === 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5, ease: EASE_SQUASH }}
            className="pointer-events-none mx-auto mt-2 flex max-w-[1200px] items-center gap-1 pl-4"
          >
            <span className="font-hand text-xl text-ink-soft">
              {t('journal.passport.noStamps')}
            </span>
            <ArrowDoodle className="-mt-1" />
          </motion.div>
        )}
      </div>

      {/* card grid */}
      <div className="mx-auto max-w-[1200px] px-4 pb-24 pt-8 sm:px-6">
        <motion.div layout className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {visible.map((lm, i) => (
              <PassportCard
                key={lm.id}
                lm={lm}
                index={LANDMARKS.indexOf(lm)}
                order={i}
                collected={stamps.includes(lm.id)}
                reduced={!!reduced}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      </div>

      <PassportDialog open={passportOpen} onOpenChange={setPassportOpen} />
    </section>
  );
}

function PassportDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t, lang } = useLanguage();
  const [src, setSrc] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const issued = new Date();
    const dateLabel =
      lang === 'zh'
        ? `${issued.getFullYear()}年${issued.getMonth() + 1}月${issued.getDate()}日`
        : issued.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

    setBusy(true);
    setError(false);
    setSrc(null);
    setBlob(null);

    renderPassportImage({
      title: t('journal.passport.dialogTitle'),
      visitor: t('journal.passport.visitor'),
      issued: t('journal.passport.issued', { date: dateLabel }),
      est: t('journal.passport.est'),
      stamps: LANDMARKS.map((lm) => ({ name: t(lm.nameKey), accent: lm.accent })),
      logoUrl: `${window.location.origin}/logo.svg`,
      zh: lang === 'zh',
    })
      .then((next) => {
        if (cancelled) return;
        setBlob(next);
        setSrc(URL.createObjectURL(next));
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, lang, t]);

  useEffect(() => {
    return () => {
      if (src) URL.revokeObjectURL(src);
    };
  }, [src]);

  const filename = lang === 'zh' ? '夏天镇护照.png' : 'summer-town-passport.png';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto rounded-[28px] border-[3px] border-white bg-paper sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-semibold text-ink">
            {t('journal.passport.dialogTitle')}
          </DialogTitle>
          <DialogDescription className="font-hand text-xl text-ink-soft">
            {t('journal.passport.dialogDesc')}
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 overflow-hidden rounded-[22px] border-[3px] border-white bg-lilac/40">
          {src && (
            <img src={src} alt={t('journal.passport.dialogTitle')} className="block w-full" />
          )}
          {busy && !src && (
            <p className="px-6 py-16 text-center font-hand text-2xl text-ink-soft">
              {t('common.loading')}
            </p>
          )}
          {error && (
            <p className="px-6 py-16 text-center font-hand text-2xl text-coral">
              {t('journal.passport.makeError')}
            </p>
          )}
        </div>
        <button
          type="button"
          disabled={!blob}
          onClick={() => blob && downloadBlob(blob, filename)}
          className="btn-primary mt-4 w-full disabled:translate-y-0 disabled:opacity-60"
        >
          <Download className="h-4 w-4" aria-hidden />
          {t('journal.passport.download')}
        </button>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- circular n/14 passport badge ---------- */
function PassportBadge({ n }: { n: number }) {
  const { t } = useLanguage();
  const done = n >= 14;
  const label = t('journal.passport.badgeAria', { n });
  return (
    <motion.div
      key={n}
      initial={{ scale: 1.35, rotate: -12 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ duration: 0.45, ease: EASE_BACK_156 }}
      className="relative flex h-16 w-16 items-center justify-center rounded-full border-[3px] bg-paper"
      style={{ borderColor: done ? '#8FD3A8' : '#FF9B9B' }}
      title={label}
      aria-label={label}
      role="img"
    >
      <span className="absolute inset-[5px] rounded-full border-2 border-dashed border-ink/15" />
      <span className="font-display text-base font-semibold leading-none text-ink">
        {n}
        <span className="text-[0.65rem] text-ink-soft">/14</span>
      </span>
    </motion.div>
  );
}

/* ---------- landmark passport card ---------- */
function PassportCard({
  lm,
  index,
  order,
  collected,
  reduced,
}: {
  lm: Landmark;
  index: number;
  order: number;
  collected: boolean;
  reduced: boolean;
}) {
  const { t } = useLanguage();
  const num = `#${String(index + 1).padStart(2, '0')}`;
  return (
    <motion.article
      layout
      initial={reduced ? { opacity: 0 } : { y: 50, rotate: 2, opacity: 0 }}
      whileInView={reduced ? { opacity: 1 } : { y: 0, rotate: 0, opacity: 1 }}
      viewport={{ once: true, amount: 0.15 }}
      exit={{ scale: 0, opacity: 0, transition: { duration: 0.35 } }}
      transition={{
        delay: reduced ? 0 : (order % 6) * 0.05,
        duration: 0.6,
        ease: EASE_SQUASH,
        layout: { type: 'spring', stiffness: 260, damping: 26 },
      }}
      whileHover={reduced ? undefined : { y: -8, rotate: -1.5, transition: { duration: 0.3, ease: EASE_SQUASH } }}
      className="sticker-card group relative p-3.5 transition-shadow duration-300 hover:shadow-[0_22px_44px_rgba(74,68,112,0.18),0_3px_0_rgba(74,68,112,0.06)]"
    >
      {/* tape corner — lifts on hover */}
      <TapeStrip className="-top-2 left-8 h-6 w-20 -rotate-6 transition-transform duration-300 ease-squash group-hover:-translate-y-1 group-hover:-rotate-3" />

      {/* thumbnail */}
      <div className="relative aspect-[16/10] overflow-hidden rounded-[18px] bg-lilac/40">
        <img
          src={lm.scene}
          alt={t('detail.sceneAlt', { name: t(lm.nameKey) })}
          loading="lazy"
          onError={(e) => {
            const t = e.currentTarget;
            if (!t.src.endsWith(lm.img)) t.src = lm.img;
          }}
          className="h-full w-full object-cover transition-transform duration-300 ease-squash group-hover:scale-105"
        />
        {/* category chip */}
        <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1.5 rounded-full border-2 border-white bg-[rgba(255,249,239,0.9)] px-2.5 py-1 text-[0.62rem] font-extrabold uppercase tracking-[0.12em] text-ink shadow-sm">
          <span className="h-2 w-2 rounded-full" style={{ background: lm.accent }} />
          {t(CHIP_KEY[lm.filter])}
        </span>
        {/* collected stamp — rubber-stamp slam */}
        {collected && (
          <motion.div
            initial={reduced ? { opacity: 0 } : { scale: 2, rotate: -26, opacity: 0 }}
            animate={reduced ? { opacity: 1 } : { scale: 1, rotate: -12, opacity: 1 }}
            transition={{ delay: 0.35, duration: 0.45, ease: EASE_BACK_156 }}
            className="absolute right-1.5 top-1.5"
          >
            <CollectedStamp size={66} />
          </motion.div>
        )}
      </div>

      {/* name + tagline */}
      <div className="px-1.5 pb-1.5 pt-3.5">
        <h3 className="font-display text-[clamp(1.2rem,1.6vw,1.45rem)] font-semibold leading-[1.15] text-ink">
          {t(lm.nameKey)}
        </h3>
        <p className="mt-1 font-hand text-[1.3rem] leading-[1.2] text-ink-soft">{t(lm.taglineKey)}</p>

        {/* bottom row */}
        <div className="mt-3.5 flex items-center justify-between gap-2">
          <Link
            to={`/?place=${lm.id}`}
            className="inline-flex items-center gap-1.5 rounded-full border-[3px] border-white px-4 py-2 text-[0.78rem] font-extrabold text-ink shadow-pop transition-all duration-300 ease-squash hover:-translate-y-0.5 hover:scale-105 active:translate-y-0.5"
            style={{ background: lm.accent }}
          >
            {t('journal.passport.openOnMap')}
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
          <span className="rounded-full bg-ink/[0.06] px-2.5 py-1 font-display text-[0.72rem] font-semibold tracking-[0.08em] text-ink-soft">
            {num}
          </span>
        </div>
      </div>
    </motion.article>
  );
}
