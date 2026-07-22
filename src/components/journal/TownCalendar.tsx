import { motion, useReducedMotion } from 'framer-motion';
import { CalendarDays, Wind } from 'lucide-react';
import { EASE_BACK_2, EASE_SQUASH } from './presets';
import { PaperNote } from './bits';
import { cn } from '@/lib/utils';

const EVENTS = [
  {
    when: 'Thursdays',
    title: 'Summer FM Requests Night',
    body: 'Call in, walk in, or flap in. 105.5, 7pm. Sunny takes all requests, plays about half.',
    rotate: -2.5,
    pin: '#F4B942',
  },
  {
    when: 'Fridays',
    title: 'Seashell Theater by Candlelight',
    body: "This month: 'The Tide & The Moon'. Free with a cushion; cushions available at the store (aisle 3).",
    rotate: 1.5,
    pin: '#FF9B9B',
  },
  {
    when: 'June 1st',
    title: 'The Great Paper Boat Launch',
    body: "The Design Lab's fleet sets sail from the Long Pier at noon. Last year a boat made it to the isle twice. Nobody knows how.",
    rotate: -1,
    pin: '#5EC2BC',
  },
];

const WEEKDAY = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface DayPill {
  date: Date;
  dots: string[]; // accent colors
  isToday: boolean;
}

function buildWeek(): DayPill[] {
  const today = new Date();
  const mondayOffset = (today.getDay() + 6) % 7; // Monday = 0
  const monday = new Date(today);
  monday.setDate(today.getDate() - mondayOffset);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dots: string[] = [];
    if (i === 3) dots.push('#F4B942'); // Thursdays — Summer FM
    if (i === 4) dots.push('#FF9B9B'); // Fridays — Seashell Theater
    if (d.getMonth() === 5 && d.getDate() === 1) dots.push('#5EC2BC'); // June 1st — boat launch
    return {
      date: d,
      dots,
      isToday: d.toDateString() === today.toDateString(),
    };
  });
}

export default function TownCalendar() {
  const reduced = useReducedMotion();
  const week = buildWeek();

  return (
    <section className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6 md:py-24" aria-labelledby="calendar-title">
      <div className="grid gap-10 lg:grid-cols-[3fr_2fr] lg:gap-12">
        {/* left — event notes */}
        <div>
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.6, ease: EASE_SQUASH }}
          >
            <p className="text-[0.72rem] font-extrabold uppercase tracking-[0.16em] text-coral">
              Town calendar
            </p>
            <h2
              id="calendar-title"
              className="mt-2 font-display text-[clamp(2rem,4vw,3.5rem)] font-semibold leading-[1.05] text-ink"
            >
              Pinned to the board
            </h2>
          </motion.div>

          <div className="mt-9 space-y-7">
            {EVENTS.map((e, i) => (
              <motion.div
                key={e.title}
                initial={reduced ? { opacity: 0 } : { y: -50, rotate: e.rotate + 10, opacity: 0 }}
                whileInView={reduced ? { opacity: 1 } : { y: 0, rotate: e.rotate, opacity: 1 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={
                  reduced
                    ? { delay: i * 0.08, duration: 0.4 }
                    : { delay: i * 0.15, duration: 0.5, ease: EASE_BACK_2 }
                }
                whileHover={reduced ? undefined : { rotate: 0, scale: 1.03, transition: { duration: 0.3, ease: EASE_SQUASH } }}
                className="group"
              >
                <PaperNote pinColor={e.pin} className="transition-transform duration-300">
                  <div className="flex flex-wrap items-baseline gap-x-3">
                    <span
                      className="rounded-full px-2.5 py-0.5 text-[0.66rem] font-extrabold uppercase tracking-[0.14em] text-ink"
                      style={{ background: `${e.pin}66` }}
                    >
                      {e.when}
                    </span>
                    <h3 className="font-display text-[1.2rem] font-semibold leading-tight text-ink">
                      {e.title}
                    </h3>
                  </div>
                  <p className="mt-2.5 font-hand text-[1.35rem] leading-[1.25] text-ink-soft">{e.body}</p>
                </PaperNote>
              </motion.div>
            ))}
          </div>
        </div>

        {/* right — this week at a glance */}
        <motion.aside
          initial={reduced ? { opacity: 0 } : { x: 60, opacity: 0 }}
          whileInView={reduced ? { opacity: 1 } : { x: 0, opacity: 1 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, ease: EASE_SQUASH }}
          className="lg:pt-[104px]"
        >
          <div className="sticker-card relative p-6">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-lagoon/60 text-ink">
                <CalendarDays className="h-4 w-4" />
              </span>
              <h3 className="font-display text-xl font-semibold text-ink">This week at a glance</h3>
            </div>

            {/* 7 day-pills */}
            <div className="mt-5 grid grid-cols-7 gap-1.5">
              {week.map((d, i) => (
                <motion.div
                  key={d.date.toISOString()}
                  initial={reduced ? { opacity: 0 } : { scale: 0, opacity: 0 }}
                  whileInView={reduced ? { opacity: 1 } : { scale: 1, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.25 + i * 0.04, duration: 0.35, ease: EASE_BACK_2 }}
                  className={cn(
                    'relative flex flex-col items-center gap-1.5 rounded-2xl border-2 py-2.5',
                    d.isToday ? 'border-white bg-butter shadow-pop' : 'border-ink/10 bg-white/50',
                  )}
                >
                  {d.isToday && (
                    <span
                      className="ambient absolute inset-0 rounded-2xl border-2 border-butter"
                      style={{ animation: 'st-wave-pulse 2s ease-out infinite' }}
                      aria-hidden
                    />
                  )}
                  <span className="text-[0.58rem] font-extrabold uppercase tracking-[0.1em] text-ink-soft">
                    {WEEKDAY[i]}
                  </span>
                  <span className="font-display text-base font-semibold leading-none text-ink">
                    {d.date.getDate()}
                  </span>
                  <span className="flex h-2.5 items-center gap-1">
                    {d.dots.map((c) => (
                      <span
                        key={c}
                        className="h-2 w-2 rounded-full border border-white"
                        style={{ background: c }}
                      />
                    ))}
                  </span>
                </motion.div>
              ))}
            </div>

            <p className="mt-4 text-[0.7rem] font-bold uppercase tracking-[0.12em] text-ink-soft">
              <span className="mr-2 inline-block h-2 w-2 rounded-full" style={{ background: '#F4B942' }} />
              Thu · requests
              <span className="mx-2 inline-block h-2 w-2 rounded-full" style={{ background: '#FF9B9B' }} />
              Fri · theater
              <span className="mx-2 inline-block h-2 w-2 rounded-full" style={{ background: '#5EC2BC' }} />
              Jun 1 · boats
            </p>

            {/* weather doodle */}
            <div className="mt-5 flex items-center gap-3 rounded-2xl border-2 border-dashed border-ink/15 bg-cream/70 px-4 py-3">
              <span className="text-lagoon">
                <Wind className="h-6 w-6" />
              </span>
              <p className="font-hand text-[1.35rem] leading-[1.1] text-ink">
                forecast: breezy, bell-adjacent
              </p>
            </div>
          </div>
        </motion.aside>
      </div>
    </section>
  );
}
