import { useEffect, useState } from 'react';

/** Live-updating prefers-reduced-motion flag. */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

/** design.md signature easings (typed tuples for framer-motion) */
export const SQUASH = [0.22, 1.2, 0.36, 1] as [number, number, number, number];
export const BACK_OUT = [0.34, 1.56, 0.64, 1] as [number, number, number, number];
