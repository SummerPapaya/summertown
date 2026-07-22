import { Link } from 'react-router';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Bird, Citrus, Flower2, Star, Sunset, Trophy } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { BACK_OUT, SQUASH, Words } from './anim';
import { cn } from '@/lib/utils';

interface Stay {
  name: string;
  img: string;
  alt: string;
  chipClass: string;
  tagline: string;
  blurb: string;
  amenities: { icon: LucideIcon; label: string }[];
  to: string;
  tilt: number;
}

const STAYS: Stay[] = [
  {
    name: 'Hotel Horizon',
    img: '/scene-hotel.png',
    alt: 'The grand peach Hotel Horizon seen from the beach, with its star-shaped pool',
    chipClass: 'bg-peach',
    tagline: '24 rooms, 24 sunsets',
    blurb:
      'A peach-tiered grand hotel where every balcony faces the horizon and the pool is shaped like a star. Bellhop duties by a very professional pelican.',
    amenities: [
      { icon: Star, label: 'star pool' },
      { icon: Sunset, label: 'horizon balconies' },
      { icon: Bird, label: 'pelican bellhop' },
    ],
    to: '/?place=hotel',
    tilt: -2,
  },
  {
    name: 'The Three Villas',
    img: '/scene-villas.png',
    alt: 'Three pastel sister villas — mint, lilac and butter — around a shared garden',
    chipClass: 'bg-mint',
    tagline: 'Mint, Lilac & Butter — pick your flavor',
    blurb:
      'Three sister villas sharing one garden, one lemon tree, and an eternal croquet rivalry. Rent one, or rent all three and invent a family.',
    amenities: [
      { icon: Citrus, label: 'one lemon tree' },
      { icon: Trophy, label: 'croquet rivalry' },
      { icon: Flower2, label: 'shared garden' },
    ],
    to: '/?place=villas',
    tilt: 2,
  },
];

export default function WhereToStay() {
  const reduced = useReducedMotion();
  return (
    <section id="stay" className="mx-auto max-w-[1200px] scroll-mt-[100px] px-6 py-24">
      <div className="text-center">
        <p className="text-[0.72rem] font-extrabold uppercase tracking-[0.16em] text-coral">
          Where to stay
        </p>
        <h2 className="mt-2 font-display text-[clamp(2rem,4vw,3.5rem)] font-semibold leading-[1.05] text-ink">
          <Words text="Sleep where the sky does." />
        </h2>
      </div>

      <div className="mt-12 grid gap-8 md:grid-cols-2">
        {STAYS.map((s, i) => (
          <motion.article
            key={s.name}
            initial={reduced ? { opacity: 0 } : { y: 60, rotate: s.tilt, opacity: 0 }}
            whileInView={reduced ? { opacity: 1 } : { y: 0, rotate: 0, opacity: 1 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ delay: i * 0.15, duration: 0.7, ease: SQUASH }}
            className="sticker-card group overflow-hidden p-4"
          >
            {/* thumbnail — slow zoom on hover */}
            <div className="relative h-[240px] overflow-hidden rounded-2xl bg-lilac/40">
              <img
                src={s.img}
                alt={s.alt}
                loading="lazy"
                className="h-full w-full object-cover transition-transform [transition-duration:600ms] ease-squash group-hover:scale-[1.06]"
              />
              <span
                className={cn(
                  'absolute left-4 top-4 rounded-full border-[3px] border-white px-3.5 py-1 text-[0.68rem] font-extrabold uppercase tracking-[0.14em] text-ink shadow-sm',
                  s.chipClass,
                )}
              >
                Stay
              </span>
            </div>

            <div className="p-5">
              <h3 className="font-display text-[clamp(1.35rem,2vw,1.75rem)] font-semibold text-ink">
                {s.name}
              </h3>
              <p className="mt-0.5 font-hand text-2xl leading-tight text-coral">{s.tagline}</p>
              <p className="mt-3 font-semibold leading-relaxed text-ink/80">{s.blurb}</p>

              {/* amenity icons pop in staggered when the card enters */}
              <div className="mt-5 flex flex-wrap gap-x-6 gap-y-3">
                {s.amenities.map((a, ai) => (
                  <motion.span
                    key={a.label}
                    initial={{ scale: 0, rotate: -20, opacity: 0 }}
                    whileInView={{ scale: 1, rotate: 0, opacity: 1 }}
                    viewport={{ once: true, amount: 0.6 }}
                    transition={{
                      delay: 0.35 + i * 0.15 + ai * 0.05,
                      duration: 0.45,
                      ease: BACK_OUT,
                    }}
                    className="flex items-center gap-2"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-full border-[3px] border-white bg-cream shadow-sm">
                      <a.icon className="h-4 w-4 text-ink" />
                    </span>
                    <span className="text-xs font-extrabold text-ink-soft">{a.label}</span>
                  </motion.span>
                ))}
              </div>

              <Link to={s.to} className="btn-primary mt-6 px-5 py-2.5 text-sm">
                Book on the map <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </motion.article>
        ))}
      </div>

      {/* budget option — slides up last */}
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ delay: 0.35, duration: 0.5, ease: SQUASH }}
        className="mt-10 flex justify-center"
      >
        <Link
          to="/?place=library"
          className="relative block max-w-xl -rotate-1 rounded-lg border-[3px] border-white bg-butter/60 px-8 py-5 text-center shadow-sticker transition-transform duration-300 ease-squash hover:rotate-0 hover:scale-[1.02]"
        >
          <span
            className="absolute -top-3 left-1/2 h-6 w-24 -translate-x-1/2 -rotate-3 bg-butter/80"
            aria-hidden
          />
          <p className="font-hand text-2xl leading-snug text-ink">
            Budget option: the library&rsquo;s moon-reading nook. Officially discouraged.
            Unofficially: bring a blanket.
          </p>
        </Link>
      </motion.div>
    </section>
  );
}
