import { motion } from 'framer-motion';

/** Inline SVG doodles for the Visit page (design/visit.md — Assets used). */

export function CatDoodle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <path
        d="M15 27 L19 9 L31 19 Z"
        fill="var(--apricot)"
        stroke="var(--ink)"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path
        d="M49 27 L45 9 L33 19 Z"
        fill="var(--apricot)"
        stroke="var(--ink)"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <circle
        cx="32"
        cy="39"
        r="19"
        fill="var(--peach)"
        stroke="var(--ink)"
        strokeWidth="2.5"
      />
      <circle cx="25" cy="36" r="2.2" fill="var(--ink)" />
      <circle cx="39" cy="36" r="2.2" fill="var(--ink)" />
      <path
        d="M30 42 Q32 44.5 34 42"
        fill="none"
        stroke="var(--ink)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M12 38 L21 39 M12 44 L21 42 M52 38 L43 39 M52 44 L43 42"
        stroke="var(--ink)"
        strokeWidth="1.8"
        strokeLinecap="round"
        opacity="0.7"
      />
    </svg>
  );
}

export function ShellDoodle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <path
        d="M32 56 C15 46 8 32 14 19 C20 8 44 8 50 19 C56 32 49 46 32 56 Z"
        fill="var(--rose)"
        stroke="var(--ink)"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path
        d="M32 54 L32 14 M32 54 L19 20 M32 54 L45 20 M32 54 L13 32 M32 54 L51 32"
        stroke="var(--ink)"
        strokeWidth="1.8"
        strokeLinecap="round"
        opacity="0.55"
      />
      <rect
        x="26"
        y="52"
        width="12"
        height="7"
        rx="3"
        fill="var(--coral)"
        stroke="var(--ink)"
        strokeWidth="2"
      />
    </svg>
  );
}

export function SunHandsDoodle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <g stroke="var(--ink)" strokeWidth="2.4" strokeLinecap="round">
        <path d="M32 4 L32 11 M32 47 L32 54 M10 29 L17 29 M47 29 L54 29 M17 14 L21.5 18.5 M42.5 39.5 L47 44 M47 14 L42.5 18.5 M21.5 39.5 L17 44" />
      </g>
      <circle
        cx="32"
        cy="29"
        r="13"
        fill="var(--butter)"
        stroke="var(--ink)"
        strokeWidth="2.5"
      />
      <circle cx="27.5" cy="26.5" r="1.8" fill="var(--ink)" />
      <circle cx="36.5" cy="26.5" r="1.8" fill="var(--ink)" />
      <path
        d="M27.5 31.5 Q32 35 36.5 31.5"
        fill="none"
        stroke="var(--ink)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* clapping hands */}
      <path
        d="M6 50 Q10 42 16 46 Q18 48 15 52 Q10 57 6 50 Z"
        fill="var(--peach)"
        stroke="var(--ink)"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path
        d="M58 50 Q54 42 48 46 Q46 48 49 52 Q54 57 58 50 Z"
        fill="var(--peach)"
        stroke="var(--ink)"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SparkleDoodle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <path
        d="M30 6 C32 22 38 28 54 30 C38 32 32 38 30 54 C28 38 22 32 6 30 C22 28 28 22 30 6 Z"
        fill="var(--lavender)"
        stroke="var(--ink)"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path
        d="M49 42 C50 50 53 53 61 54 C53 55 50 58 49 62 C48 58 45 55 41 54 C45 53 48 50 49 42 Z"
        fill="var(--butter)"
        stroke="var(--ink)"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle cx="15" cy="50" r="2.4" fill="var(--rose)" />
      <circle cx="52" cy="12" r="2.4" fill="var(--seafoam)" />
    </svg>
  );
}

export function GullSvg({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 34 16" className={className} aria-hidden>
      <path
        d="M2 10 Q 9 2 17 9 Q 25 2 32 10"
        fill="none"
        stroke="var(--ink)"
        strokeWidth="2.4"
        strokeLinecap="round"
        opacity="0.55"
      />
    </svg>
  );
}

export function CloudSvg({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 48" className={className} aria-hidden>
      <ellipse cx="34" cy="32" rx="27" ry="14" fill="var(--cloud)" />
      <ellipse cx="62" cy="23" rx="25" ry="17" fill="var(--cloud)" />
      <ellipse cx="90" cy="33" rx="23" ry="12" fill="var(--cloud)" />
    </svg>
  );
}

/** tiny ferry doodle at the end of each timetable row */
export function MiniFerry({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 32" className={className} aria-hidden>
      <circle cx="12" cy="6" r="2.4" fill="var(--ink)" opacity="0.25" />
      <circle cx="18" cy="3.5" r="1.8" fill="var(--ink)" opacity="0.18" />
      <path
        d="M6 16 L42 16 L37 27 Q22 30 11 27 Z"
        fill="var(--apricot)"
        stroke="var(--ink)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <rect
        x="13"
        y="8"
        width="20"
        height="9"
        rx="3"
        fill="var(--cream)"
        stroke="var(--ink)"
        strokeWidth="2"
      />
      <path
        d="M13 8 L17 3 L33 3 L33 8"
        fill="none"
        stroke="var(--ink)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M18 8 L18 3.5 M23 8 L23 3.5 M28 8 L28 3.5" stroke="var(--coral)" strokeWidth="2.4" />
      <path
        d="M2 27 Q8 24 14 27 T26 27 T38 27 T50 27"
        fill="none"
        stroke="var(--lagoon)"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** wavy underline that draws itself (0.6s stroke) when scrolled into view */
export function WaveUnderline({
  className,
  delay = 0,
}: {
  className?: string;
  delay?: number;
}) {
  return (
    <svg viewBox="0 0 220 10" className={className} aria-hidden>
      <motion.path
        d="M4 6 Q 18 1 32 6 T 60 6 T 88 6 T 116 6 T 144 6 T 172 6 T 200 6 T 216 6"
        fill="none"
        stroke="var(--coral)"
        strokeWidth="3"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ delay, duration: 0.6, ease: 'easeInOut' }}
      />
    </svg>
  );
}

/** circular postmark badge — "SUMMER TOWN • EST. 1862 •" */
export function Postmark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden>
      <defs>
        <path
          id="vt-pm-arc"
          d="M 50,50 m -34,0 a 34,34 0 1,1 68,0 a 34,34 0 1,1 -68,0"
          fill="none"
        />
      </defs>
      <circle
        cx="50"
        cy="50"
        r="46"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeDasharray="4 3"
      />
      <circle cx="50" cy="50" r="25" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M38 50 L46 58 L63 40"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <text
        fontSize="10"
        fontWeight="800"
        letterSpacing="1.6"
        fill="currentColor"
        fontFamily="Nunito, sans-serif"
      >
        <textPath href="#vt-pm-arc">SUMMER TOWN • EST. 1862 •</textPath>
      </text>
    </svg>
  );
}
