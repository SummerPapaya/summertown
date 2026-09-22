import { motion, type Variants } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { exhibitionsFor } from '@/lib/exhibitions';
import { useLanguage } from '@/lib/i18n';

/**
 * Permanent exhibitions on a detail card — one poster card per web project
 * registered in src/lib/exhibitions.ts. With a single exhibit a dashed
 * "more coming" tile fills the second grid cell, so the lone card never
 * floats awkwardly; future entries slot into the same grid as it grows.
 */
export default function PermanentExhibitions({
  landmarkId,
  variants,
}: {
  landmarkId: string;
  variants: Variants;
}) {
  const { t } = useLanguage();
  const items = exhibitionsFor(landmarkId);
  if (items.length === 0) return null;

  return (
    <motion.div variants={variants} className="mt-6">
      <div className="flex items-center gap-3">
        <h3 className="text-[0.72rem] font-extrabold uppercase tracking-[0.16em] text-ink-soft">
          {t('exhibitions.heading')}
        </h3>
        <span className="h-px flex-1 bg-ink/10" />
      </div>

      <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2">
        {items.map((ex) => {
          const Icon = ex.Icon;
          return (
            <a
              key={ex.id}
              href={ex.href}
              target="_blank"
              rel="noreferrer"
              className="group block rounded-[20px] border-[3px] border-white bg-white/60 p-2.5 shadow-sticker transition-all duration-300 ease-squash hover:-translate-y-0.5 hover:bg-white/80"
            >
              <div
                className="relative aspect-[16/10] overflow-hidden rounded-[14px] border-2 border-white"
                style={{ background: ex.accent }}
              >
                <img
                  src={ex.poster}
                  alt={t(ex.titleKey)}
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-squash group-hover:scale-[1.04]"
                />

                {ex.shot && (
                  <>
                    {/* The real screenshot hangs above the frame and is pulled
                        down like a curtain when the card is hovered. */}
                    <div
                      aria-hidden
                      className="absolute inset-0 z-10 -translate-y-full transition-transform duration-[1000ms] ease-[cubic-bezier(.22,1,.36,1)] will-change-transform group-hover:translate-y-0 group-focus-visible:translate-y-0 motion-reduce:transition-none"
                    >
                      <img
                        src={ex.shot}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover object-top"
                      />
                      <span className="absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-black/35 to-transparent" />
                    </div>
                    {/* peek hint — fades out once the curtain drops */}
                    <span className="ex-chip absolute bottom-2 right-2 z-20 rounded-full border-2 border-white bg-white/85 px-2.5 py-0.5 text-[0.68rem] font-extrabold tracking-[0.08em] text-ink-soft shadow-sticker backdrop-blur-sm transition-opacity duration-200 group-hover:opacity-0">
                      {t('exhibitions.peek')}
                    </span>
                  </>
                )}

                <span className="ex-chip absolute left-2 top-2 flex items-center gap-1.5 rounded-full border-2 border-white bg-white/85 px-2.5 py-0.5 text-[0.68rem] font-extrabold uppercase tracking-[0.12em] text-ink-soft shadow-sticker backdrop-blur-sm">
                  <Icon className="h-3 w-3" style={{ color: ex.accent }} />
                  {t(ex.tagKey)}
                </span>
              </div>
              <div className="px-1 pb-0.5 pt-2.5">
                <h4 className="font-hand text-[1.45rem] leading-tight text-ink">
                  {t(ex.titleKey)}
                </h4>
                <p className="mt-1 text-xs font-semibold leading-relaxed text-ink-soft">
                  {t(ex.descKey)}
                </p>
                <span className="font-display mt-2 inline-flex items-center gap-1 text-xs font-extrabold text-coral">
                  {t('exhibitions.enter')}
                  <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-300 ease-squash group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </span>
              </div>
            </a>
          );
        })}

        {items.length === 1 && (
          <div
            aria-hidden
            className="flex items-center justify-center rounded-[20px] border-[3px] border-dashed border-ink/15 bg-white/30 px-6 py-8 text-center"
          >
            <p className="font-hand text-[1.35rem] text-ink-soft">
              {t('exhibitions.comingSoon')}
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
