import { useEffect, useRef } from 'react';

/* SparkleTrail — tiny 4-point sparkles pouring out of the cursor wand's star.
   Trail on pointer move, burst on click. Honors prefers-reduced-motion. */

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
};

const COLORS = ['#FFE742', '#FFFFFF', '#FFD3EA', '#B8F0D8', '#CDE7FF', '#FFE742'];

export default function SparkleTrail() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0;
    let h = 0;
    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const parts: Particle[] = [];
    const spawn = (x: number, y: number, n: number, burst: boolean) => {
      for (let i = 0; i < n; i++) {
        if (parts.length > 140) parts.shift();
        const a = Math.random() * Math.PI * 2;
        const sp = burst ? 1.6 + Math.random() * 3.2 : 0.2 + Math.random() * 0.9;
        parts.push({
          x: x + (Math.random() - 0.5) * 6,
          y: y + (Math.random() - 0.5) * 4,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp - (burst ? 1.3 : 0.55),
          rot: Math.random() * Math.PI,
          vr: (Math.random() - 0.5) * 0.25,
          size: 1.6 + Math.random() * (burst ? 4.4 : 3.2),
          color: COLORS[(Math.random() * COLORS.length) | 0],
          life: 0,
          maxLife: 480 + Math.random() * 460,
        });
      }
    };

    let lx = -1;
    let ly = -1;
    let raf = 0;
    let last = performance.now();

    const drawStar = (p: Particle, alpha: number) => {
      const r = p.size * (1 - (p.life / p.maxLife) * 0.4);
      const k = 0.28;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.moveTo(0, -r);
      ctx.lineTo(r * k, -r * k);
      ctx.lineTo(r, 0);
      ctx.lineTo(r * k, r * k);
      ctx.lineTo(0, r);
      ctx.lineTo(-r * k, r * k);
      ctx.lineTo(-r, 0);
      ctx.lineTo(-r * k, -r * k);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };

    const tick = (now: number) => {
      const dt = Math.min(now - last, 50);
      last = now;
      ctx.clearRect(0, 0, w, h);
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.life += dt;
        if (p.life >= p.maxLife) {
          parts.splice(i, 1);
          continue;
        }
        const step = dt / 16.7;
        p.vy += 0.045 * step; // gentle gravity — sparkles pour downward
        p.vx *= 0.985;
        p.vy *= 0.99;
        p.x += p.vx * step;
        p.y += p.vy * step;
        p.rot += p.vr * step;
        const t = p.life / p.maxLife;
        const alpha = t < 0.15 ? t / 0.15 : 1 - (t - 0.15) / 0.85;
        drawStar(p, alpha * 0.95);
      }
      raf = parts.length ? requestAnimationFrame(tick) : 0;
    };
    const kick = () => {
      if (!raf) {
        last = performance.now();
        raf = requestAnimationFrame(tick);
      }
    };

    const onMove = (e: PointerEvent) => {
      if (lx < 0 || Math.hypot(e.clientX - lx, e.clientY - ly) > 14) {
        spawn(e.clientX, e.clientY, 2, false);
        lx = e.clientX;
        ly = e.clientY;
        kick();
      }
    };
    const onDown = (e: PointerEvent) => {
      spawn(e.clientX, e.clientY, 14, true);
      kick();
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });
    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return <canvas ref={ref} aria-hidden className="pointer-events-none fixed inset-0 z-[9999]" />;
}
