import { motion, type Variants } from 'framer-motion';
import { ArrowUpRight, Sailboat } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';

const LAB_URL = 'https://supply-chain-lab.summercommences.com/';

/* A left-to-right story rather than a collection of icons: raw demand,
   order and logistics signals enter one sheet, are cross-checked, then
   leave as research + app sails on the same paper boat. */
function WorkbenchPoster() {
  return (
    <svg
      viewBox="0 0 800 500"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 h-full w-full"
      aria-hidden
    >
      <defs>
        <pattern id="wb-grid" width="36" height="36" patternUnits="userSpaceOnUse">
          <path d="M36 0H0V36" fill="none" stroke="#5EC2BC" strokeOpacity="0.12" strokeWidth="1.4" />
        </pattern>
      </defs>

      {/* blueprint paper and one continuous sea / work surface */}
      <rect width="800" height="500" fill="#FDF6E9" />
      <rect width="800" height="500" fill="url(#wb-grid)" />
      <path
        d="M0 363 C118 337 208 376 323 357 C454 335 562 347 666 365 C718 374 760 369 800 354 V500 H0 Z"
        fill="#DDF0EA"
      />
      <path
        d="M0 421 C124 395 222 432 348 413 C482 393 620 431 800 398 V500 H0 Z"
        fill="#BFE4DE"
        opacity="0.42"
      />

      {/* 01 — three kinds of raw supply-chain signals arrive together,
          kept compact so the left edge breathes */}
      <g stroke="#22303A" strokeWidth="3" strokeLinejoin="round">
        <path d="M57 139 L131 135 L136 177 L62 181 Z" fill="#FFFCF5" />
        <path d="M50 212 L126 208 L130 250 L54 254 Z" fill="#FFFCF5" />
        <path d="M62 286 L136 290 L132 330 L58 326 Z" fill="#FFFCF5" />
      </g>

      {/* demand radar */}
      <g fill="none" stroke="#FF7B6B" strokeLinecap="round">
        <path d="M71 169 A22 22 0 0 1 109 156" strokeWidth="2.6" opacity="0.55" />
        <path d="M77 169 A14 14 0 0 1 101 161" strokeWidth="2.6" opacity="0.8" />
        <path d="M83 169 L101 154" strokeWidth="2.6" />
      </g>
      <circle cx="102" cy="154" r="4.4" fill="#FF7B6B" />
      <circle cx="83" cy="169" r="3.6" fill="#22303A" />

      {/* order bars */}
      <path d="M65 245 H117" fill="none" stroke="#22303A" strokeWidth="2.6" strokeLinecap="round" />
      <rect x="70" y="230" width="9" height="14" rx="2.5" fill="#FFC95C" />
      <rect x="85" y="219" width="9" height="25" rx="2.5" fill="#FFC95C" />
      <rect x="100" y="224" width="9" height="20" rx="2.5" fill="#FFC95C" />

      {/* logistics route */}
      <path
        d="M72 319 C83 301 100 328 120 306"
        fill="none"
        stroke="#3AA79F"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="3 7"
      />
      <circle cx="72" cy="319" r="4.4" fill="#5EC2BC" stroke="#22303A" strokeWidth="2.2" />
      <path d="M120 300 L126 306 L120 312 L114 306 Z" fill="#5EC2BC" stroke="#22303A" strokeWidth="2.2" />

      {/* the three feeds stay visibly connected to the workbench */}
      <g fill="none" strokeWidth="4.5" strokeLinecap="round">
        <path d="M136 160 C162 160 159 176 193 178" stroke="#FF7B6B" />
        <path d="M130 231 C158 231 164 238 193 238" stroke="#D8A635" />
        <path d="M135 310 C162 310 158 299 193 298" stroke="#3AA79F" />
      </g>

      {/* 02 — one shared analysis sheet, not a floating chart */}
      <path
        d="M186 119 L435 111 L449 344 L199 360 Z"
        fill="#22303A"
        opacity="0.08"
      />
      <path
        d="M178 109 L427 101 L441 334 L191 350 Z"
        fill="#FFFCF5"
        stroke="#22303A"
        strokeWidth="4.5"
        strokeLinejoin="round"
      />
      <path d="M264 101 L344 98 L347 122 L267 126 Z" fill="#FFC95C" opacity="0.62" />

      {/* three model circles overlap; only their shared centre becomes output */}
      <circle cx="289" cy="216" r="40" fill="#FF7B6B" opacity="0.22" />
      <circle cx="329" cy="216" r="40" fill="#FFC95C" opacity="0.3" />
      <circle cx="309" cy="255" r="40" fill="#5EC2BC" opacity="0.3" />
      <g fill="none" strokeWidth="4" strokeLinecap="round">
        <path d="M210 177 C247 177 254 204 282 228" stroke="#FF7B6B" />
        <path d="M210 238 C243 238 256 238 282 238" stroke="#D8A635" />
        <path d="M210 298 C246 298 253 273 283 250" stroke="#3AA79F" />
      </g>
      <g stroke="#FFFCF5" strokeWidth="3">
        <circle cx="210" cy="177" r="8" fill="#FF7B6B" />
        <circle cx="210" cy="238" r="8" fill="#FFC95C" />
        <circle cx="210" cy="298" r="8" fill="#5EC2BC" />
      </g>
      <path
        d="M296 239 L306 249 L326 224"
        fill="none"
        stroke="#22303A"
        strokeWidth="5.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* 03 — the analysed sheet folds into two useful sails */}
      <ellipse cx="541" cy="394" rx="151" ry="15" fill="#3AA79F" opacity="0.14" />
      <path
        d="M513 340 L566 220 L638 340 Z"
        fill="#BFE8E4"
        stroke="#22303A"
        strokeWidth="4.5"
        strokeLinejoin="round"
      />
      <path
        d="M412 340 L486 174 L552 340 Z"
        fill="#FFFCF5"
        stroke="#22303A"
        strokeWidth="4.5"
        strokeLinejoin="round"
      />
      <path d="M486 176 L486 142" fill="none" stroke="#22303A" strokeWidth="4" strokeLinecap="round" />
      <path
        d="M489 144 L530 153 L489 167 Z"
        fill="#FF7B6B"
        stroke="#22303A"
        strokeWidth="3.5"
        strokeLinejoin="round"
      />

      {/* the validated line grows directly into the research sail */}
      <path
        d="M328 239 C374 239 398 280 439 280 L461 261 L479 274 L503 230"
        fill="none"
        stroke="#22303A"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="461" cy="261" r="5.5" fill="#5EC2BC" stroke="#FFFCF5" strokeWidth="2.5" />
      <circle cx="479" cy="274" r="5.5" fill="#FFC95C" stroke="#FFFCF5" strokeWidth="2.5" />
      <circle cx="503" cy="230" r="7" fill="#FF7B6B" stroke="#FFFCF5" strokeWidth="3" />

      {/* the second sail is an app window — research becomes a usable tool */}
      <rect
        x="548"
        y="278"
        width="54"
        height="43"
        rx="7"
        fill="#FFFCF5"
        stroke="#22303A"
        strokeWidth="3"
      />
      <path d="M550 290 H600" stroke="#22303A" strokeWidth="2.5" />
      <circle cx="557" cy="284" r="2.2" fill="#FF7B6B" />
      <circle cx="564" cy="284" r="2.2" fill="#FFC95C" />
      <rect x="557" y="298" width="14" height="14" rx="3" fill="#5EC2BC" />
      <rect x="578" y="298" width="14" height="14" rx="3" fill="#FFC95C" />

      {/* shared hull and fold lines make both outputs one deliverable */}
      <path
        d="M399 340 L674 340 L628 393 L453 393 Z"
        fill="#FFFCF5"
        stroke="#22303A"
        strokeWidth="5"
        strokeLinejoin="round"
      />
      <path
        d="M431 365 C492 372 574 371 650 361"
        fill="none"
        stroke="#5EC2BC"
        strokeWidth="4"
        strokeLinecap="round"
        opacity="0.72"
      />
      <path d="M536 343 L541 389" stroke="#22303A" strokeWidth="3" opacity="0.16" />

      {/* the analysed output heads for a destination node — this top-right
          anchor balances the busier left edge */}
      <circle cx="688" cy="104" r="62" fill="#FFC95C" opacity="0.13" />
      <circle
        cx="688"
        cy="104"
        r="41"
        fill="none"
        stroke="#FF7B6B"
        strokeOpacity="0.3"
        strokeWidth="3"
        strokeDasharray="4 10"
      />
      <circle cx="688" cy="104" r="25" fill="#FFFCF5" stroke="#FF7B6B" strokeWidth="4" />
      <circle cx="688" cy="104" r="7.5" fill="#FF7B6B" />
      <g fill="none" stroke="#FF7B6B" strokeLinecap="round">
        <path d="M537 147 C584 145 636 125 662 112" strokeWidth="4" strokeDasharray="4 11" opacity="0.82" />
        <path d="M649 102 L663 111 L647 121" strokeWidth="4" strokeLinejoin="round" />
      </g>
      <circle cx="612" cy="66" r="4" fill="#5EC2BC" opacity="0.75" />
      <circle cx="748" cy="190" r="4.6" fill="#FFC95C" opacity="0.9" />

      {/* wake + a route leaving the frame: the work is ready to travel */}
      <g fill="none" stroke="#3AA79F" strokeLinecap="round">
        <path d="M69 398 C88 387 107 409 126 398 C145 387 164 409 183 398" strokeWidth="4.5" opacity="0.52" />
        <path d="M261 414 C282 402 303 426 324 414 C345 402 366 426 387 414" strokeWidth="4.5" opacity="0.42" />
        <path d="M674 390 C716 387 720 358 749 352" strokeWidth="4" strokeDasharray="3 12" opacity="0.75" />
        <path d="M738 341 L752 351 L742 365" strokeWidth="4" />
      </g>
    </svg>
  );
}

