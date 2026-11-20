import { useEffect, useRef } from 'react';

export function MenuHeroCanvas({ reducedMotion }: { reducedMotion: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    let width = 0;
    let height = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener('resize', resize);

    const draw = (now: number) => {
      const t = reducedMotion ? 0 : now * 0.0014;
      ctx.clearRect(0, 0, width, height);

      // Subtle dark grid backdrop inside hero banner
      const step = 22;
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.07)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = step; x < width; x += step) {
        ctx.moveTo(x + 0.5, 0);
        ctx.lineTo(x + 0.5, height);
      }
      for (let y = step; y < height; y += step) {
        ctx.moveTo(0, y + 0.5);
        ctx.lineTo(width, y + 0.5);
      }
      ctx.stroke();

      // Target glowing food orb at right side
      const foodX = width * 0.8;
      const foodY = height * 0.5 + Math.sin(t * 2.1) * 4;
      const foodGlow = ctx.createRadialGradient(foodX, foodY, 2, foodX, foodY, 24);
      foodGlow.addColorStop(0, 'rgba(251, 113, 133, 0.5)');
      foodGlow.addColorStop(1, 'rgba(251, 113, 133, 0)');
      ctx.fillStyle = foodGlow;
      ctx.beginPath();
      ctx.arc(foodX, foodY, 24, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#FB7185';
      ctx.beginPath();
      ctx.arc(foodX, foodY, 7.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFE4E6';
      ctx.beginPath();
      ctx.arc(foodX - 2, foodY - 2, 2.2, 0, Math.PI * 2);
      ctx.fill();

      // Animated gliding neon snake illustration
      const segments = 16;
      const startX = width * 0.14;
      const endX = width * 0.66;
      const midY = height * 0.52;
      const pts: { x: number; y: number }[] = [];

      for (let i = 0; i < segments; i++) {
        const ratio = i / (segments - 1);
        const x = startX + (endX - startX) * ratio;
        const wave = Math.sin(ratio * 4.5 - t * 2.6) * (height * 0.22);
        pts.push({ x, y: midY + wave });
      }

      // Soft glow path
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(74, 222, 128, 0.2)';
      ctx.lineWidth = 22;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i].x, pts[i].y);
      }
      ctx.stroke();
      ctx.restore();

      // Tapered green body
      for (let i = 0; i < pts.length - 1; i++) {
        const ratio = i / (pts.length - 1);
        const radius = 5.5 + ratio * 4.5;
        ctx.strokeStyle = i > pts.length - 5 ? '#22C55E' : '#16A34A';
        ctx.lineWidth = radius * 2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(pts[i].x, pts[i].y);
        ctx.lineTo(pts[i + 1].x, pts[i + 1].y);
        ctx.stroke();

        if (i % 2 === 0) {
          ctx.fillStyle = 'rgba(255,255,255,0.16)';
          ctx.beginPath();
          ctx.arc(pts[i].x, pts[i].y, radius * 0.35, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Snake head at last point
      const head = pts[pts.length - 1];
      const neck = pts[pts.length - 2];
      const angle = Math.atan2(head.y - neck.y, head.x - neck.x);

      ctx.save();
      ctx.translate(head.x, head.y);
      ctx.rotate(angle);

      // Forked tongue
      if (reducedMotion || Math.sin(t * 3.5) > 0.1) {
        ctx.strokeStyle = '#FB7185';
        ctx.lineWidth = 1.6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(9, 0);
        ctx.lineTo(17, 0);
        ctx.lineTo(20, -3);
        ctx.moveTo(17, 0);
        ctx.lineTo(20, 3);
        ctx.stroke();
      }

      ctx.fillStyle = '#4ADE80';
      ctx.beginPath();
      ctx.roundRect(-10, -10, 22, 20, 8);
      ctx.fill();

      // Eyes
      ctx.fillStyle = '#F8FAFC';
      ctx.beginPath();
      ctx.arc(4, -5, 3, 0, Math.PI * 2);
      ctx.arc(4, 5, 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#05080F';
      ctx.beginPath();
      ctx.arc(5.2, -5, 1.6, 0, Math.PI * 2);
      ctx.arc(5.2, 5, 1.6, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      if (!reducedMotion) {
        rafId = requestAnimationFrame(draw);
      }
    };

    rafId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
    };
  }, [reducedMotion]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="w-full h-28 rounded-xl bg-[#090F1A] border border-slate-800/80"
    />
  );
}
