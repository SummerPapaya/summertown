import { useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { PenLine, Pin } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { trpc } from '@/providers/trpc';
import { useLanguage } from '@/lib/i18n';
import type { Language } from '@/lib/i18n';
import type { DoodleId } from './presets';
import { DOODLES, EASE_BACK_156, EASE_SQUASH } from './presets';
import { Doodle, PostmarkStamp } from './bits';

const STORE_KEY = 'st-postcards';
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

function fmtDate(month: number, day: number, lang: Language): string {
  return lang === 'zh' ? `${month + 1}月${day}日` : `${MONTHS[month]} ${day}`;
}

function stampDate(lang: Language, d = new Date()): string {
  return fmtDate(d.getMonth(), d.getDate(), lang);
}

interface StoredPostcard {
  id: string;
  message: string;
  signature: string;
  doodle: DoodleId;
  date: string;
}

interface WallPostcard extends Omit<StoredPostcard, 'doodle'> {
  doodle?: DoodleId;
  scene?: string;
  rest: number;
  user?: boolean;
}

function readUserCards(): StoredPostcard[] {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return [];
    const arr: unknown = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.filter(
      (c): c is StoredPostcard =>
        !!c &&
        typeof c === 'object' &&
        typeof (c as StoredPostcard).id === 'string' &&
        typeof (c as StoredPostcard).message === 'string' &&
        DOODLES.some((d) => d.id === (c as StoredPostcard).doodle),
    );
  } catch {
    return [];
  }
}

/* map a DB postcard row to the StoredPostcard shape used by the wall */
function dbCardToStored(
  row: {
    id: number;
    message: string;
    signature: string;
    doodle: string;
    createdAt: Date | string;
  },
  lang: Language,
): StoredPostcard {
  return {
    id: `db${row.id}`,
    message: row.message,
    signature: row.signature,
    doodle: DOODLES.some((d) => d.id === row.doodle) ? (row.doodle as DoodleId) : 'shell',
    date: stampDate(lang, new Date(row.createdAt)),
  };
}

/* the 8 seeded postcards (journal.md §4) — copy lives in the dictionaries */
interface SeedPostcard {
  id: string;
  scene?: string;
  seedIndex: number;
  doodle?: DoodleId;
  dateMD: [number, number]; // [month (0-based), day]
  rest: number;
}

const SEEDS: SeedPostcard[] = [
  { id: 's1', scene: '/scene-magic.png', seedIndex: 0, doodle: 'windbell', dateMD: [5, 14], rest: -2.4 },
  { id: 's2', doodle: 'apple', seedIndex: 1, dateMD: [5, 11], rest: 1.8 },
  { id: 's3', doodle: 'windbell', seedIndex: 2, dateMD: [5, 9], rest: -1.2 },
  { id: 's4', scene: '/scene-radio.png', seedIndex: 3, dateMD: [5, 6], rest: 2.6 },
  { id: 's5', scene: '/scene-hotel.png', seedIndex: 4, dateMD: [5, 2], rest: -2.8 },
  { id: 's6', doodle: 'lighthouse', seedIndex: 5, dateMD: [4, 29], rest: 1.4 },
  { id: 's7', scene: '/scene-coffee.png', seedIndex: 6, dateMD: [4, 27], rest: -1.8 },
  { id: 's8', doodle: 'shell', seedIndex: 7, dateMD: [4, 22], rest: 2.2 },
];

