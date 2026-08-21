import type { CSSProperties, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/lib/i18n';
import type { DoodleId } from './presets';

/* ---------- washi tape strip ---------- */
export function TapeStrip({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span
      aria-hidden
      className={cn('pointer-events-none absolute bg-butter/70 shadow-sm', className)}
      style={style}
    />
  );
}

/* ---------- round thumbtack pin head ---------- */
export function PinHead({
  color = '#FF9B9B',
  className,
}: {
  color?: string;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        'pointer-events-none absolute z-10 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white shadow-md',
        className,
      )}
      style={{ background: color }}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-ink/40" />
    </span>
  );
}

/* ---------- circular postmark / rubber stamp (design.md §7.3, §7.5) ---------- */
export function PostmarkStamp({
  size = 72,
  date,
  color = '#FF9B9B',
  className,
}: {
  size?: number;
  date?: string;
  color?: string;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      aria-hidden
      style={{ filter: 'drop-shadow(0 1px 0 rgba(74,68,112,0.12))' }}
    >
      <circle
        cx="50"
        cy="50"
        r="46"
        fill="rgba(255,249,239,0.72)"
        stroke={color}
        strokeWidth="3"
        strokeDasharray="5 4"
      />
      <circle cx="50" cy="50" r="35" fill="none" stroke={color} strokeWidth="1.8" />
      {/* circular ring text */}
      <defs>
        <path id="st-pm-arc" d="M 50,50 m -26,0 a 26,26 0 1,1 52,0 a 26,26 0 1,1 -52,0" />
      </defs>
      <text fontSize="8.6" fontWeight="800" fill={color} fontFamily="Nunito, sans-serif" letterSpacing="2.1">
        <textPath href="#st-pm-arc">SUMMER TOWN · POST ·</textPath>
      </text>
      <text
        x="50"
        y="47"
        textAnchor="middle"
        fontSize="10.5"
        fontWeight="700"
        fill={color}
        fontFamily="Fredoka, sans-serif"
      >
        {date ?? 'EST. 1962'}
      </text>
      <path d="M32 58 Q50 52 68 58" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <path d="M34 64 Q50 59 66 64" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/* ---------- passport "collected" rubber stamp badge ---------- */
export function CollectedStamp({ size = 76 }: { size?: number }) {
  const { t } = useLanguage();
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-label={t('detail.stamped')} role="img">
      <circle
        cx="50"
        cy="50"
        r="46"
        fill="rgba(255,249,239,0.8)"
        stroke="#E2635F"
        strokeWidth="3.5"
        strokeDasharray="6 4"
      />
      <circle cx="50" cy="50" r="34" fill="none" stroke="#E2635F" strokeWidth="2" />
      <text
        x="50"
        y="42"
        textAnchor="middle"
        fontSize="9"
        fontWeight="800"
        fill="#E2635F"
        fontFamily="Nunito, sans-serif"
        letterSpacing="1.2"
      >
        SUMMER TOWN
      </text>
      <text
        x="50"
        y="58"
        textAnchor="middle"
        fontSize="12.5"
        fontWeight="700"
        fill="#E2635F"
        fontFamily="Fredoka, sans-serif"
      >
        STAMPED
      </text>
      <text
        x="50"
        y="71"
        textAnchor="middle"
        fontSize="7.5"
        fontWeight="700"
        fill="#E2635F"
        fontFamily="Nunito, sans-serif"
        letterSpacing="1.4"
      >
        EST. 1962
      </text>
    </svg>
  );
}

/* ---------- paper note (bulletin-board component: tape + pin + rotation) ---------- */
export function PaperNote({
  children,
  pinColor = '#F4B942',
  className,
  style,
}: {
  children: ReactNode;
  pinColor?: string;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={cn('relative bg-paper p-6 pt-9 shadow-sticker', className)}
      style={{ borderRadius: 6, ...style }}
    >
      <TapeStrip className="-top-2.5 left-1/2 h-6 w-24 -translate-x-1/2 -rotate-2" />
      <PinHead color={pinColor} className="-top-3 left-1/2 -translate-x-1/2" />
      {children}
    </div>
  );
}

/* ---------- postcard doodles ---------- */
export function Doodle({
  id,
  className,
  size = 64,
}: {
  id: DoodleId;
  className?: string;
  size?: number;
}) {
  const common = { width: size, height: size, viewBox: '0 0 64 64', className, 'aria-hidden': true } as const;
  switch (id) {
    case 'shell':
      return (
        <svg {...common}>
          <path
            d="M32 10 C18 10 10 24 10 34 C10 46 20 54 32 54 C44 54 54 46 54 34 C54 24 46 10 32 10 Z"
            fill="#FFC3D0"
          />
          <path d="M32 10 L32 54 M22 14 C22 14 24 34 26 52 M42 14 C42 14 40 34 38 52 M14 26 C18 30 22 34 26 36 M50 26 C46 30 42 34 38 36"
            fill="none" stroke="#E2635F" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M10 34 Q32 42 54 34" fill="none" stroke="#E2635F" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      );
    case 'lighthouse':
      return (
        <svg {...common}>
          <path d="M26 54 L28 22 L36 22 L38 54 Z" fill="#FFF9EF" stroke="#4A4470" strokeWidth="2" />
          <path d="M27 38 L37 38 M27.5 30 L36.5 30" stroke="#FF9B9B" strokeWidth="5" />
          <rect x="25" y="14" width="14" height="9" rx="2.5" fill="#FFDD94" stroke="#4A4470" strokeWidth="2" />
          <path d="M23 14 L32 7 L41 14 Z" fill="#FF9B9B" stroke="#4A4470" strokeWidth="2" />
          <path d="M18 18 L10 14 M46 18 L54 14" stroke="#FFDD94" strokeWidth="2.6" strokeLinecap="round" />
          <path d="M20 54 Q26 50 32 54 Q38 58 44 54" fill="none" stroke="#7EC8E3" strokeWidth="2.6" strokeLinecap="round" />
        </svg>
      );
    case 'apple':
      return (
        <svg {...common}>
          <path
            d="M32 20 C24 12 12 18 12 32 C12 46 22 56 32 56 C42 56 52 46 52 32 C52 18 40 12 32 20 Z"
            fill="#FF7B6B"
          />
          <path d="M32 18 C32 12 34 9 38 7" fill="none" stroke="#4A4470" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M38 10 C42 5 50 7 52 9 C50 14 42 15 38 10 Z" fill="#8FD3A8" />
          <circle cx="24" cy="30" r="3.4" fill="#FFF9EF" opacity="0.75" />
        </svg>
      );
    case 'windbell':
      return (
        <svg {...common}>
          <path d="M20 12 Q32 4 44 12" fill="none" stroke="#4A4470" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M32 8 L32 16" stroke="#4A4470" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M24 16 L40 16 L42 32 Q32 38 22 32 Z" fill="#F4B942" stroke="#4A4470" strokeWidth="2" />
          <circle cx="32" cy="24" r="2.6" fill="#FFF9EF" />
          <path d="M32 36 L32 46" stroke="#4A4470" strokeWidth="2" strokeLinecap="round" />
          <rect x="27" y="46" width="10" height="12" rx="2" fill="#FFC3D0" stroke="#4A4470" strokeWidth="2" />
          <path d="M14 22 Q10 24 12 28 M50 22 Q54 24 52 28" fill="none" stroke="#7EC8E3" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      );
  }
}

/* ---------- tiny paper boat (closing strip + accents) ---------- */
export function PaperBoat({ size = 44, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size * 0.62} viewBox="0 0 72 44" className={className} aria-hidden>
      <path d="M36 2 L36 20" stroke="#4A4470" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M36 4 L54 20 L36 20 Z" fill="#FF9B9B" />
      <path d="M36 8 L20 20 L36 20 Z" fill="#FFC9A3" />
      <path d="M6 22 L66 22 L54 38 L18 38 Z" fill="#FFF9EF" stroke="#4A4470" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M6 22 L20 22 M52 22 L66 22" stroke="#4A4470" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

/* ---------- curved arrow doodle (empty-collection nudge) ---------- */
export function ArrowDoodle({ className }: { className?: string }) {
  return (
    <svg width="46" height="40" viewBox="0 0 46 40" className={className} aria-hidden>
      <path
        d="M6 36 C18 34 34 28 38 8"
        fill="none"
        stroke="var(--ink-soft)"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeDasharray="1 6"
      />
      <path d="M31 12 L39 5 L42 14" fill="none" stroke="var(--ink-soft)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
