import { useEffect } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

let smoothScroll: Lenis | null = null;

export function useSmoothScroll() {
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;
    const lenis = new Lenis({ lerp: 0.09 });
    smoothScroll = lenis;
    lenis.on('scroll', ScrollTrigger.update);
    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(raf);
      if (smoothScroll === lenis) smoothScroll = null;
      lenis.destroy();
    };
  }, []);
}

/** Pause Lenis and lock document overflow so a modal can scroll natively. */
export function usePauseSmoothScroll(paused: boolean) {
  useEffect(() => {
    if (!paused) return;
    const root = document.documentElement;
    const prevOverflow = root.style.overflow;
    root.style.overflow = 'hidden';
    smoothScroll?.stop();
    return () => {
      root.style.overflow = prevOverflow;
      smoothScroll?.start();
    };
  }, [paused]);
}

export function scrollToElement(el: HTMLElement, offset = -100) {
  if (smoothScroll) {
    smoothScroll.scrollTo(el, { offset, immediate: false });
    return;
  }
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