export default function PostcardWall() {
  const reduced = useReducedMotion();
  const { lang, t } = useLanguage();
  const [userCards, setUserCards] = useState<StoredPostcard[]>(readUserCards);
  const [backendDown, setBackendDown] = useState(false);
  const [justPinned, setJustPinned] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const utils = trpc.useUtils();
  const listQuery = trpc.town.listPostcards.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });
  const addPostcard = trpc.town.addPostcard.useMutation();

  // backend mode once the list has loaded; any fetch/network failure keeps
  // us on the localStorage path (static builds have no /api at all)
  const backendOk = listQuery.isSuccess && !backendDown;

  /* older pages fetched via the "load more" button (offset pagination) */
  const [olderCards, setOlderCards] = useState<{
    rows: Awaited<ReturnType<typeof utils.town.listPostcards.fetch>>['items'];
    nextCursor: number | null;
  }>({ rows: [], nextCursor: null });
  const [loadingMore, setLoadingMore] = useState(false);
  const cardsCursor = olderCards.rows.length
    ? olderCards.nextCursor
    : (listQuery.data?.nextCursor ?? null);

  const loadMoreCards = async () => {
    if (loadingMore || cardsCursor == null) return;
    setLoadingMore(true);
    try {
      const page = await utils.town.listPostcards.fetch({ cursor: cardsCursor });
      setOlderCards((prev) => {
        const seen = new Set([
          ...(listQuery.data?.items ?? []).map((r) => r.id),
          ...prev.rows.map((r) => r.id),
        ]);
        return {
          rows: [...prev.rows, ...page.items.filter((r) => !seen.has(r.id))],
          nextCursor: page.nextCursor,
        };
      });
    } catch {
      /* keep the button visible so the visitor can retry */
    } finally {
      setLoadingMore(false);
    }
  };

  const wall: WallPostcard[] = useMemo(
    () => [
      ...(backendOk
        ? [...(listQuery.data?.items ?? []), ...olderCards.rows].map((r) =>
            dbCardToStored(r, lang),
          )
        : userCards
      ).map((c) => ({
        ...c,
        rest: -2,
        user: true,
      })),
      ...SEEDS.map((s) => ({
        id: s.id,
        scene: s.scene,
        message: t(`journal.postcards.seeds.${s.seedIndex}.message`),
        signature: t(`journal.postcards.seeds.${s.seedIndex}.signature`),
        doodle: s.doodle,
        date: fmtDate(s.dateMD[0], s.dateMD[1], lang),
        rest: s.rest,
      })),
    ],
    [backendOk, listQuery.data, olderCards.rows, userCards, lang, t],
  );

  const pinLocal = (card: StoredPostcard) => {
    const next = [card, ...userCards].slice(0, 24);
    setUserCards(next);
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  const pinCard = (card: StoredPostcard) => {
    if (!backendOk) {
      pinLocal(card);
      setJustPinned(card.id);
      setOpen(false);
      toast(t('journal.postcards.pinnedToast'), { description: t('journal.postcards.pinnedToastDesc') });
      return;
    }
    // optimistic: prepend a temp row so the slam animation fires instantly
    const tempId = -Date.now();
    // a new row at the head shifts every offset — previously loaded older
    // pages would skip a card, so collapse back to the first page
    setOlderCards({ rows: [], nextCursor: null });
    utils.town.listPostcards.setData(undefined, (old) => ({
      items: [
        { id: tempId, message: card.message, signature: card.signature, doodle: card.doodle, createdAt: new Date() },
        ...(old?.items ?? []),
      ],
      total: (old?.total ?? 0) + 1,
      nextCursor: old?.nextCursor ?? null,
    }));
    setJustPinned(`db${tempId}`);
    setOpen(false);
    toast(t('journal.postcards.pinnedToast'), { description: t('journal.postcards.pinnedToastDesc') });
    addPostcard.mutate(
      {
        message: card.message.slice(0, 280),
        signature: card.signature.slice(0, 60),
        doodle: card.doodle,
      },
      {
        // on success nothing to do: the optimistic row is data-identical to
        // the saved one, and the next mount refetches fresh rows anyway
        // (swapping it in would remount the card mid-slam-animation)
        onError: () => {
          // network/static-build failure: roll back the optimistic card and
          // silently persist to localStorage instead (no error toast)
          utils.town.listPostcards.setData(undefined, (old) =>
            old
              ? {
                  ...old,
                  items: old.items.filter((r) => r.id !== tempId),
                  total: Math.max(0, old.total - 1),
                }
              : old,
          );
          setBackendDown(true);
          pinLocal(card);
          setJustPinned(card.id);
        },
      },
    );
  };

  return (
    <section className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6 md:py-24" aria-labelledby="postcards-title">
      {/* header + CTA */}
      <div className="flex flex-wrap items-end justify-between gap-5">
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.6, ease: EASE_SQUASH }}
        >
          <p className="text-[0.72rem] font-extrabold uppercase tracking-[0.16em] text-coral">
            {t('journal.postcards.kicker')}
          </p>
          <h2
            id="postcards-title"
            className="mt-2 font-display text-[clamp(2rem,4vw,3.5rem)] font-semibold leading-[1.05] text-ink"
          >
            {t('journal.postcards.title')}
          </h2>
          <p className="mt-1.5 font-hand text-[clamp(1.25rem,2vw,1.6rem)] text-ink-soft">
            {t('journal.postcards.hand')}
          </p>
        </motion.div>

        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          whileInView={{ scale: 1, opacity: 1 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ delay: 0.15, duration: 0.5, ease: EASE_BACK_156 }}
        >
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <button type="button" className="btn-primary">
                <PenLine className="h-4 w-4" />
                {t('journal.postcards.write')}
              </button>
            </DialogTrigger>
            <WritePostcardDialog onPin={pinCard} reduced={!!reduced} />
          </Dialog>
        </motion.div>
      </div>

      {/* masonry wall */}
      <div className="mt-10 columns-1 gap-6 sm:columns-2 lg:columns-3">
        {wall.map((card, i) => (
          <PostcardCard
            key={card.id}
            card={card}
            index={i}
            slam={card.id === justPinned}
            reduced={!!reduced}
          />
        ))}
      </div>

      {/* local-only mode already shows every card — no pager needed */}
      {backendOk && cardsCursor != null && (
        <div className="mt-2 flex justify-center">
          <button
            type="button"
            onClick={() => void loadMoreCards()}
            disabled={loadingMore}
            className="btn-secondary px-5 py-2 text-sm disabled:translate-y-0 disabled:cursor-wait disabled:opacity-60"
          >
            {loadingMore ? t('common.loading') : t('common.loadMore')}
          </button>
        </div>
      )}
    </section>
  );
}

