import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { motion } from 'framer-motion';
import { Apple, Camera, Film, KeyRound, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/providers/trpc';
import { useLanguage } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import {
  clearAdminToken,
  fileToDataUrl,
  fileToDownscaledDataUrl,
  getAdminToken,
  MAX_DATA_URL_LENGTH,
  prettyDate,
  setAdminToken,
} from '@/lib/apple';

/** Shape of one row returned by admin/town listApplePhotos. */
export interface ApplePhotoData {
  id: number;
  date: string; // YYYY-MM-DD
  description: string;
  image: string; // base64 data URL
  video: string | null; // base64 data URL
}

const APPLE_RED = '#E8563F';

/** Localized pretty date: month name + template from the dictionary. */
function usePrettyDate() {
  const { t } = useLanguage();
  return (date: string) => {
    const m = Number(date.split('-')[1]);
    return prettyDate(date, t(`apple.months.${m - 1}`), t('apple.datePretty'));
  };
}

function errorCode(error: unknown): string | undefined {
  return (error as { data?: { code?: string } } | null)?.data?.code;
}

/* ------------------------------------------------------------------ */
/* Token gate                                                          */
/* ------------------------------------------------------------------ */

function TokenGate({ onToken }: { onToken: (token: string) => void }) {
  const { t } = useLanguage();
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
          style={{ background: APPLE_RED }}
        >
          <KeyRound className="h-7 w-7 text-white" />
        </div>
        <h1 className="font-display text-2xl font-semibold" style={{ color: APPLE_RED }}>
          {t('apple.admin.gateTitle')}
        </h1>
        <p className="font-hand mt-1 text-xl text-ink-soft">
          {t('apple.admin.gatePrompt')}
        </p>
        <input
          type="password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={t('apple.admin.gatePlaceholder')}
          autoFocus
          className="mt-5 w-full rounded-2xl border-[3px] border-white bg-cream px-4 py-2.5 font-bold text-ink shadow-inner outline-none focus:border-[#ffb37e]"
        />
        <button type="submit" className="btn-primary mt-4 w-full">
          {t('apple.admin.gateButton')}
        </button>
      </motion.form>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Photo form (create / edit)                                          */
/* ------------------------------------------------------------------ */

interface PhotoFormProps {
  editing: ApplePhotoData | null;
  onSaved: () => void;
  onCancel: () => void;
}

function PhotoForm({ editing, onSaved, onCancel }: PhotoFormProps) {
  const { t } = useLanguage();
  const fmt = usePrettyDate();
  const [date, setDate] = useState(editing?.date ?? new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState(editing?.description ?? '');
  const [image, setImage] = useState<string | null>(editing?.image ?? null);
  const [video, setVideo] = useState<string | null>(editing?.video ?? null);
  const [busy, setBusy] = useState(false);
  const imageInput = useRef<HTMLInputElement>(null);
  const videoInput = useRef<HTMLInputElement>(null);

  const upsert = trpc.admin.upsertApplePhoto.useMutation();

  async function pickImage(file: File | undefined) {
    if (!file) return;
    try {
      const dataUrl = await fileToDownscaledDataUrl(file);
      if (dataUrl.length > MAX_DATA_URL_LENGTH) {
        toast.error(t('apple.admin.photoTooBig'));
        return;
      }
      setImage(dataUrl);
    } catch {
      toast.error(t('apple.admin.imageReadError'));
    }
  }

  async function pickVideo(file: File | undefined) {
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      toast.warning(t('apple.admin.videoSizeWarning'));
    }
    try {
      const dataUrl = await fileToDataUrl(file);
      if (dataUrl.length > MAX_DATA_URL_LENGTH) {
        toast.error(t('apple.admin.videoTooBig'));
        return;
      }
      setVideo(dataUrl);
    } catch {
      toast.error(t('apple.admin.videoReadError'));
    }
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!image) {
      toast.error(t('apple.admin.pickPhotoFirst'));
      return;
    }
    setBusy(true);
    try {
      await upsert.mutateAsync({
        date,
        description: description.slice(0, 500),
        image,
        ...(video ? { video } : {}),
      });
      toast.success(editing ? t('apple.admin.savedEdit') : t('apple.admin.savedNew'));
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('apple.admin.saveFailed'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="sticker-card p-6 sm:p-8">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-xl font-semibold" style={{ color: APPLE_RED }}>
          {editing
            ? t('apple.admin.formEditTitle', { date: fmt(editing.date) })
            : t('apple.admin.formNewTitle')}
        </h2>
        <span className="font-hand text-xl text-ink-soft">{t('apple.admin.formHand')}</span>
      </div>
      <div className="my-4 border-t-2 border-dashed border-[#e8563f33]" />

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className="font-display text-sm font-semibold text-ink">{t('apple.admin.dateLabel')}</span>
          <input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 w-full rounded-2xl border-[3px] border-white bg-cream px-4 py-2.5 font-bold text-ink shadow-inner outline-none focus:border-[#ffb37e]"
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="font-display text-sm font-semibold text-ink">
            {t('apple.admin.descriptionLabel')}{' '}
            <span className="font-hand text-lg text-ink-soft">{t('apple.admin.descriptionHint')}</span>
          </span>
          <textarea
            value={description}
            maxLength={500}
            rows={3}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('apple.admin.descriptionPlaceholder')}
            className="mt-1 w-full rounded-2xl border-[3px] border-white bg-cream px-4 py-2.5 font-bold text-ink shadow-inner outline-none focus:border-[#ffb37e]"
          />
        </label>

        <div>
          <span className="font-display text-sm font-semibold text-ink">{t('apple.admin.photoLabel')}</span>
          <input
            ref={imageInput}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              void pickImage(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
          <button
            type="button"
            onClick={() => imageInput.current?.click()}
            className="btn-secondary mt-1 w-full !px-4 !py-2.5 text-sm"
          >
            <Camera className="h-4 w-4" />{' '}
            {image ? t('apple.admin.swapPhoto') : t('apple.admin.choosePhoto')}
          </button>
          {image && (
            <img
              src={image}
              alt={t('apple.admin.photoPreviewAlt')}
              className="mt-3 h-28 w-full rounded-2xl border-[3px] border-white object-cover shadow-md"
            />
          )}
        </div>

        <div>
          <span className="font-display text-sm font-semibold text-ink">
            {t('apple.admin.videoLabel')}{' '}
            <span className="font-hand text-lg text-ink-soft">{t('apple.admin.videoHint')}</span>
          </span>
          <input
            ref={videoInput}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => {
              void pickVideo(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
          <button
            type="button"
            onClick={() => videoInput.current?.click()}
            className="btn-secondary mt-1 w-full !px-4 !py-2.5 text-sm"
          >
            <Film className="h-4 w-4" />{' '}
            {video ? t('apple.admin.swapVideo') : t('apple.admin.chooseVideo')}
          </button>
          {video && (
            <div className="relative mt-3">
              <video
                src={video}
                muted
                loop
                autoPlay
                playsInline
                className="h-28 w-full rounded-2xl border-[3px] border-white object-cover shadow-md"
              />
              <button
                type="button"
                onClick={() => setVideo(null)}
                aria-label={t('apple.admin.removeVideo')}
                className="absolute right-1.5 top-1.5 rounded-full bg-white/90 px-2 py-0.5 text-xs font-extrabold text-ink shadow"
              >
                ✕
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button type="submit" disabled={busy} className="btn-primary disabled:opacity-60">
          {busy
            ? t('apple.admin.saving')
            : editing
              ? t('apple.admin.saveChanges')
              : t('apple.admin.addToBasket')}
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary">
          {t('apple.admin.cancel')}
        </button>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Delete button with inline two-tap confirm                           */
/* ------------------------------------------------------------------ */

function DeleteButton({ onDelete }: { onDelete: () => void }) {
  const { t } = useLanguage();
  const [arming, setArming] = useState(false);

  function handleClick() {
    if (arming) {
      setArming(false);
      onDelete();
      return;
    }
    setArming(true);
  }

  return (
    <button
      onClick={handleClick}
      onBlur={() => setArming(false)}
      className={cn(
        'btn-secondary flex-1 !px-3 !py-1.5 text-sm !text-[#E8563F]',
        arming && '!border-[#E8563F] !bg-[#E8563F]/10',
      )}
    >
      <Trash2 className="h-3.5 w-3.5" />{' '}
      {arming ? t('apple.admin.confirmDelete') : t('apple.admin.delete')}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function AppleAdmin() {
  const { t } = useLanguage();
  const fmt = usePrettyDate();
  const [token, setToken] = useState(getAdminToken);
  const [editing, setEditing] = useState<ApplePhotoData | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const listQuery = trpc.admin.listApplePhotos.useQuery(undefined, {
    enabled: !!token,
    retry: false,
  });
  const deleteMutation = trpc.admin.deleteApplePhoto.useMutation();

  const photos = (listQuery.data ?? []) as ApplePhotoData[];

  // Wrong token → bounce back to the gate with a gentle scolding.
  useEffect(() => {
    if (listQuery.error && errorCode(listQuery.error) === 'UNAUTHORIZED') {
      clearAdminToken();
      setToken('');
      toast.error(t('apple.admin.badToken'));
    }
  }, [listQuery.error, t]);

  if (!token) {
    return (
      <div className="px-4 py-10">
        <TokenGate onToken={setToken} />
      </div>
    );
  }

  if (listQuery.error) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-4">
        <div className="sticker-card max-w-md p-8 text-center">
          <div className="text-4xl">🧺</div>
          <h1 className="font-display mt-2 text-2xl font-semibold" style={{ color: APPLE_RED }}>
            {t('apple.admin.backendDown')}
          </h1>
          <p className="font-hand mt-1 text-xl text-ink-soft">
            {t('apple.admin.backendDownBody')}
          </p>
          <button onClick={() => listQuery.refetch()} className="btn-primary mt-5">
            {t('apple.admin.tryAgain')}
          </button>
        </div>
      </div>
    );
  }

  async function remove(photo: ApplePhotoData) {
    try {
      await deleteMutation.mutateAsync({ id: photo.id });
      toast.success(t('apple.admin.deleted'));
      await listQuery.refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('apple.admin.deleteFailed'));
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1
            className="font-display text-3xl font-semibold sm:text-4xl"
            style={{ color: APPLE_RED }}
          >
            <Apple className="mr-2 inline-block h-8 w-8 -translate-y-0.5" />
            {t('apple.admin.title')}
          </h1>
          <p className="font-hand mt-1 text-2xl text-ink-soft">
            {t('apple.admin.subtitle')}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
            className="btn-primary !px-5 !py-2.5 text-sm"
          >
            {t('apple.admin.newApple')}
          </button>
          <button
            onClick={() => {
              clearAdminToken();
              setToken('');
            }}
            className="btn-secondary !px-5 !py-2.5 text-sm"
          >
            {t('apple.admin.lockUp')}
          </button>
        </div>
      </header>

      {formOpen && (
        <div className="mb-8">
          <PhotoForm
            key={editing?.id ?? 'new'}
            editing={editing}
            onSaved={() => {
              setFormOpen(false);
              setEditing(null);
              void listQuery.refetch();
            }}
            onCancel={() => {
              setFormOpen(false);
              setEditing(null);
            }}
          />
        </div>
      )}

      {listQuery.isLoading ? (
        <p className="font-hand py-16 text-center text-2xl text-ink-soft">
          {t('apple.admin.loading')}
        </p>
      ) : photos.length === 0 ? (
        <div className="sticker-card p-10 text-center">
          <div className="text-5xl">🍏</div>
          <p className="font-hand mt-2 text-2xl text-ink-soft">
            {t('apple.admin.empty')}
          </p>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {photos.map((p) => (
            <li key={p.id} className="sticker-card overflow-hidden">
              <div className="relative">
                <img src={p.image} alt={p.description || t('apple.appleAlt')} className="h-40 w-full object-cover" />
                {p.video && (
                  <span className="absolute left-2 top-2 rounded-full border-2 border-white bg-[#E8563F] px-2 py-0.5 text-xs font-extrabold text-white shadow">
                    {t('apple.liveBadge')}
                  </span>
                )}
              </div>
              <div className="p-4">
                <p className="font-display text-sm font-semibold" style={{ color: APPLE_RED }}>
                  {fmt(p.date)}
                </p>
                <p className="font-hand mt-0.5 line-clamp-2 min-h-[2.6rem] text-xl leading-tight text-ink">
                  {p.description || '—'}
                </p>
                <div className="mt-3 flex gap-2 border-t-2 border-dashed border-[#e8563f33] pt-3">
                  <button
                    onClick={() => {
                      setEditing(p);
                      setFormOpen(true);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="btn-secondary flex-1 !px-3 !py-1.5 text-sm"
                  >
                    <Pencil className="h-3.5 w-3.5" /> {t('apple.admin.edit')}
                  </button>
                  <DeleteButton onDelete={() => void remove(p)} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
