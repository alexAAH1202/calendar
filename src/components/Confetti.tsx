import { useEffect, useRef } from 'react';

/**
 * A short burst of confetti that drifts down over its parent, then stops by itself.
 * Soft colours, no flashing; pointer events pass through. Not shown when the device asks for reduced motion.
 */
export function Confetti({ colours, onDone, durationMs = 2600 }: { colours: string[]; onDone: () => void; durationMs?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return onDone();
    const { width, height } = canvas.getBoundingClientRect();
    canvas.width = width;
    canvas.height = height;
    const bits = Array.from({ length: 90 }, (_, i) => ({
      x: width / 2 + (Math.random() - 0.5) * width * 0.3,
      y: height * 0.25,
      vx: (Math.random() - 0.5) * 9,
      vy: -Math.random() * 9 - 3,
      size: 7 + Math.random() * 7,
      spin: Math.random() * Math.PI,
      colour: colours[i % colours.length],
    }));
    const start = performance.now();
    let frame = 0;
    const draw = (t: number) => {
      const elapsed = t - start;
      ctx.clearRect(0, 0, width, height);
      ctx.globalAlpha = Math.max(0, 1 - Math.max(0, elapsed - durationMs * 0.6) / (durationMs * 0.4));
      for (const b of bits) {
        b.vy += 0.28;
        b.vx *= 0.99;
        b.x += b.vx;
        b.y += b.vy;
        b.spin += 0.08;
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(b.spin);
        ctx.fillStyle = b.colour;
        ctx.fillRect(-b.size / 2, -b.size / 4, b.size, b.size / 2);
        ctx.restore();
      }
      if (elapsed < durationMs) frame = requestAnimationFrame(draw);
      else onDone();
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [colours, onDone, durationMs]);
  return <canvas ref={ref} className="confetti" aria-hidden="true" />;
}
