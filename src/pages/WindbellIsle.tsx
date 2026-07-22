import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import IsleSky from '@/components/isle/IsleSky';
import PierHero from '@/components/isle/PierHero';
import LilyMeadow from '@/components/isle/LilyMeadow';
import Pavilion from '@/components/isle/Pavilion';
import SunsetPoint from '@/components/isle/SunsetPoint';
import LighthouseClimb from '@/components/isle/LighthouseClimb';
import Closing from '@/components/isle/Closing';
import { IsleStyles } from '@/components/isle/shared';

gsap.registerPlugin(ScrollTrigger);

/**
 * /windbell-isle — a scroll-driven journey:
 * cross the Long Pier → lily meadow → windbell pavilion → sunset → lighthouse.
 * The page sky eases Day → Starlight as you descend (see IsleSky).
 */
export default function WindbellIsle() {
  const arrivalRef = useRef<HTMLElement>(null);
  const sunsetRef = useRef<HTMLElement>(null);
  const climbRef = useRef<HTMLElement>(null);

  /* start the walk at the town end of the pier */
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  /* re-measure pins once images/fonts have settled */
  useEffect(() => {
    const onLoad = () => ScrollTrigger.refresh();
    window.addEventListener('load', onLoad);
    const t = window.setTimeout(() => ScrollTrigger.refresh(), 700);
    return () => {
      window.removeEventListener('load', onLoad);
      window.clearTimeout(t);
    };
  }, []);

  return (
    <div className="relative -mt-[88px]">
      {/* full-bleed hero opts out of the Layout nav offset */}
      <IsleStyles />
      <IsleSky arrivalRef={arrivalRef} sunsetRef={sunsetRef} climbRef={climbRef} />
      <div className="relative z-10">
        <PierHero />
        <LilyMeadow sectionRef={arrivalRef} />
        <Pavilion />
        <SunsetPoint sectionRef={sunsetRef} />
        <LighthouseClimb sectionRef={climbRef} />
        <Closing />
      </div>
    </div>
  );
}