/* ================= single postcard ================= */
function PostcardCard({
  card,
  index,
  slam,
  reduced,
}: {
  card: WallPostcard;
  index: number;
  slam: boolean;
  reduced: boolean;
}) {
  const entrance = slam
    ? {
        initial: reduced ? { opacity: 0 } : { scale: 1.6, rotate: 8, opacity: 0 },
        animate: reduced ? { opacity: 1 } : { scale: 1, rotate: -2, opacity: 1 },
        transition: { duration: reduced ? 0.4 : 0.5, ease: EASE_BACK_156 },
      }
    : {
        initial: reduced ? { opacity: 0 } : { y: 60, rotate: 6, opacity: 0 },
        whileInView: reduced ? { opacity: 1 } : { y: 0, rotate: card.rest, opacity: 1 },
        viewport: { once: true, amount: 0.2 },
        transition: {
          delay: reduced ? 0 : (index % 6) * 0.07,
          duration: 0.55,
          ease: EASE_SQUASH,
        },
      };

  return (
    <motion.div
      {...entrance}
      whileHover={reduced ? undefined : { y: -6, rotate: 0, scale: 1.02, transition: { duration: 0.3, ease: EASE_SQUASH } }}
      className="sticker-card mb-6 inline-block w-full break-inside-avoid p-4"
    >
      {/* scene crop or doodle */}
      {card.scene ? (
        <div className="overflow-hidden rounded-[18px] bg-lilac/40">
          <img
            src={card.scene}
            alt=""
            loading="lazy"
            className="h-32 w-full object-cover"
          />
        </div>
      ) : (
        <div className="flex h-32 items-center justify-center rounded-[18px] bg-cream/80">
          <Doodle id={card.doodle ?? 'shell'} size={76} />
        </div>
      )}

      <p className="mt-3.5 font-hand text-[1.55rem] leading-[1.25] text-ink">{card.message}</p>

      <div className="mt-3 flex items-end justify-between gap-3">
        <p className="text-sm font-extrabold text-ink-soft">{card.signature}</p>
        <motion.div
          initial={slam && !reduced ? { scale: 0, rotate: 20 } : false}
          animate={slam ? { scale: 1, rotate: -8 } : undefined}
          transition={slam ? { delay: 0.3, duration: 0.4, ease: EASE_BACK_156 } : undefined}
          style={slam ? undefined : { rotate: -8 }}
        >
          <PostmarkStamp size={62} date={card.date} />
        </motion.div>
      </div>

      {card.user && (
        <span className="mt-2 inline-block rounded-full bg-mint/70 px-2.5 py-0.5 text-[0.6rem] font-extrabold uppercase tracking-[0.14em] text-ink">
          <FreshBadge />
        </span>
      )}
    </motion.div>
  );
}

/* ================= "fresh from the mailbox" badge ================= */
function FreshBadge() {
  const { t } = useLanguage();
  return <>{t('journal.postcards.freshBadge')}</>;
}

