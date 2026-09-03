import { useEffect } from 'react';
import { useLocation } from 'react-router';
import BulletinHero from '@/components/journal/BulletinHero';
import Passport from '@/components/journal/Passport';
import TownCalendar from '@/components/journal/TownCalendar';
import PostcardWall from '@/components/journal/PostcardWall';
import ClosingStrip from '@/components/journal/ClosingStrip';
import { scrollToElement } from '@/lib/smoothScroll';

/**
 * The Summer Town Journal (/journal) — journal.md:
 * bulletin-board hero · filterable passport index · town calendar ·
 * postcard wall · closing strip. Full-bleed hero opts out of the Layout
 * nav offset (react-dev.md contract).
 */
export default function Journal() {
  const { hash } = useLocation();

  useEffect(() => {
    const id = hash.replace(/^#/, '');
    if (!id) return;
    const jump = () => {
      const el = document.getElementById(id);
      if (el) scrollToElement(el);
    };
    jump();
    const t = window.setTimeout(jump, 120);
    return () => window.clearTimeout(t);
  }, [hash]);

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
