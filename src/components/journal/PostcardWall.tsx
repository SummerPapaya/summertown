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
import type { DoodleId } from './presets';
import { DOODLES, EASE_BACK_156, EASE_SQUASH } from './presets';
import { Doodle, PostmarkStamp } from './bits';

const STORE_KEY = 'st-postcards';
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

function stampDate(d = new Date()): string {
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
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

/* the 8 seeded postcards (journal.md §4) */
const SEEDS: WallPostcard[] = [
  {
    id: 's1',
    scene: '/scene-magic.png',
    message: 'Got lost in the Magic House. Found a better version of myself. 10/10',
    signature: '— M.',
    doodle: 'windbell',
    date: 'JUN 14',
    rest: -2.4,
  },
  {
    id: 's2',
    doodle: 'apple',
    message: 'The pie bell is real. We waited. Worth it.',
    signature: '— the Hendersons',
    date: 'JUN 11',
    rest: 1.8,
  },
  {
    id: 's3',
    doodle: 'windbell',
    message: 'Heard the bells ring by themselves. I was, in fact, on my way home.',
    signature: '— R.',
    date: 'JUN 9',
    rest: -1.2,
  },
  {
    id: 's4',
    scene: '/scene-radio.png',
    message: 'Requested a song for my gran. Sunny dedicated it to a passing boat. She cried. The boat did too, probably.',
    signature: '— P.',
    date: 'JUN 6',
    rest: 2.6,
  },
  {
    id: 's5',
    scene: '/scene-hotel.png',
    message: 'Came for one night at Hotel Horizon. Stayed for four sunsets.',
    signature: '— O.',
    date: 'JUN 2',
    rest: -2.8,
  },
  {
    id: 's6',
    doodle: 'lighthouse',
    message: 'Climbed the lighthouse. The keeper waved. I waved back. Would wave again.',
    signature: '— T.',
    date: 'MAY 29',
    rest: 1.4,
  },
  {
    id: 's7',
    scene: '/scene-coffee.png',
    message: 'The sea-salt latte rearranged my priorities.',
    signature: '— anonymous',
    date: 'MAY 27',
    rest: -1.8,
  },
  {
    id: 's8',
    doodle: 'shell',
    message: 'Found a shell that sounds exactly like the 6pm mix. The tide has taste.',
    signature: '— K.',
    date: 'MAY 22',
    rest: 2.2,
  },
];

export default function PostcardWall() {
  const reduced = useReducedMotion();
  const [userCards, setUserCards] = useState<StoredPostcard[]>(readUserCards);
  const [justPinned, setJustPinned] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const wall: WallPostcard[] = useMemo(
    () => [...userCards.map((c) => ({ ...c, rest: -2, user: true })), ...SEEDS],
    [userCards],
  );

  const pinCard = (card: StoredPostcard) => {
    const next = [card, ...userCards].slice(0, 24);
    setUserCards(next);
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
    setJustPinned(card.id);
    setOpen(false);
    toast('Pinned to the wall!', { description: 'The imaginary mailbox delivers again.' });
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
            Postcard wall
          </p>
          <h2
            id="postcards-title"
            className="mt-2 font-display text-[clamp(2rem,4vw,3.5rem)] font-semibold leading-[1.05] text-ink"
          >
            Postcards from visitors
          </h2>
          <p className="mt-1.5 font-hand text-[clamp(1.25rem,2vw,1.6rem)] text-ink-soft">
            leave one, the mailbox is imaginary but reliable
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
                Write a postcard
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
          fresh from the mailbox
        </span>
      )}
    </motion.div>
  );
}

/* ================= write-a-postcard dialog ================= */
function WritePostcardDialog({
  onPin,
  reduced,
}: {
  onPin: (card: StoredPostcard) => void;
  reduced: boolean;
}) {
  const [doodle, setDoodle] = useState<DoodleId>('shell');
  const [message, setMessage] = useState('');
  const [signature, setSignature] = useState('');

  const canPin = message.trim().length > 0;

  const submit = () => {
    if (!canPin) return;
    onPin({
      id: `u${Date.now()}`,
      message: message.trim().slice(0, 140),
      signature: signature.trim() ? `— ${signature.trim()}` : '— a passerby',
      doodle,
      date: stampDate(),
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
            Write a postcard
          </DialogTitle>
          <DialogDescription className="font-hand text-xl text-ink-soft">
            pick a doodle, say it in 140 characters, sign it like you mean it
          </DialogDescription>
        </DialogHeader>

        {/* doodle select */}
        <fieldset className="mt-5">
          <legend className="text-[0.72rem] font-extrabold uppercase tracking-[0.16em] text-ink-soft">
            Doodle
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
                    {d.label}
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>

        {/* live preview */}
        <div className="mt-5">
          <p className="text-[0.72rem] font-extrabold uppercase tracking-[0.16em] text-ink-soft">
            Preview
          </p>
          <div className="sticker-card mt-2 flex items-start gap-4 p-4" style={{ rotate: '-1deg' }}>
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-cream">
              <Doodle id={doodle} size={52} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="break-words font-hand text-[1.4rem] leading-[1.25] text-ink">
                {message.trim() || 'dear summer town…'}
              </p>
              <div className="mt-1.5 flex items-end justify-between gap-2">
                <p className="text-xs font-extrabold text-ink-soft">
                  {signature.trim() ? `— ${signature.trim()}` : '— a passerby'}
                </p>
                <PostmarkStamp size={48} date={stampDate()} />
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
            Message
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
            placeholder="The bells rang and I understood everything, briefly…"
            className="mt-2 w-full resize-none rounded-2xl border-[3px] border-white bg-cream px-4 py-3 font-hand text-2xl leading-[1.3] text-ink placeholder:text-ink-soft/50 focus:outline-none focus:ring-2 focus:ring-lagoon"
          />
        </div>

        {/* signature */}
        <div className="mt-4">
          <label
            htmlFor="st-pc-sig"
            className="text-[0.72rem] font-extrabold uppercase tracking-[0.16em] text-ink-soft"
          >
            Signature
          </label>
          <input
            id="st-pc-sig"
            value={signature}
            maxLength={32}
            onChange={(e) => setSignature(e.target.value)}
            placeholder="your name (or alias)"
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
            Pin it
          </button>
        </div>
      </motion.div>
    </DialogContent>
  );
}
