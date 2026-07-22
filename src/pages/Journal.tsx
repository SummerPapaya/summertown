import BulletinHero from '@/components/journal/BulletinHero';
import Passport from '@/components/journal/Passport';
import TownCalendar from '@/components/journal/TownCalendar';
import PostcardWall from '@/components/journal/PostcardWall';
import ClosingStrip from '@/components/journal/ClosingStrip';

/**
 * The Summer Town Journal (/journal) — journal.md:
 * bulletin-board hero · filterable passport index · town calendar ·
 * postcard wall · closing strip. Full-bleed hero opts out of the Layout
 * nav offset (react-dev.md contract).
 */
export default function Journal() {
  return (
    <div className="-mt-[88px]">
      <BulletinHero />
      <Passport />
      <TownCalendar />
      <PostcardWall />
      <ClosingStrip />
    </div>
  );
}
