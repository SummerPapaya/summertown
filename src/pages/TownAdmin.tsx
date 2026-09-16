import { useEffect, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Link } from 'react-router';
import { motion } from 'framer-motion';
import { Apple, Copy, Inbox, KeyRound, Mail, MailOpen, Search, ArrowUpDown, Star, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/providers/trpc';
import { cn } from '@/lib/utils';
import { clearAdminToken, getAdminToken, setAdminToken } from '@/lib/apple';

const POST_OFFICE_TEAL = '#3E8E8A';

/** Shape of rows returned by the admin town procedures. */
interface WishData {
  id: number;
  text: string;
  accent: string;
  createdAt: Date;
}

interface PostcardData {
  id: number;
  message: string;
  signature: string;
  doodle: string;
  createdAt: Date;
}

interface SubData {
  id: number;
  email: string;
  createdAt: Date;
}

function errorCode(error: unknown): string | undefined {
  return (error as { data?: { code?: string } } | null)?.data?.code;
}

/** "June 14, 2025, 3:05 PM" from a Date coming over superjson. */
function fmtDateTime(value: Date | string): string {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/* ------------------------------------------------------------------ */
/* Token gate (mirrors AppleAdmin; English-only)                        */
/* ------------------------------------------------------------------ */

function TokenGate({ onToken }: { onToken: (token: string) => void }) {
  const [value, setValue] = useState('');
  const [shake, setShake] = useState(0);

  function submit(e: FormEvent) {
    e.preventDefault();
    const token = value.trim();
    if (!token) {
      setShake((s) => s + 1);
      return;
    }
    setAdminToken(token);
    onToken(token);
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <motion.form
        key={shake}
        animate={shake ? { x: [0, -10, 10, -7, 7, -3, 0] } : undefined}
        transition={{ duration: 0.45 }}
        onSubmit={submit}
        className="sticker-card w-full max-w-sm p-8 text-center"
      >
        <div
          className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border-[3px] border-white shadow-md"
          style={{ background: POST_OFFICE_TEAL }}
        >
          <KeyRound className="h-7 w-7 text-white" />
        </div>
        <h1 className="font-display text-2xl font-semibold" style={{ color: POST_OFFICE_TEAL }}>
          Town Hall Office
        </h1>
        <p className="font-hand mt-1 text-xl text-ink-soft">
          secret word, please — staff only behind this counter
        </p>
        <input
          type="password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="admin token"
          autoFocus
          className="mt-5 w-full rounded-2xl border-[3px] border-white bg-cream px-4 py-2.5 font-bold text-ink shadow-inner outline-none focus:border-[#8fd4d1]"
        />
        <button type="submit" className="btn-primary mt-4 w-full">
          Unlock the office
        </button>
      </motion.form>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Delete button with inline two-tap confirm                            */
/* ------------------------------------------------------------------ */

function ConfirmButton({
  onConfirm,
  label,
  confirmLabel,
  tone = 'danger',
  icon,
}: {
  onConfirm: () => void;
  label: string;
  confirmLabel: string;
  tone?: 'danger' | 'approve';
  icon?: ReactNode;
}) {
  const [arming, setArming] = useState(false);

  function handleClick() {
    if (arming) {
      setArming(false);
      onConfirm();
      return;
    }
    setArming(true);
  }

  return (
    <button
      onClick={handleClick}
      onBlur={() => setArming(false)}
      className={cn(
        'btn-secondary flex-1 !px-3 !py-1.5 text-sm',
        tone === 'danger'
          ? cn('!text-[#E8563F]', arming && '!border-[#E8563F] !bg-[#E8563F]/10')
          : cn('!text-[#3E8E8A]', arming && '!border-[#3E8E8A] !bg-[#3E8E8A]/10'),
      )}
    >
      {arming ? (
        confirmLabel
      ) : (
        <span className="inline-flex items-center gap-1.5">
          {icon}
          {label}
        </span>
      )}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Tabs                                                                 */
/* ------------------------------------------------------------------ */

type Tab = 'pending' | 'wishes' | 'postcards' | 'subscribers';

const TABS: { id: Tab; label: string }[] = [
  { id: 'pending', label: 'Pending' },
  { id: 'wishes', label: 'Wishes' },
  { id: 'postcards', label: 'Postcards' },
  { id: 'subscribers', label: 'Subscribers' },
];

/* ------------------------------------------------------------------ */
/* Wishes tab                                                           */
/* ------------------------------------------------------------------ */

function WishesTab() {
  const listQuery = trpc.admin.listWishes.useQuery(undefined, { retry: false });
  const deleteMutation = trpc.admin.deleteWish.useMutation();
  const wishes = (listQuery.data ?? []) as WishData[];

  async function remove(wish: WishData) {
    try {
      await deleteMutation.mutateAsync({ id: wish.id });
      toast.success('Wish swept off the board');
      await listQuery.refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  if (listQuery.isLoading) {
    return <p className="font-hand py-16 text-center text-2xl text-ink-soft">rummaging through the wish jar…</p>;
  }
  if (wishes.length === 0) {
    return (
      <div className="sticker-card p-10 text-center">
        <div className="text-5xl">🫙</div>
        <p className="font-hand mt-2 text-2xl text-ink-soft">no wishes pinned up right now</p>
      </div>
    );
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {wishes.map((w) => (
        <li key={w.id} className="sticker-card p-4">
          <div className="flex items-start gap-2.5">
            <span
              className="mt-1.5 h-3.5 w-3.5 shrink-0 rounded-full border-2 border-white shadow"
              style={{ background: w.accent }}
            />
            <div className="min-w-0">
              <p className="font-hand text-xl leading-tight text-ink">{w.text}</p>
              <p className="mt-1 text-xs font-bold text-ink-soft">{fmtDateTime(w.createdAt)}</p>
            </div>
          </div>
          <div className="mt-3 flex gap-2 border-t-2 border-dashed border-[#3e8e8a33] pt-3">
            <ConfirmButton
              onConfirm={() => void remove(w)}
              label="Delete"
              confirmLabel="Sure?"
              icon={<Trash2 className="h-3.5 w-3.5" />}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/* Postcards tab                                                        */
/* ------------------------------------------------------------------ */

function PostcardsTab() {
  const listQuery = trpc.admin.listPostcards.useQuery(undefined, { retry: false });
  const deleteMutation = trpc.admin.deletePostcard.useMutation();
  const postcards = (listQuery.data ?? []) as PostcardData[];

  async function remove(card: PostcardData) {
    try {
      await deleteMutation.mutateAsync({ id: card.id });
      toast.success('Postcard pulled from the rack');
      await listQuery.refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  if (listQuery.isLoading) {
    return <p className="font-hand py-16 text-center text-2xl text-ink-soft">sorting the morning mail…</p>;
  }
  if (postcards.length === 0) {
    return (
      <div className="sticker-card p-10 text-center">
        <div className="text-5xl">📭</div>
        <p className="font-hand mt-2 text-2xl text-ink-soft">no postcards in the rack yet</p>
      </div>
    );
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {postcards.map((p) => (
        <li key={p.id} className="sticker-card p-4">
          <div className="flex items-start justify-between gap-2">
            <p className="font-hand text-xl leading-tight text-ink">{p.message}</p>
            <span className="shrink-0 text-2xl" title="doodle">
              {p.doodle}
            </span>
          </div>
          <p className="font-hand mt-1 text-lg text-ink-soft">— {p.signature}</p>
          <p className="mt-1 text-xs font-bold text-ink-soft">{fmtDateTime(p.createdAt)}</p>
          <div className="mt-3 flex gap-2 border-t-2 border-dashed border-[#3e8e8a33] pt-3">
            <ConfirmButton
              onConfirm={() => void remove(p)}
              label="Delete"
              confirmLabel="Sure?"
              icon={<Trash2 className="h-3.5 w-3.5" />}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/* Pending review tab (held-for-moderation queue)                       */
/* ------------------------------------------------------------------ */

function PendingTab() {
  const listQuery = trpc.admin.listPending.useQuery(undefined, { retry: false });
  const approveWish = trpc.admin.approveWish.useMutation();
  const rejectWish = trpc.admin.rejectWish.useMutation();
  const approvePostcard = trpc.admin.approvePostcard.useMutation();
  const rejectPostcard = trpc.admin.rejectPostcard.useMutation();
  const bulkApprove = trpc.admin.bulkApprove.useMutation();
  const clearPending = trpc.admin.clearPending.useMutation();

  const [search, setSearch] = useState('');
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');

  const allWishes = (listQuery.data?.wishes ?? []) as WishData[];
  const allPostcards = (listQuery.data?.postcards ?? []) as PostcardData[];

  const q = search.trim().toLowerCase();
  const matches = (...fields: string[]) =>
    q === '' || fields.some((f) => f.toLowerCase().includes(q));

  // Both lists come back newest-first; optionally flip to oldest-first.
  const sortRows = <T extends { createdAt: Date | string }>(rows: T[]): T[] =>
    [...rows].sort((a, b) => {
      const ta = new Date(a.createdAt).getTime();
      const tb = new Date(b.createdAt).getTime();
      return sortDir === 'desc' ? tb - ta : ta - tb;
    });

  const pendingWishes = sortRows(
    allWishes.filter((w) => matches(w.text)),
  );
  const pendingPostcards = sortRows(
    allPostcards.filter((p) => matches(p.message, p.signature, p.doodle)),
  );

  async function act(
    mutate: { mutateAsync: (input: { id: number }) => Promise<unknown> },
    id: number,
    okMsg: string,
  ) {
    try {
      await mutate.mutateAsync({ id });
      toast.success(okMsg);
      await listQuery.refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Action failed');
    }
  }

  async function approveAll(kind: 'wish' | 'postcard', ids: number[]) {
    if (ids.length === 0) return;
    try {
      await bulkApprove.mutateAsync({ kind, ids });
      toast.success(
        `Approved ${ids.length} ${kind === 'wish' ? 'wish' : 'postcard'}${ids.length === 1 ? '' : 's'}`,
      );
      await listQuery.refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Bulk approve failed');
    }
  }

  async function clearAll() {
    try {
      await clearPending.mutateAsync();
      toast.success('Pending queue cleared');
      await listQuery.refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to clear');
    }
  }

  if (listQuery.isLoading) {
    return (
      <p className="font-hand py-16 text-center text-2xl text-ink-soft">checking the holding pen…</p>
    );
  }

  const hasAny = allWishes.length + allPostcards.length > 0;
  const hasVisible = pendingWishes.length + pendingPostcards.length > 0;

  if (!hasAny) {
    return (
      <div className="sticker-card p-10 text-center">
        <div className="text-5xl">🕊️</div>
        <p className="font-hand mt-2 text-2xl text-ink-soft">
          the holding pen is empty — nothing waiting for review
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* search + sort + clear controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search pending…"
            className="w-full rounded-full border-[3px] border-white bg-cream py-2.5 pl-9 pr-4 font-bold text-ink shadow-inner outline-none focus:border-[#8fd4d1]"
          />
        </div>
        <button
          onClick={() => setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))}
          className="btn-secondary !px-4 !py-2.5 text-sm"
        >
          <ArrowUpDown className="h-4 w-4" />
          {sortDir === 'desc' ? 'Newest first' : 'Oldest first'}
        </button>
        <ConfirmButton
          onConfirm={() => void clearAll()}
          label="Clear pending"
          confirmLabel="Sure? wipes all"
          tone="danger"
          icon={<Trash2 className="h-3.5 w-3.5" />}
        />
      </div>

      {!hasVisible && (
        <div className="sticker-card p-8 text-center">
          <div className="text-4xl">🔍</div>
          <p className="font-hand mt-2 text-2xl text-ink-soft">
            no pending items match “{search}”
          </p>
        </div>
      )}

      {hasVisible && (
        <div className="space-y-10">
          {/* Flagged wishes */}
          <section>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-xl font-semibold" style={{ color: POST_OFFICE_TEAL }}>
                Flagged wishes
                <span className="ml-2 rounded-full bg-[#3e8e8a1a] px-2.5 py-0.5 text-sm font-extrabold text-[#3E8E8A]">
                  {pendingWishes.length}
                </span>
              </h2>
              {pendingWishes.length > 0 && (
                <button
                  onClick={() => void approveAll('wish', pendingWishes.map((w) => w.id))}
                  className="btn-primary !px-4 !py-1.5 text-sm"
                >
                  Approve all ({pendingWishes.length})
                </button>
              )}
            </div>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {pendingWishes.map((w) => (
                <li key={w.id} className="sticker-card p-4">
                  <div className="flex items-start gap-2.5">
                    <span
                      className="mt-1.5 h-3.5 w-3.5 shrink-0 rounded-full border-2 border-white shadow"
                      style={{ background: w.accent }}
                    />
                    <div className="min-w-0">
                      <p className="font-hand text-xl leading-tight text-ink">{w.text}</p>
                      <p className="mt-1 text-xs font-bold text-ink-soft">{fmtDateTime(w.createdAt)}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2 border-t-2 border-dashed border-[#3e8e8a33] pt-3">
                    <button
                      onClick={() => void act(approveWish, w.id, 'Wish approved')}
                      className="btn-primary flex-1 !px-3 !py-1.5 text-sm"
                    >
                      Approve
                    </button>
                    <ConfirmButton
                      onConfirm={() => void act(rejectWish, w.id, 'Wish rejected')}
                      label="Reject"
                      confirmLabel="Sure?"
                      tone="danger"
                    />
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {/* Flagged postcards */}
          <section>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-xl font-semibold" style={{ color: POST_OFFICE_TEAL }}>
                Flagged postcards
                <span className="ml-2 rounded-full bg-[#3e8e8a1a] px-2.5 py-0.5 text-sm font-extrabold text-[#3E8E8A]">
                  {pendingPostcards.length}
                </span>
              </h2>
              {pendingPostcards.length > 0 && (
                <button
                  onClick={() => void approveAll('postcard', pendingPostcards.map((p) => p.id))}
                  className="btn-primary !px-4 !py-1.5 text-sm"
                >
                  Approve all ({pendingPostcards.length})
                </button>
              )}
            </div>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {pendingPostcards.map((p) => (
                <li key={p.id} className="sticker-card p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-hand text-xl leading-tight text-ink">{p.message}</p>
                    <span className="shrink-0 text-2xl" title="doodle">
                      {p.doodle}
                    </span>
                  </div>
                  <p className="font-hand mt-1 text-lg text-ink-soft">— {p.signature}</p>
                  <p className="mt-1 text-xs font-bold text-ink-soft">{fmtDateTime(p.createdAt)}</p>
                  <div className="mt-3 flex gap-2 border-t-2 border-dashed border-[#3e8e8a33] pt-3">
                    <button
                      onClick={() => void act(approvePostcard, p.id, 'Postcard approved')}
                      className="btn-primary flex-1 !px-3 !py-1.5 text-sm"
                    >
                      Approve
                    </button>
                    <ConfirmButton
                      onConfirm={() => void act(rejectPostcard, p.id, 'Postcard rejected')}
                      label="Reject"
                      confirmLabel="Sure?"
                      tone="danger"
                    />
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Subscribers tab                                                      */
/* ------------------------------------------------------------------ */

function SubscribersTab() {
  const listQuery = trpc.admin.listSubs.useQuery(undefined, { retry: false });
  const exportQuery = trpc.admin.exportSubs.useQuery(undefined, {
    enabled: false,
    retry: false,
  });
  const subs = (listQuery.data ?? []) as SubData[];
  const [copying, setCopying] = useState(false);

  async function copyAll() {
    setCopying(true);
    try {
      const { data } = await exportQuery.refetch();
      const payload = data ?? '';
      if (!payload) {
        toast.info('No subscribers to copy yet');
        return;
      }
      try {
        await navigator.clipboard.writeText(payload);
      } catch {
        // Clipboard API can be unavailable (non-secure context) — log it so
        // the owner can still grab the list from the console.
        console.log('[town-admin] subscriber export:\n' + payload);
      }
      toast.success(`Copied ${payload.split('\n').filter(Boolean).length} email(s) to clipboard`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setCopying(false);
    }
  }

  if (listQuery.isLoading) {
    return <p className="font-hand py-16 text-center text-2xl text-ink-soft">checking the mailing list…</p>;
  }

  return (
    <div className="sticker-card p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl font-semibold" style={{ color: POST_OFFICE_TEAL }}>
          <Mail className="mr-2 inline-block h-5 w-5 -translate-y-0.5" />
          {subs.length} subscriber{subs.length === 1 ? '' : 's'}
        </h2>
        <button
          onClick={() => void copyAll()}
          disabled={copying || subs.length === 0}
          className="btn-primary !px-5 !py-2.5 text-sm disabled:opacity-60"
        >
          <Copy className="h-4 w-4" /> {copying ? 'Copying…' : 'Copy all'}
        </button>
      </div>
      <div className="my-4 border-t-2 border-dashed border-[#3e8e8a33]" />
      {subs.length === 0 ? (
        <p className="font-hand py-8 text-center text-2xl text-ink-soft">nobody on the mailing list yet</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-xs font-extrabold uppercase tracking-wide text-ink-soft">
                <th className="pb-2 pr-4">#</th>
                <th className="pb-2 pr-4">Email</th>
                <th className="pb-2">Signed up</th>
              </tr>
            </thead>
            <tbody>
              {subs.map((s, i) => (
                <tr key={s.id} className="border-t-2 border-dashed border-[#3e8e8a22]">
                  <td className="py-2.5 pr-4 text-sm font-bold text-ink-soft">{i + 1}</td>
                  <td className="py-2.5 pr-4 font-bold text-ink">{s.email}</td>
                  <td className="py-2.5 text-sm font-bold text-ink-soft">{fmtDateTime(s.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                 */
/* ------------------------------------------------------------------ */

export default function TownAdmin() {
  const [token, setToken] = useState(getAdminToken);
  const [tab, setTab] = useState<Tab>('pending');

  // Light admin call doubles as token verification.
  const probeQuery = trpc.admin.listWishes.useQuery(undefined, {
    enabled: !!token,
    retry: false,
  });

  // Live count of items held for moderation — powers the Pending tab badge.
  const pendingQuery = trpc.admin.listPending.useQuery(undefined, {
    enabled: !!token,
    retry: false,
  });
  const pendingCount =
    (pendingQuery.data?.wishes.length ?? 0) + (pendingQuery.data?.postcards.length ?? 0);

  // Wrong token → bounce back to the gate with a gentle scolding.
  useEffect(() => {
    if (probeQuery.error && errorCode(probeQuery.error) === 'UNAUTHORIZED') {
      clearAdminToken();
      setToken('');
      toast.error('That token doesn’t match the office key — try again');
    }
  }, [probeQuery.error]);

  if (!token) {
    return (
      <div className="px-4 py-10">
        <TokenGate onToken={setToken} />
      </div>
    );
  }

  if (probeQuery.error) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-4">
        <div className="sticker-card max-w-md p-8 text-center">
          <div className="text-4xl">📮</div>
          <h1 className="font-display mt-2 text-2xl font-semibold" style={{ color: POST_OFFICE_TEAL }}>
            The office door is stuck
          </h1>
          <p className="font-hand mt-1 text-xl text-ink-soft">
            the town backend isn’t answering right now
          </p>
          <button onClick={() => probeQuery.refetch()} className="btn-primary mt-5">
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1
            className="font-display text-3xl font-semibold sm:text-4xl"
            style={{ color: POST_OFFICE_TEAL }}
          >
            Town Hall Office 📮
          </h1>
          <p className="font-hand mt-1 text-2xl text-ink-soft">
            reviews, wishes, postcards & the mailing list — all in one drawer
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/apple-admin" className="btn-secondary !px-5 !py-2.5 text-sm">
            <Apple className="h-4 w-4" /> Apple basket →
          </Link>
          <button
            onClick={() => {
              clearAdminToken();
              setToken('');
            }}
            className="btn-secondary !px-5 !py-2.5 text-sm"
          >
            Lock up
          </button>
        </div>
      </header>

      {/* sticker-pill tab bar */}
      <div className="mb-6 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'rounded-full border-[3px] border-white px-5 py-2 text-sm font-extrabold shadow-md transition-transform hover:-translate-y-0.5',
              tab === t.id ? 'text-white' : 'bg-cream text-ink',
            )}
            style={tab === t.id ? { background: POST_OFFICE_TEAL } : undefined}
          >
            {t.id === 'pending' && <Inbox className="mr-1.5 inline-block h-4 w-4 -translate-y-0.5" />}
            {t.id === 'wishes' && <Star className="mr-1.5 inline-block h-4 w-4 -translate-y-0.5" />}
            {t.id === 'postcards' && <MailOpen className="mr-1.5 inline-block h-4 w-4 -translate-y-0.5" />}
            {t.id === 'subscribers' && <Mail className="mr-1.5 inline-block h-4 w-4 -translate-y-0.5" />}
            {t.label}
            {t.id === 'pending' && pendingCount > 0 && (
              <span className="ml-1.5 rounded-full bg-white/25 px-1.5 py-0.5 text-xs">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'pending' && <PendingTab />}
      {tab === 'wishes' && <WishesTab />}
      {tab === 'postcards' && <PostcardsTab />}
      {tab === 'subscribers' && <SubscribersTab />}
    </div>
  );
}
