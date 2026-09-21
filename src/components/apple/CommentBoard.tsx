import { useMemo, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Loader2, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/providers/trpc';
import { newClientId } from '@/lib/clientId';
import { useLanguage } from '@/lib/i18n';
import { cn } from '@/lib/utils';

const APPLE_RED = '#E8563F';

/** localStorage key so a returning guest does not retype their name. */
const NAME_KEY = 'st-apple-comment-name';

/** Top-level comments per page (server default matches). */
const PAGE_SIZE = 5;
/** Replies shown under a comment before the rest collapse behind a toggle. */
const REPLIES_PREVIEW = 2;

interface PhotoLite {
  id: number;
  date: string;
  thumbUrl: string | null;
  imageUrl: string;
  description: string;
}

interface ReplyData {
  id: number;
  parentId: number | null;
  nickname: string;
  isAdmin: boolean;
  body: string;
  createdAt: Date | string;
}

interface ThreadData {
  id: number;
  photoId: number | null;
  photoDate: string | null;
  nickname: string;
  body: string;
  createdAt: Date | string;
  replies: ReplyData[];
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** `2026-09-21 14:03` — local time, no timezone maths to get wrong. */
function stamp(value: Date | string): string {
  const d = value instanceof Date ? value : new Date(value);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/**
 * Guest book hanging under the album (shared by calendar + gallery).
 *
 * Five top-level comments per page with prev/next paging; each comment
 * shows at most two replies inline, the rest collapse behind a toggle.
 * Replies always answer a top-level comment (the API re-points deeper
 * replies to the root, so threads stay two levels).
 *
 * The photo list is passed in rather than fetched: the album page already
 * has every photo in memory, so mapping a comment to its photo costs zero
 * extra requests.
 *
 * Fonts: all Chinese UI text here uses `font-hand` (JasonHandwriting2 —
 * full coverage). `font-display` maps to the GBai subset in zh, which is
 * missing common glyphs like 昵/贴/聊 and falls back to system hei per
 * character. Text typed *inside* inputs intentionally keeps the default
 * sans stack.
 */
export function CommentBoard({
  photos,
  mentionPhotoId,
  onMentionConsumed,
  onOpenPhoto,
}: {
  photos: PhotoLite[];
  /** Pre-selected photo, set when the visitor taps "say something about this"
   *  inside the zoom sheet. */
  mentionPhotoId?: number | null;
  onMentionConsumed?: () => void;
  onOpenPhoto?: (photoId: number) => void;
}) {
  const { t } = useLanguage();

  const [page, setPage] = useState(0); // 0-based
  const listQuery = trpc.town.listAppleComments.useQuery(
    { limit: PAGE_SIZE, cursor: page > 0 ? page * PAGE_SIZE : undefined },
    { retry: 1, refetchOnWindowFocus: false },
  );
  const addComment = trpc.town.addAppleComment.useMutation();

  const [name, setName] = useState(() => {
    try {
      return localStorage.getItem(NAME_KEY) ?? '';
    } catch {
      return ''; // private mode — no remembered name
    }
  });
  const [email, setEmail] = useState('');
  const [body, setBody] = useState('');
  /* The picker keeps the visitor's own choice; a mention handed down from
   * the zoom sheet wins until they pick something themselves (which clears
   * it). Deriving it this way avoids syncing props into state in an effect. */
  const [picked, setPicked] = useState<number | null>(null);
  const photoId = mentionPhotoId ?? picked;

  /* Replies: which thread has an open reply form, its draft, and which
   * threads are expanded past the two-reply preview. */
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [replyDraft, setReplyDraft] = useState('');
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const total = listQuery.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const byId = useMemo(() => {
    const map = new Map<number, PhotoLite>();
    for (const p of photos) map.set(p.id, p);
    return map;
  }, [photos]);

  const items = (listQuery.data?.items ?? []) as ThreadData[];

  const monthName = (date: string) =>
    t(`apple.months.${Number(date.split('-')[1]) - 1}`);

  function rememberName(nickname: string) {
    setName(nickname);
    try {
      localStorage.setItem(NAME_KEY, nickname);
    } catch {
      /* ignore */
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const nickname = name.trim();
    const message = body.trim();
    const mail = email.trim();

    if (!nickname || !message) {
      toast.error(t('apple.comments.required'));
      return;
    }
    if (mail && !EMAIL_RE.test(mail)) {
      toast.error(t('apple.comments.badEmail'));
      return;
    }

    try {
      rememberName(nickname);
      const res = await addComment.mutateAsync({
        nickname,
        body: message,
        email: mail || undefined,
        photoId: photoId ?? null,
        clientId: newClientId(),
      });
      setBody('');
      setPicked(null);
      onMentionConsumed?.();
      toast.success(res.held ? t('apple.comments.held') : t('apple.comments.thanks'));
      await listQuery.refetch();
    } catch (err) {
      /* Rate-limit and moderation rejections carry their own (bilingual)
       * message from the server — surface it instead of a generic failure. */
      toast.error(
        err instanceof Error && err.message ? err.message : t('apple.comments.error'),
      );
    }
  }

  async function submitReply(rootId: number) {
    const nickname = name.trim();
    const message = replyDraft.trim();
    if (!nickname || !message) {
      toast.error(t('apple.comments.required'));
      return;
    }
    try {
      rememberName(nickname);
      const res = await addComment.mutateAsync({
        nickname,
        body: message,
        parentId: rootId,
        clientId: newClientId(),
      });
      setReplyDraft('');
      setReplyTo(null);
      toast.success(res.held ? t('apple.comments.held') : t('apple.comments.thanks'));
      await listQuery.refetch();
    } catch (err) {
      toast.error(
        err instanceof Error && err.message ? err.message : t('apple.comments.error'),
      );
    }
  }

  function toggleExpanded(rootId: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(rootId)) next.delete(rootId);
      else next.add(rootId);
      return next;
    });
  }

  const busy = addComment.isPending;

  const pageNav = pages > 1 && (
    <nav className="mt-6 flex items-center justify-center gap-3">
      <button
        onClick={() => setPage((p) => Math.max(0, p - 1))}
        disabled={page === 0 || listQuery.isFetching}
        aria-label={t('apple.comments.prevPage')}
        className="flex h-10 w-10 items-center justify-center rounded-full border-[3px] border-white bg-white/80 text-ink shadow-md transition-transform hover:-translate-y-0.5 disabled:opacity-40"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <span className="font-hand text-xl text-ink-soft">
        {t('apple.comments.pageInfo', { page: page + 1, pages })}
      </span>
      <button
        onClick={() => setPage((p) => Math.min(pages - 1, p + 1))}
        disabled={page >= pages - 1 || listQuery.isFetching}
        aria-label={t('apple.comments.nextPage')}
        className="flex h-10 w-10 items-center justify-center rounded-full border-[3px] border-white bg-white/80 text-ink shadow-md transition-transform hover:-translate-y-0.5 disabled:opacity-40"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </nav>
  );

  return (
    <section className="sticker-card p-5 sm:p-7">
      <header className="mb-5 text-center">
        <h2
          className="font-hand inline-flex items-center gap-2 text-3xl sm:text-4xl"
          style={{ color: APPLE_RED }}
        >
          <MessageCircle className="h-6 w-6" />
          {t('apple.comments.title')}
        </h2>
        <p className="font-hand mt-1 text-xl text-ink-soft">
          {t('apple.comments.subtitle')}
        </p>
        {total > 0 && (
          <p className="font-hand mt-2 text-lg text-ink-soft">
            {t('apple.comments.count', { n: total })}
          </p>
        )}
      </header>

      <form onSubmit={submit} className="mx-auto max-w-xl space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="font-hand mb-1 block text-2xl text-ink">
              {t('apple.comments.nameLabel')} <span style={{ color: APPLE_RED }}>*</span>
            </span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={24}
              required
              placeholder={t('apple.comments.namePlaceholder')}
              className="w-full rounded-2xl border-[3px] border-white bg-cream px-4 py-2.5 text-ink shadow-inner outline-none focus:border-[#E8563F]"
            />
          </label>

          <label className="block">
            <span className="font-hand mb-1 block text-2xl text-ink">
              {t('apple.comments.emailLabel')}{' '}
              <span className="text-lg text-ink-soft">
                {t('apple.comments.emailHint')}
              </span>
            </span>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              maxLength={120}
              placeholder={t('apple.comments.emailPlaceholder')}
              className="w-full rounded-2xl border-[3px] border-white bg-cream px-4 py-2.5 text-ink shadow-inner outline-none focus:border-[#E8563F]"
            />
          </label>
        </div>

        <label className="block">
          <span className="font-hand mb-1 block text-2xl text-ink">
            {t('apple.comments.bodyLabel')} <span style={{ color: APPLE_RED }}>*</span>
          </span>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={500}
            required
            rows={3}
            placeholder={t('apple.comments.bodyPlaceholder')}
            className="w-full resize-y rounded-2xl border-[3px] border-white bg-cream px-4 py-2.5 text-ink shadow-inner outline-none focus:border-[#E8563F]"
          />
          <span className="font-hand mt-1 block text-right text-lg text-ink-soft">
            {body.length}/500
          </span>
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <span className="font-hand shrink-0 text-2xl text-ink">
            {t('apple.comments.photoLabel')}
          </span>
          <PhotoCalendarPicker
            photos={photos}
            value={photoId}
            onPick={(p) => {
              setPicked(p ? p.id : null);
              onMentionConsumed?.();
            }}
          />

          {photoId != null && byId.get(photoId) && (
            <img
              src={byId.get(photoId)!.thumbUrl ?? byId.get(photoId)!.imageUrl}
              alt={t('apple.comments.mentionedAlt')}
              className="h-12 w-12 rounded-lg border-[3px] border-white object-cover shadow-md"
            />
          )}

          <button
            type="submit"
            disabled={busy}
            className="font-hand inline-flex items-center gap-2 rounded-full border-[3px] border-white px-6 py-2.5 text-2xl text-white shadow-[0_5px_0_rgba(74,68,112,0.18)] transition-transform hover:-translate-y-0.5 disabled:opacity-60"
            style={{ background: APPLE_RED }}
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {busy ? t('apple.comments.submitting') : t('apple.comments.submit')}
          </button>
        </div>
      </form>

      <div className="mt-7 border-t-2 border-dashed border-[#E8563F33] pt-6">
        {listQuery.isLoading ? (
          <p className="font-hand text-center text-2xl text-ink-soft">
            {t('apple.loading')}
          </p>
        ) : items.length === 0 ? (
          <p className="font-hand text-center text-2xl text-ink-soft">
            {t('apple.comments.empty')}
          </p>
        ) : (
          <ul className="mx-auto max-w-2xl space-y-5">
            {items.map((c) => {
              const photo = c.photoId != null ? byId.get(c.photoId) : undefined;
              const isOpen = replyTo === c.id;
              const shownReplies = expanded.has(c.id)
                ? c.replies
                : c.replies.slice(0, REPLIES_PREVIEW);
              const hiddenCount = c.replies.length - REPLIES_PREVIEW;
              return (
                <li
                  key={c.id}
                  className="rounded-2xl border-[3px] border-white bg-cream/70 p-4 shadow-sm"
                >
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <span className="font-hand text-2xl leading-tight text-ink">
                      {c.nickname || t('apple.comments.anonymous')}
                    </span>
                    <span className="text-xs font-bold text-ink-soft">
                      {stamp(c.createdAt)}
                    </span>
                  </div>

                  <p className="font-hand mt-1.5 whitespace-pre-line text-xl leading-snug text-ink">
                    {c.body}
                  </p>

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {(photo || c.photoDate) && (
                      <button
                        type="button"
                        disabled={!photo || !onOpenPhoto}
                        onClick={() => photo && onOpenPhoto?.(photo.id)}
                        title={photo ? t('apple.comments.jump') : undefined}
                        className={cn(
                          'inline-flex items-center gap-2 rounded-full border-2 border-white bg-white/80 px-2.5 py-1 shadow-sm',
                          photo && onOpenPhoto && 'transition-transform hover:-translate-y-0.5',
                        )}
                      >
                        {photo ? (
                          <img
                            src={photo.thumbUrl ?? photo.imageUrl}
                            alt={t('apple.comments.mentionedAlt')}
                            className="h-8 w-8 rounded object-cover"
                          />
                        ) : (
                          <span className="text-lg">🍎</span>
                        )}
                        <span className="font-hand text-lg text-ink">
                          {photo ? monthName(photo.date) : monthName(c.photoDate ?? '')}
                        </span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setReplyDraft('');
                        setReplyTo(isOpen ? null : c.id);
                      }}
                      className="font-hand rounded-full border-2 border-white bg-white/80 px-3 py-1 text-lg text-ink-soft shadow-sm transition-transform hover:-translate-y-0.5 hover:text-ink"
                    >
                      {t('apple.comments.reply')}
                    </button>
                  </div>

                  {/* Replies (oldest first), preview-capped */}
                  {(c.replies.length > 0 || isOpen) && (
                    <div className="mt-3 space-y-3 border-l-2 border-dashed border-[#E8563F33] pl-4">
                      {shownReplies.map((r) => (
                        <div key={r.id}>
                          <div className="flex flex-wrap items-baseline gap-x-2">
                            <span
                              className={cn(
                                'font-hand text-xl leading-tight',
                                r.isAdmin ? 'text-[#E8563F]' : 'text-ink',
                              )}
                            >
                              {r.isAdmin ? t('apple.comments.adminBadge') : r.nickname}
                            </span>
                            {r.isAdmin && (
                              <span
                                className="rounded-full bg-[#E8563F1a] px-2 py-0.5 text-xs font-extrabold"
                                style={{ color: APPLE_RED }}
                              >
                                {t('apple.comments.adminBadge')}
                              </span>
                            )}
                            <span className="text-xs font-bold text-ink-soft">
                              {stamp(r.createdAt)}
                            </span>
                          </div>
                          <p className="font-hand mt-0.5 whitespace-pre-line text-lg leading-snug text-ink">
                            {r.body}
                          </p>
                        </div>
                      ))}

                      {hiddenCount > 0 && !expanded.has(c.id) && (
                        <button
                          type="button"
                          onClick={() => toggleExpanded(c.id)}
                          className="font-hand text-lg text-ink-soft underline decoration-dotted underline-offset-4 hover:text-ink"
                        >
                          {t('apple.comments.expandReplies', { n: hiddenCount })}
                        </button>
                      )}
                      {expanded.has(c.id) && c.replies.length > REPLIES_PREVIEW && (
                        <button
                          type="button"
                          onClick={() => toggleExpanded(c.id)}
                          className="font-hand text-lg text-ink-soft underline decoration-dotted underline-offset-4 hover:text-ink"
                        >
                          {t('apple.comments.collapseReplies')}
                        </button>
                      )}

                      {/* Reply form — one open at a time across the page */}
                      {isOpen && (
                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            maxLength={24}
                            placeholder={t('apple.comments.namePlaceholder')}
                            aria-label={t('apple.comments.nameLabel')}
                            className="w-32 rounded-full border-[3px] border-white bg-cream px-3 py-1.5 text-ink shadow-inner outline-none focus:border-[#E8563F]"
                          />
                          <input
                            value={replyDraft}
                            onChange={(e) => setReplyDraft(e.target.value)}
                            maxLength={500}
                            placeholder={t('apple.comments.replyPlaceholder')}
                            aria-label={t('apple.comments.reply')}
                            className="min-w-[160px] grow rounded-full border-[3px] border-white bg-cream px-4 py-1.5 text-ink shadow-inner outline-none focus:border-[#E8563F]"
                          />
                          <button
                            type="button"
                            onClick={() => void submitReply(c.id)}
                            disabled={busy}
                            className="font-hand rounded-full border-[3px] border-white px-4 py-1.5 text-xl text-white shadow-[0_4px_0_rgba(74,68,112,0.18)] transition-transform hover:-translate-y-0.5 disabled:opacity-60"
                            style={{ background: APPLE_RED }}
                          >
                            {t('apple.comments.reply')}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {pageNav}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Photo picker — a mini month calendar instead of a <select>          */
/* ------------------------------------------------------------------ */

/**
 * A long album made the dropdown unusable, and Chrome renders <option>
 * text with the select's webfont (JasonHandwriting2) while Safari ignores
 * it — glyphs missing from the font turned into tofu there. A calendar
 * removes the native control entirely; every label it renders is either
 * a digit or full-coverage font-hand text.
 */
function PhotoCalendarPicker({
  photos,
  value,
  onPick,
}: {
  photos: PhotoLite[];
  value: number | null;
  onPick: (photo: PhotoLite | null) => void;
}) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const selected = useMemo(
    () => photos.find((p) => p.id === value) ?? null,
    [photos, value],
  );

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={cn(
          'font-hand inline-flex max-w-full items-center gap-2 rounded-full border-[3px] border-white bg-cream px-4 py-1.5 text-xl text-ink shadow-md outline-none transition-transform hover:-translate-y-0.5',
          open && '-translate-y-0.5',
        )}
        style={selected ? { color: APPLE_RED } : undefined}
      >
        {selected ? (
          <>
            <img
              src={selected.thumbUrl ?? selected.imageUrl}
              alt=""
              className="h-7 w-7 rounded-full border-2 border-white object-cover"
            />
            <span className="truncate tabular-nums">{selected.date}</span>
          </>
        ) : (
          <>
            <Calendar className="h-5 w-5 shrink-0" style={{ color: APPLE_RED }} />
            {t('apple.comments.photoPick')}
          </>
        )}
      </button>

      {open && (
        <MiniMonth
          photos={photos}
          value={value}
          onPick={(p) => {
            onPick(p);
            setOpen(false);
          }}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}

function MiniMonth({
  photos,
  value,
  onPick,
  onClose,
}: {
  photos: PhotoLite[];
  value: number | null;
  onPick: (photo: PhotoLite | null) => void;
  onClose: () => void;
}) {
  const { t } = useLanguage();

  const byDate = useMemo(() => {
    const map = new Map<string, PhotoLite>();
    for (const p of photos) if (!map.has(p.date)) map.set(p.date, p);
    return map;
  }, [photos]);

  /* Freshly mounted on every open: land on the picked photo's month, or the
   * newest apple in the album. */
  const anchorDate =
    photos.find((p) => p.id === value)?.date ??
    photos.reduce<PhotoLite | null>((a, b) => (!a || b.date > a.date ? b : a), null)
      ?.date;
  const [view, setView] = useState(() => {
    const [y, m] = (anchorDate ?? todayString()).split('-').map(Number);
    return { year: y, month: m - 1 };
  });

  function shift(delta: number) {
    setView((v) => {
      const m = v.month + delta;
      return { year: v.year + Math.floor(m / 12), month: ((m % 12) + 12) % 12 };
    });
  }

  const prefix = `${view.year}-${String(view.month + 1).padStart(2, '0')}`;
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
  const leadingBlanks = (new Date(view.year, view.month, 1).getDay() + 6) % 7; // Monday-first
  const monthHasPhotos = photos.some((p) => p.date.startsWith(prefix));

  return (
    <>
      {/* click-away catcher */}
      <button
        type="button"
        aria-hidden
        tabIndex={-1}
        onClick={onClose}
        className="fixed inset-0 z-40 cursor-default"
      />
      <div className="absolute left-0 top-full z-50 mt-2 w-[320px] max-w-[85vw] rounded-3xl border-[3px] border-white bg-cream p-3 shadow-[0_18px_40px_rgba(74,68,112,0.25)] sm:p-4">
        <div className="mb-2 flex items-center justify-between gap-1">
          <button
            type="button"
            onClick={() => shift(-1)}
            aria-label={t('apple.prevMonth')}
            className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-white/80 text-ink shadow-sm transition-transform hover:-translate-y-0.5"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="font-hand text-xl text-ink">
            {view.year} · {t(`apple.months.${view.month}`)}
          </span>
          <button
            type="button"
            onClick={() => shift(1)}
            aria-label={t('apple.nextMonth')}
            className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-white/80 text-ink shadow-sm transition-transform hover:-translate-y-0.5"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-1 grid grid-cols-7 gap-1">
          {Array.from({ length: 7 }, (_, i) => (
            <span
              key={i}
              className="text-center text-[10px] font-extrabold uppercase tracking-wide text-ink-soft"
            >
              {t(`apple.weekdays.${i}`)}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: leadingBlanks }).map((_, i) => (
            <span key={`blank-${i}`} />
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const dateStr = `${prefix}-${String(day).padStart(2, '0')}`;
            const photo = byDate.get(dateStr);
            const isPicked = photo != null && photo.id === value;
            return (
              <button
                key={dateStr}
                type="button"
                disabled={!photo}
                onClick={() => photo && onPick(photo)}
                title={photo ? photo.date : undefined}
                className={cn(
                  'relative flex h-9 items-center justify-center rounded-xl text-base tabular-nums',
                  photo
                    ? 'bg-white/85 text-ink shadow-sm transition-transform hover:z-10 hover:scale-110 hover:bg-white'
                    : 'cursor-default text-ink-soft/40',
                )}
                style={isPicked ? { background: APPLE_RED, color: '#fff' } : undefined}
              >
                {day}
                {photo && !isPicked && (
                  <span
                    className="absolute bottom-1 h-1 w-1 rounded-full"
                    style={{ background: APPLE_RED }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {!monthHasPhotos && (
          <p className="font-hand mt-2 text-center text-lg text-ink-soft">
            {t('apple.comments.photoEmptyMonth')}
          </p>
        )}

        {value != null && (
          <button
            type="button"
            onClick={() => onPick(null)}
            className="font-hand mt-2 w-full rounded-full border-2 border-white bg-white/70 py-1.5 text-lg text-ink-soft shadow-sm transition-transform hover:-translate-y-0.5 hover:text-ink"
          >
            {t('apple.comments.photoClear')}
          </button>
        )}
      </div>
    </>
  );
}

/** Local YYYY-MM-DD — the picker only needs a sane fallback anchor. */
function todayString(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
