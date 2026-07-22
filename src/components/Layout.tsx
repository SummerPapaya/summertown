import { useEffect } from 'react';
import type { ReactNode } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Navbar from './Navbar';
import Footer from './Footer';

gsap.registerPlugin(ScrollTrigger);

/** Layout owns the offset for the fixed overlay navbar (react-dev.md contract). */
export const NAV_OFFSET = 88;

function useSmoothScroll() {
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;
    const lenis = new Lenis({ lerp: 0.09 });
    lenis.on('scroll', ScrollTrigger.update);
    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(raf);
      lenis.destroy();
    };
  }, []);
}

export default function Layout({ children }: { children: ReactNode }) {
  useSmoothScroll();
  return (
    <div className="relative min-h-[100dvh] bg-cream">
      <Navbar />
      <main style={{ paddingTop: NAV_OFFSET }}>{children}</main>
      <Footer />
    </div>
  );
}
