import { useEffect, useRef } from 'react';
import { useTown } from '@/lib/town';

interface Particle {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  phase: number;
  hue: number;
}

/**
 * Lightweight canvas particle layer (design.md §8 fallback for R3F):
 * drifting petals/sparkles by day, twinkling stars at starlight.
 */
export default function SparkleField({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { time } = useTown();
  const timeRef = useRef(time);
  timeRef.current = time;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let raf = 0;
    let particles: Particle[] = [];
    let DPR = 1;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      // cap raster size: the world is 2400x1600 and may scale 3x — keep it cheap
      DPR = Math.min(
        window.devicePixelRatio || 1,
        2,
        1600 / Math.max(rect.width, 1),
        1100 / Math.max(rect.height, 1),
      );
      canvas.width = Math.max(1, Math.floor(rect.width * DPR));
      canvas.height = Math.max(1, Math.floor(rect.height * DPR));
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const seed = () => {
      const rect = canvas.getBoundingClientRect();
      const n = timeRef.current === 'starlight' ? 90 : 40;
      particles = Array.from({ length: n }, () => ({
        x: Math.random() * rect.width,
        y: Math.random() * rect.height * 0.7,
        r: 1 + Math.random() * 2.4,
        vx: 0.08 + Math.random() * 0.25,
        vy: 0.04 + Math.random() * 0.14,
        phase: Math.random() * Math.PI * 2,
        hue: Math.random(),
      }));
    };
    seed();

    let t = 0;
    const draw = () => {
      raf = requestAnimationFrame(draw);
      if (document.hidden) return;
      t += 0.016;
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      const starlight = timeRef.current === 'starlight';
      for (const p of particles) {
        if (!reduced) {
          p.x += p.vx;
          p.y += p.vy + Math.sin(t + p.phase) * 0.08;
          if (p.x * DPR > w + 20) p.x = -20 / DPR;
          if (p.y * DPR > h + 20) p.y = -20 / DPR;
        }
        const tw = 0.5 + 0.5 * Math.sin(t * 2 + p.phase);
        ctx.beginPath();
        if (starlight) {
          ctx.fillStyle = `rgba(255, 249, 239, ${0.35 + 0.6 * tw})`;
          ctx.arc(p.x * DPR, p.y * DPR, p.r * DPR * 0.9, 0, Math.PI * 2);
        } else {
          const c = p.hue < 0.4 ? '255, 195, 208' : p.hue < 0.7 ? '255, 221, 148' : '255, 255, 255';
          ctx.fillStyle = `rgba(${c}, ${0.25 + 0.45 * tw})`;
          ctx.ellipse(
            p.x * DPR,
            p.y * DPR,
            p.r * DPR * 1.4,
            p.r * DPR * 0.9,
            p.phase + t,
            0,
            Math.PI * 2,
          );
        }
        ctx.fill();
      }
    };
    raf = requestAnimationFrame(draw);

    const id = window.setInterval(() => {
      if ((canvas.dataset.theme ?? '') !== timeRef.current) {
        canvas.dataset.theme = timeRef.current;
        seed();
      }
    }, 400);

    return () => {
      cancelAnimationFrame(raf);
      window.clearInterval(id);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
      aria-hidden
    />
  );
}
