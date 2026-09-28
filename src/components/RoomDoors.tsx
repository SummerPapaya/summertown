import { motion, type Variants } from 'framer-motion';
import { ArrowUpRight, Wand2 } from 'lucide-react';
import { coordToday, roomsFor, type RoomIcon, type RoomMotif } from '@/lib/rooms';
import { useLanguage } from '@/lib/i18n';

/* One palette for both leaves, cut from the Magic House itself: the leaf
 * around the arch is the pale lilac of its walls, the arch interior a step
 * deeper, and every line printed on top is its window-frame purple. The
 * knobs and stars borrow the butter moon over the chimney. */
const LEAF = '#e3dcf8';
const PANEL = '#c3b6ee';
const FRAME = '#8a79d6';
const INNER_LINE = 'rgba(138,121,214,0.5)';
const TRELLIS_LINE = 'rgba(138,121,214,0.16)';

/** little 4-point sparkle, echoing the stars drifting around the house */
function Sparkle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        d="M12 2c.9 5.2 3 7.6 10 10-7 2.4-9.1 4.8-10 10-.9-5.2-3-7.6-10-10 7-2.4 9.1-4.8 10-10Z"
        fill="var(--butter)"
      />
    </svg>
  );
}

/** the door plate's glyph: a wand for the room, a scrying orb for the tower */
function RoomGlyph({ icon, className }: { icon: RoomIcon; className?: string }) {
  if (icon === 'wand') return <Wand2 className={className} />;
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round">
      <circle cx="16" cy="14" r="9.5" />
      <path d="M8.4 17.6a9.5 9.5 0 0 0 15.2 0" />
      <path d="M12.6 23.7 11 27h10l-1.6-3.3" />
    </svg>
  );
}

/* beaded lozenges strung up and down the panel, and the two butter pips
   between them — percentages so they ride the leaf as it resizes */
const BEADS = [27, 35, 65, 73];
const BEAD_DOTS = [31, 69];

/**
 * The inlay of one leaf. Its right-hand twin renders this mirrored, so the
 * closed door is symmetrical about the seam between the leaves — the fleur
 * and the beading line up, and the moon's stars swing to the other side.
 *
 * Layers, bottom to top: the deeper arch interior, a trellis pressed into it,
 * a second frame line just inside the first (the old-door double frame), a
 * fleur-de-lis under the arch head, the room's own medallion at the middle,
 * beading above and below it, and a lozenge pair at the foot.
 */