/* ================= write-a-postcard dialog ================= */
function WritePostcardDialog({
  onPin,
  reduced,
}: {
  onPin: (card: StoredPostcard) => void;
  reduced: boolean;
}) {
  const { lang, t } = useLanguage();
  const [doodle, setDoodle] = useState<DoodleId>('shell');
  const [message, setMessage] = useState('');
  const [signature, setSignature] = useState('');

  const canPin = message.trim().length > 0;

  const submit = () => {
    if (!canPin) return;
    onPin({
      id: `u${Date.now()}`,
      message: message.trim().slice(0, 140),
      signature: signature.trim() ? `— ${signature.trim()}` : t('journal.postcards.dialog.passerby'),
      doodle,
      date: stampDate(lang),
    });
    setMessage('');
    setSignature('');
    setDoodle('shell');
  };

  return (
    <DialogContent
      className={cn(
        'max-h-[88dvh] gap-0 overflow-y-auto rounded-[28px] border-[3px] border-white bg-paper p-0 shadow-sticker',
        'data-[state=open]:zoom-in-100 data-[state=closed]:zoom-out-100', // neutralize default zoom; motion below owns the pop
        'max-sm:top-4 max-sm:max-h-[calc(100dvh-2rem)] max-sm:translate-y-0 sm:max-w-xl',
      )}
    >
      <motion.div
        initial={reduced ? { opacity: 0 } : { scale: 0.85, opacity: 0 }}
        animate={reduced ? { opacity: 1 } : { scale: 1, opacity: 1 }}
        transition={{ duration: reduced ? 0.25 : 0.35, ease: EASE_BACK_156 }}
        className="p-6 sm:p-7"
      >
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-semibold text-ink">
            {t('journal.postcards.dialog.title')}
          </DialogTitle>
          <DialogDescription className="font-hand text-xl text-ink-soft">
            {t('journal.postcards.dialog.desc')}
          </DialogDescription>
        </DialogHeader>

        {/* doodle select */}
        <fieldset className="mt-5">
          <legend className="text-[0.72rem] font-extrabold uppercase tracking-[0.16em] text-ink-soft">
            {t('journal.postcards.dialog.doodleLegend')}
          </legend>
          <div className="mt-2 grid grid-cols-4 gap-2">
            {DOODLES.map((d) => {
              const active = doodle === d.id;
              return (
                <button
                  key={d.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setDoodle(d.id)}
                  className={cn(
                    'flex flex-col items-center gap-1 rounded-2xl border-[3px] py-2.5 transition-all duration-300 ease-squash',
                    active
                      ? 'scale-105 border-white bg-butter shadow-pop'
                      : 'border-ink/10 bg-white/50 hover:scale-105 hover:border-white',
                  )}
                >
                  <Doodle id={d.id} size={38} />
                  <span className="text-[0.6rem] font-extrabold uppercase tracking-[0.1em] text-ink">
                    {t(d.labelKey)}
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>

        {/* live preview */}
        <div className="mt-5">
          <p className="text-[0.72rem] font-extrabold uppercase tracking-[0.16em] text-ink-soft">
            {t('journal.postcards.dialog.preview')}
          </p>
          <div className="sticker-card mt-2 flex items-start gap-4 p-4" style={{ rotate: '-1deg' }}>
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-cream">
              <Doodle id={doodle} size={52} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="break-words font-hand text-[1.4rem] leading-[1.25] text-ink">
                {message.trim() || t('journal.postcards.dialog.previewPlaceholder')}
              </p>
              <div className="mt-1.5 flex items-end justify-between gap-2">
                <p className="text-xs font-extrabold text-ink-soft">
                  {signature.trim() ? `— ${signature.trim()}` : t('journal.postcards.dialog.passerby')}
                </p>
                <PostmarkStamp size={48} date={stampDate(lang)} />
              </div>
            </div>
          </div>
        </div>

        {/* message */}
        <div className="mt-5">
          <label
            htmlFor="st-pc-msg"
            className="flex items-baseline justify-between text-[0.72rem] font-extrabold uppercase tracking-[0.16em] text-ink-soft"
          >
            {t('journal.postcards.dialog.messageLabel')}
            <span className={cn('font-bold', message.length >= 140 && 'text-coral')}>
              {message.length}/140
            </span>
          </label>
          <textarea
            id="st-pc-msg"
            value={message}
            maxLength={140}
            rows={3}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t('journal.postcards.dialog.messagePlaceholder')}
            className="mt-2 w-full resize-none rounded-2xl border-[3px] border-white bg-cream px-4 py-3 font-hand text-2xl leading-[1.3] text-ink placeholder:text-ink-soft/50 focus:outline-none focus:ring-2 focus:ring-lagoon"
          />
        </div>

        {/* signature */}
        <div className="mt-4">
          <label
            htmlFor="st-pc-sig"
            className="text-[0.72rem] font-extrabold uppercase tracking-[0.16em] text-ink-soft"
          >
            {t('journal.postcards.dialog.signatureLabel')}
          </label>
          <input
            id="st-pc-sig"
            value={signature}
            maxLength={32}
            onChange={(e) => setSignature(e.target.value)}
            placeholder={t('journal.postcards.dialog.signaturePlaceholder')}
            className="mt-2 w-full rounded-full border-[3px] border-white bg-cream px-4 py-2.5 text-sm font-bold text-ink placeholder:text-ink-soft/50 focus:outline-none focus:ring-2 focus:ring-lagoon"
          />
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={submit}
            disabled={!canPin}
            className="btn-primary disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Pin className="h-4 w-4" />
            {t('journal.postcards.dialog.pinButton')}
          </button>
        </div>
      </motion.div>
    </DialogContent>
  );
}
