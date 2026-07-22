import Hero from '@/components/visit/Hero';
import FerryTimetable from '@/components/visit/FerryTimetable';
import WhereToStay from '@/components/visit/WhereToStay';
import Etiquette from '@/components/visit/Etiquette';
import PackingList from '@/components/visit/PackingList';
import Postcards from '@/components/visit/Postcards';
import '@/components/visit/visit.css';

/**
 * Plan Your Visit (/visit) — design/visit.md
 * §1 ferry hero · §2 tide-time timetable · §3 where to stay ·
 * §4 town etiquette · §5 packing list · §6 postcards & colophon.
 * Layout owns the fixed-nav offset; the hero opts out with -mt-[88px].
 */
export default function Visit() {
  return (
    <>
      <Hero />
      <FerryTimetable />
      <WhereToStay />
      <Etiquette />
      <PackingList />
      <Postcards />
    </>
  );
}