/**
 * Paper Boat Lab's resident project — the supply-chain research workbench.
 * Poster tile with the curtain reveal (same language as the exhibitions);
 * clicking anywhere on it opens the real workbench in a new tab.
 */
export default function WorkbenchEntry({ variants }: { variants: Variants }) {
  const { t, lang } = useLanguage();
  /* the curtain shows the workbench in the language you are reading Summer
     Town in, so the peek matches what you are about to land on */
  const shotSrc = lang === 'en' ? '/workbench-lab-shot-en.jpg' : '/workbench-lab-shot.jpg';

  return (
    <motion.div variants={variants} className="mt-6">
      <div className="flex items-center gap-3">
        <h3 className="text-[0.72rem] font-extrabold uppercase tracking-[0.16em] text-ink-soft">
          {t('detail.workbench')}
        </h3>
        <span className="h-px flex-1 bg-ink/10" />
      </div>

      {/* poster tile — the whole tile is the door to the workbench */}
      <a
        href={LAB_URL}
        target="_blank"
        rel="noreferrer"
        aria-label={t('detail.workbenchOpen')}
        className="group mt-2.5 block w-full overflow-hidden rounded-[20px] border-[3px] border-white bg-white/60 p-2.5 text-left shadow-sticker transition-all duration-300 ease-squash hover:-translate-y-0.5 hover:bg-white/80"
      >
        <div
          className="relative aspect-[16/10] overflow-hidden rounded-[14px] border-2 border-white"
          style={{ background: '#FDF6E9' }}
        >
          <WorkbenchPoster />

          {/* the real first screen drops like a curtain on hover */}
          <div
            aria-hidden
            className="absolute inset-0 z-10 -translate-y-full transition-transform duration-[1000ms] ease-[cubic-bezier(.22,1,.36,1)] will-change-transform group-hover:translate-y-0"
          >
            <img
              src={shotSrc}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover object-top"
            />
            <span className="absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-black/35 to-transparent" />
          </div>

          <span className="ex-chip absolute left-2 top-2 flex items-center gap-1.5 rounded-full border-2 border-white bg-white/85 px-2.5 py-0.5 text-[0.68rem] font-extrabold uppercase tracking-[0.12em] text-ink-soft shadow-sticker backdrop-blur-sm">
            <Sailboat className="h-3 w-3" style={{ color: '#3AA79F' }} />
            {t('detail.workbenchChip')}
          </span>

          <span className="ex-chip absolute bottom-2 left-2 z-20 flex items-center gap-1.5 rounded-full border-2 border-white bg-white/85 px-2.5 py-0.5 text-[0.68rem] font-extrabold tracking-[0.08em] text-ink-soft shadow-sticker backdrop-blur-sm">
            <span className="relative flex h-2 w-2">
              <span
                className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
                style={{ background: 'var(--leaf)' }}
              />
              <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: 'var(--leaf)' }} />
            </span>
            LIVE
          </span>

          <span className="ex-chip absolute bottom-2 right-2 z-20 rounded-full border-2 border-white bg-white/85 px-2.5 py-0.5 text-[0.68rem] font-extrabold tracking-[0.08em] text-ink-soft shadow-sticker backdrop-blur-sm transition-opacity duration-200 group-hover:opacity-0">
            {t('exhibitions.peek')}
          </span>
        </div>

        <div className="px-1 pb-0.5 pt-2.5">
          <h4 className="font-hand text-[1.45rem] leading-tight text-ink">{t('detail.workbenchTitle')}</h4>
          <p className="mt-1 text-xs font-semibold leading-relaxed text-ink-soft">{t('detail.workbenchDesc')}</p>
        </div>
      </a>

      {/* one clear way out: the workbench, in a new tab */}
      <div className="mt-2.5 flex flex-wrap items-center gap-2.5">
        <a
          href={LAB_URL}
          target="_blank"
          rel="noreferrer"
          className="btn-secondary inline-flex items-center gap-1.5 px-4 py-2 text-xs"
        >
          {t('detail.workbenchOpen')}
          <ArrowUpRight className="h-3.5 w-3.5" />
        </a>
        <span className="inline-flex items-center gap-1.5 text-[0.7rem] font-semibold text-ink-soft/70">
          <Sailboat className="h-3.5 w-3.5" style={{ color: '#3AA79F' }} />
          {t('detail.workbenchHost')}
        </span>
      </div>
    </motion.div>
  );
}