function DoorOrnament({ motif }: { motif: RoomMotif }) {
  return (
    <>
      {/* the arch interior, a step deeper than the leaf around it */}
      <span
        aria-hidden
        className="pointer-events-none absolute"
        style={{ inset: 10, borderRadius: '999px 999px 11px 11px', background: PANEL }}
      />
      {/* trellis pressed into the panel */}
      <span
        aria-hidden
        className="pointer-events-none absolute"
        style={{
          inset: 19,
          borderRadius: '999px 999px 8px 8px',
          backgroundImage:
            `repeating-linear-gradient(45deg, ${TRELLIS_LINE} 0 1px, transparent 1px 15px),` +
            `repeating-linear-gradient(-45deg, ${TRELLIS_LINE} 0 1px, transparent 1px 15px)`,
        }}
      />
      {/* inner frame — a second arch line, half strength */}
      <span
        aria-hidden
        className="pointer-events-none absolute border-2"
        style={{ inset: 14, borderColor: INNER_LINE, borderRadius: '999px 999px 10px 10px' }}
      />
      {/* fleur-de-lis under the arch head */}
      <svg
        aria-hidden
        viewBox="0 0 40 34"
        className="pointer-events-none absolute left-1/2 top-[32px] h-[30px] w-[35px] -translate-x-1/2"
      >
        <g fill="none" stroke={FRAME} strokeWidth="2.1" strokeLinecap="round">
          {/* centre petal */}
          <path d="M20 3.4c3.6 4.4 5.6 8 5.6 11.2 0 3.4-2.5 5.7-5.6 5.7s-5.6-2.3-5.6-5.7c0-3.2 2-6.8 5.6-11.2Z" />
          {/* side scrolls */}
          <path d="M14.4 15.2c-3.2-1.4-6.2-.4-6.2 2.2 0 2.2 1.8 3.6 4 3.6" />
          <path d="M25.6 15.2c3.2-1.4 6.2-.4 6.2 2.2 0 2.2-1.8 3.6-4 3.6" />
          {/* stem + foot */}
          <path d="M20 20.3v6.2M16.6 29.4h6.8" />
        </g>
        <circle cx="20" cy="12.6" r="1.5" fill="var(--butter)" />
      </svg>

      {/* the room's own medallion: a rosette, or a crescent and two stars */}
      <svg
        aria-hidden
        viewBox="0 0 52 52"
        className="pointer-events-none absolute left-1/2 top-1/2 h-[44px] w-[44px] -translate-x-1/2 -translate-y-1/2"
      >
        {motif === 'flower' ? (
          <>
            <g fill="none" stroke={FRAME} strokeWidth="2" strokeLinejoin="round">
              {[0, 60, 120, 180, 240, 300].map((a) => (
                <path
                  key={a}
                  d="M26 26c4.6-5.6 4.6-12 0-17.8-4.6 5.8-4.6 12.2 0 17.8Z"
                  transform={`rotate(${a} 26 26)`}
                />
              ))}
            </g>
            <circle cx="26" cy="26" r="3" fill="var(--butter)" />
          </>
        ) : (
          <>
            <path
              d="M33.6 9.4A16 16 0 1 0 33.6 36.6 12.6 12.6 0 0 1 33.6 9.4Z"
              fill={FRAME}
            />
            <path
              d="M41 12c.5 2.6 1.5 3.8 4.4 5-2.9 1.2-3.9 2.4-4.4 5-.5-2.6-1.5-3.8-4.4-5 2.9-1.2 3.9-2.4 4.4-5Z"
              fill="var(--butter)"
              transform="scale(.85) translate(6,1)"
            />
            <path
              d="M43 28c.4 2 1.1 2.9 3.4 3.8-2.3.9-3 1.8-3.4 3.8-.4-2-1.1-2.9-3.4-3.8 2.3-.9 3-1.8 3.4-3.8Z"
              fill="var(--butter)"
              transform="scale(.7) translate(16,10)"
            />
          </>
        )}
      </svg>

      {/* beaded lozenges above / below the medallion */}
      {BEADS.map((top) => (
        <span
          key={top}
          aria-hidden
          className="pointer-events-none absolute left-1/2 h-[9px] w-[9px] -translate-x-1/2 rotate-45 border-2"
          style={{ top: `${top}%`, borderColor: INNER_LINE }}
        />
      ))}
      {BEAD_DOTS.map((top) => (
        <span
          key={top}
          aria-hidden
          className="pointer-events-none absolute left-1/2 h-[4px] w-[4px] -translate-x-1/2 rotate-45"
          style={{ top: `${top}%`, background: 'var(--butter)' }}
        />
      ))}

      {/* lozenge pair near the foot of the door */}
      <span
        aria-hidden
        className="pointer-events-none absolute bottom-[46px] left-1/2 h-[13px] w-[13px] -translate-x-1/2 rotate-45 border-2"
        style={{ borderColor: INNER_LINE }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute bottom-[30px] left-1/2 h-[7px] w-[7px] -translate-x-1/2 rotate-45"
        style={{ background: 'var(--butter)' }}
      />
    </>
  );
}

/**
 * The floating front door — one entrance per room registered in
 * src/lib/rooms.ts for this landmark.
 *
 * Each entrance is a pair of flat sticker doors, closed by default: hovering
 * slides the left leaf out to the left and the right leaf out to the right,
 * revealing the room behind. The plate on the lintel carries a magic
 * coordinate that changes every day, echoing the Magic House lore — the door
 * opens onto somewhere different each time.
 *
 * The room opens in the language the visitor is reading the site in: the
 * current language rides along on the link, and each room honours ?lang=.
 */
export default function FrontDoors({
  landmarkId,
  variants,
}: {
  landmarkId: string;
  variants: Variants;
}) {
  const { t, lang } = useLanguage();
  const rooms = roomsFor(landmarkId);
  if (rooms.length === 0) return null;

  const hrefFor = (href: string) => {
    try {
      const url = new URL(href);
      url.searchParams.set('lang', lang);
      return url.toString();
    } catch {
      return href;
    }
  };

  return (
    <motion.div variants={variants} className="mt-6">
      <div className="flex items-center gap-3">
        <h3 className="text-[0.72rem] font-extrabold uppercase tracking-[0.16em] text-ink-soft">
          {t('rooms.heading')}
        </h3>
        <span className="h-px flex-1 bg-ink/10" />
      </div>
      <p className="mt-1.5 text-xs font-semibold text-ink-soft">{t('rooms.hint')}</p>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {rooms.map((room) => {
          const coord = coordToday(room.coordSeed);
          return (
            <a
              key={room.id}
              href={hrefFor(room.href)}
              target="_blank"
              rel="noreferrer"
              className="group block"
              aria-label={t(room.titleKey)}
            >
              {/* doorway — the room sits behind, the two leaves cover it */}
              <div className="relative aspect-[16/10] overflow-hidden rounded-[14px] border-[3px] border-white shadow-sticker">
                {/* the room, revealed when the doors slide apart */}
                <img
                  src={room.shot}
                  alt={t(room.titleKey)}
                  loading="lazy"
                  className="absolute inset-0 h-full w-full scale-[1.06] object-cover object-center transition-transform duration-[900ms] ease-[cubic-bezier(.22,1,.36,1)] group-hover:scale-100"
                  style={{ background: room.accent }}
                />

                {/* left leaf */}
                <div
                  aria-hidden
                  className="absolute inset-y-0 left-0 w-1/2 border-r-2 border-white/70 transition-transform duration-[900ms] ease-[cubic-bezier(.22,1,.36,1)] will-change-transform group-hover:-translate-x-full group-focus-visible:-translate-x-full motion-reduce:transition-none"
                  style={{ background: LEAF }}
                >
                  <span
                    className="absolute inset-[7px] border-[3px]"
                    style={{ borderColor: FRAME, borderRadius: '999px 999px 12px 12px' }}
                  />
                  {/* the inlay is mirrored on the right leaf, so the pair lines up */}
                  <div className="absolute inset-0">
                    <DoorOrnament motif={room.motif} />
                    <Sparkle className="absolute left-[16px] top-[12px] h-3.5 w-3.5" />
                  </div>
                  <span className="absolute right-[9px] top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full border-2 border-white bg-butter" />
                </div>

                {/* right leaf */}
                <div
                  aria-hidden
                  className="absolute inset-y-0 right-0 w-1/2 border-l-2 border-white/70 transition-transform duration-[900ms] ease-[cubic-bezier(.22,1,.36,1)] will-change-transform group-hover:translate-x-full group-focus-visible:translate-x-full motion-reduce:transition-none"
                  style={{ background: LEAF }}
                >
                  <span
                    className="absolute inset-[7px] border-[3px]"
                    style={{ borderColor: FRAME, borderRadius: '999px 999px 12px 12px' }}
                  />
                  <div className="absolute inset-0" style={{ transform: 'scaleX(-1)' }}>
                    <DoorOrnament motif={room.motif} />
                    <Sparkle className="absolute left-[16px] top-[12px] h-3.5 w-3.5" />
                  </div>
                  <span className="absolute left-[9px] top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full border-2 border-white bg-butter" />
                </div>

                {/* the plate: today's magic coordinate */}
                <span className="ex-chip absolute left-2 top-2 z-10 flex items-center gap-1.5 rounded-full border-2 border-white bg-white/85 px-2.5 py-0.5 text-[0.66rem] font-extrabold tracking-[0.12em] text-ink-soft shadow-sticker backdrop-blur-sm">
                  <RoomGlyph icon={room.Icon} className="h-3 w-3 text-coral" />
                  {coord.layer}°{coord.tick}′
                </span>

                {/* hint — fades once the doors are open */}
                <span className="ex-chip absolute bottom-2 right-2 z-10 rounded-full border-2 border-white bg-white/85 px-2.5 py-0.5 text-[0.66rem] font-extrabold tracking-[0.08em] text-ink-soft shadow-sticker backdrop-blur-sm transition-opacity duration-300 group-hover:opacity-0">
                  {t('rooms.peek')}
                </span>
              </div>

              <div className="px-1 pt-2.5">
                <h4 className="font-hand inline-flex items-center gap-1.5 text-[1.35rem] leading-tight text-ink">
                  {t(room.titleKey)}
                  <ArrowUpRight className="h-4 w-4 text-coral transition-transform duration-300 ease-squash group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </h4>
                <p className="mt-0.5 text-xs font-semibold leading-relaxed text-ink-soft">
                  {t(room.descKey)}
                </p>
              </div>
            </a>
          );
        })}
      </div>
    </motion.div>
  );
}
