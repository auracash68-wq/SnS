import { FoodItem, FoodKind } from '../types/game';
import { GRID_COLS, GRID_ROWS, SnakeEngine } from './snakeEngine';

const FOOD_COLORS: Record<FoodKind, { core: string; glow: string; ring: string }> = {
  NORMAL: { core: '#FB7185', glow: 'rgba(251, 113, 133, 0.48)', ring: '#FFE4E6' },
  BONUS: { core: '#FBBF24', glow: 'rgba(251, 191, 36, 0.55)', ring: '#FEF3C7' },
  SPEED_BOOST: { core: '#22D3EE', glow: 'rgba(34, 211, 238, 0.55)', ring: '#CFFAFE' },
  SLOW_MOTION: { core: '#A78BFA', glow: 'rgba(167, 139, 250, 0.55)', ring: '#EDE9FE' },
  MULTIPLIER: { core: '#F472B6', glow: 'rgba(244, 114, 182, 0.55)', ring: '#FCE7F3' },
};

export function renderSnakeArena(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  engine: SnakeEngine,
  alpha: number,
  now: number,
  reducedMotion: boolean
): void {
  const cell = Math.min(width / GRID_COLS, height / GRID_ROWS);
  const boardW = cell * GRID_COLS;
  const boardH = cell * GRID_ROWS;
  const offsetX = (width - boardW) * 0.5;
  const offsetY = (height - boardH) * 0.5;

  ctx.save();
  ctx.clearRect(0, 0, width, height);

  // Subtle screen shake on bonus/crash
  if (!reducedMotion && engine.shakeTimeMs > 0) {
    const mag = engine.shakeIntensity * (engine.shakeTimeMs / 260);
    const sx = (Math.random() - 0.5) * mag * 2;
    const sy = (Math.random() - 0.5) * mag * 2;
    ctx.translate(sx, sy);
  }

  // Arena backdrop
  const bgGrad = ctx.createLinearGradient(0, offsetY, 0, offsetY + boardH);
  bgGrad.addColorStop(0, '#0B1220');
  bgGrad.addColorStop(1, '#080D18');
  ctx.fillStyle = bgGrad;
  ctx.beginPath();
  ctx.roundRect(offsetX, offsetY, boardW, boardH, 12);
  ctx.fill();

  // Subtle ambient center radial glow
  const hasSpeed = engine.activePowerUps.some((p) => p.type === 'SPEED_BOOST');
  const hasSlow = engine.activePowerUps.some((p) => p.type === 'SLOW_MOTION');
  const hasMult = engine.activePowerUps.some((p) => p.type === 'MULTIPLIER');
  const ambientTint = hasSpeed
    ? 'rgba(34, 211, 238, 0.06)'
    : hasSlow
      ? 'rgba(167, 139, 250, 0.06)'
      : hasMult
        ? 'rgba(244, 114, 182, 0.06)'
        : 'rgba(34, 197, 94, 0.045)';

  const radial = ctx.createRadialGradient(
    offsetX + boardW * 0.5,
    offsetY + boardH * 0.45,
    cell * 1.5,
    offsetX + boardW * 0.5,
    offsetY + boardH * 0.5,
    boardW * 0.72
  );
  radial.addColorStop(0, ambientTint);
  radial.addColorStop(1, 'rgba(8, 13, 24, 0)');
  ctx.fillStyle = radial;
  ctx.fillRect(offsetX, offsetY, boardW, boardH);

  // Subtle checkerboard + crisp hairline grid
  ctx.fillStyle = 'rgba(255, 255, 255, 0.015)';
  for (let y = 0; y < GRID_ROWS; y++) {
    for (let x = 0; x < GRID_COLS; x++) {
      if ((x + y) % 2 === 0) {
        ctx.fillRect(offsetX + x * cell, offsetY + y * cell, cell, cell);
      }
    }
  }

  ctx.strokeStyle = 'rgba(148, 163, 184, 0.065)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 1; x < GRID_COLS; x++) {
    const px = Math.round(offsetX + x * cell) + 0.5;
    ctx.moveTo(px, offsetY);
    ctx.lineTo(px, offsetY + boardH);
  }
  for (let y = 1; y < GRID_ROWS; y++) {
    const py = Math.round(offsetY + y * cell) + 0.5;
    ctx.moveTo(offsetX, py);
    ctx.lineTo(offsetX + boardW, py);
  }
  ctx.stroke();

  const hasShield = now < engine.safetyShieldExpiresAt;
  const hasGrace = now < engine.reviveInvulnerableExpiresAt;

  // Arena perimeter border
  ctx.strokeStyle =
    engine.phase === 'GAME_OVER'
      ? 'rgba(239, 68, 68, 0.65)'
      : hasShield
        ? 'rgba(250, 204, 21, 0.75)'
        : hasGrace
          ? 'rgba(56, 189, 248, 0.65)'
          : hasSpeed
            ? 'rgba(34, 211, 238, 0.45)'
            : hasSlow
              ? 'rgba(167, 139, 250, 0.45)'
              : 'rgba(52, 211, 153, 0.28)';
  ctx.lineWidth = hasShield ? 2.5 : 1.5;
  ctx.beginPath();
  ctx.roundRect(offsetX + 0.75, offsetY + 0.75, boardW - 1.5, boardH - 1.5, 12);
  ctx.stroke();

  // Render food items
  for (const food of engine.foods) {
    drawFood(ctx, food, offsetX, offsetY, cell, now, reducedMotion);
  }

  // Render interpolated snake
  drawSnake(ctx, engine, offsetX, offsetY, cell, alpha, now, hasSpeed, hasMult);

  // Render particles
  for (const p of engine.particles) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.alpha);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(
      offsetX + p.x * cell,
      offsetY + p.y * cell,
      Math.max(1.5, p.radius * cell),
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.restore();
  }

  // Render floating score popups
  for (const ft of engine.floatingTexts) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, ft.alpha);
    ctx.font = `700 ${Math.round(cell * 0.58)}px "JetBrains Mono", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const tx = offsetX + ft.x * cell;
    const ty = offsetY + ft.y * cell;
    ctx.fillStyle = 'rgba(5, 8, 15, 0.85)';
    ctx.fillText(ft.text, tx + 1, ty + 1.5);
    ctx.fillStyle = ft.color;
    ctx.fillText(ft.text, tx, ty);
    ctx.restore();
  }

  // Render tap/swipe directional feedback ripples
  for (const ti of engine.tapIndicators) {
    const cx = offsetX + ti.x * cell;
    const cy = offsetY + ti.y * cell;
    const expand = 1 + (1 - ti.alpha) * 1.1;
    ctx.save();
    ctx.globalAlpha = Math.max(0, ti.alpha * 0.65);
    ctx.strokeStyle = '#4ADE80';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(cx, cy, cell * 0.45 * expand, 0, Math.PI * 2);
    ctx.stroke();

    // Small directional chevron inside ripple
    ctx.translate(cx, cy);
    const angle =
      ti.direction === 'RIGHT'
        ? 0
        : ti.direction === 'DOWN'
          ? Math.PI / 2
          : ti.direction === 'LEFT'
            ? Math.PI
            : -Math.PI / 2;
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(-cell * 0.12, -cell * 0.16);
    ctx.lineTo(cell * 0.14, 0);
    ctx.lineTo(-cell * 0.12, cell * 0.16);
    ctx.stroke();
    ctx.restore();
  }

  // Screen flash overlay
  if (engine.flashAlpha > 0.01) {
    ctx.save();
    ctx.globalAlpha = engine.flashAlpha;
    ctx.fillStyle = engine.flashColor;
    ctx.beginPath();
    ctx.roundRect(offsetX, offsetY, boardW, boardH, 12);
    ctx.fill();
    ctx.restore();
  }

  ctx.restore();
}

function drawFood(
  ctx: CanvasRenderingContext2D,
  food: FoodItem,
  offsetX: number,
  offsetY: number,
  cell: number,
  now: number,
  reducedMotion: boolean
): void {
  const palette = FOOD_COLORS[food.kind];
  const cx = offsetX + (food.x + 0.5) * cell;
  const cy = offsetY + (food.y + 0.5) * cell;
  const pulse = reducedMotion ? 1 : 1 + Math.sin(now * 0.007 + food.id) * 0.1;

  // Remaining time fade/blink for special items
  let remainingRatio = 1;
  let blinkAlpha = 1;
  if (food.expiresAt !== null) {
    const total = food.expiresAt - food.spawnedAt;
    const left = Math.max(0, food.expiresAt - now);
    remainingRatio = total > 0 ? left / total : 0;
    if (left < 2400 && !reducedMotion) {
      blinkAlpha = 0.55 + Math.abs(Math.sin(now * 0.016)) * 0.45;
    }
  }

  ctx.save();
  ctx.globalAlpha = blinkAlpha;

  // Outer soft glow
  const glowRadius = cell * 0.62 * pulse;
  const glow = ctx.createRadialGradient(cx, cy, cell * 0.08, cx, cy, glowRadius);
  glow.addColorStop(0, palette.glow);
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, glowRadius, 0, Math.PI * 2);
  ctx.fill();

  // Countdown arc for timed special items
  if (food.expiresAt !== null) {
    ctx.strokeStyle = palette.core;
    ctx.lineWidth = Math.max(1.5, cell * 0.09);
    ctx.beginPath();
    ctx.arc(
      cx,
      cy,
      cell * 0.43,
      -Math.PI / 2,
      -Math.PI / 2 + Math.PI * 2 * remainingRatio
    );
    ctx.stroke();
  }

  const r = cell * (food.kind === 'NORMAL' ? 0.31 : 0.33) * pulse;

  if (food.kind === 'NORMAL') {
    // Glossy arcade energy apple orb
    const orbGrad = ctx.createRadialGradient(
      cx - r * 0.3,
      cy - r * 0.3,
      r * 0.1,
      cx,
      cy,
      r
    );
    orbGrad.addColorStop(0, '#FFE4E6');
    orbGrad.addColorStop(0.35, '#FB7185');
    orbGrad.addColorStop(1, '#E11D48');
    ctx.fillStyle = orbGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    // Little leaf/stem accent
    ctx.strokeStyle = '#4ADE80';
    ctx.lineWidth = Math.max(1.5, cell * 0.08);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx, cy - r * 0.85);
    ctx.quadraticCurveTo(cx + r * 0.35, cy - r * 1.25, cx + r * 0.55, cy - r * 0.95);
    ctx.stroke();
  } else if (food.kind === 'BONUS') {
    // Rotating golden diamond star
    ctx.translate(cx, cy);
    if (!reducedMotion) {
      ctx.rotate(now * 0.0025);
    }
    ctx.fillStyle = '#FBBF24';
    ctx.beginPath();
    const spikes = 4;
    for (let i = 0; i < spikes * 2; i++) {
      const rad = i % 2 === 0 ? r * 1.15 : r * 0.48;
      const a = (i * Math.PI) / spikes;
      if (i === 0) ctx.moveTo(Math.cos(a) * rad, Math.sin(a) * rad);
      else ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#FEF3C7';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.32, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Power-up badge orb with crisp inner glyph
    ctx.fillStyle = palette.core;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#070B12';
    ctx.font = `800 ${Math.round(cell * 0.34)}px "Outfit", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const glyph =
      food.kind === 'SPEED_BOOST'
        ? '⚡'
        : food.kind === 'SLOW_MOTION'
          ? '⧖'
          : '2×';
    ctx.fillText(glyph, cx, cy + 0.5);
  }

  ctx.restore();
}

function drawSnake(
  ctx: CanvasRenderingContext2D,
  engine: SnakeEngine,
  offsetX: number,
  offsetY: number,
  cell: number,
  alpha: number,
  now: number,
  hasSpeed: boolean,
  hasMult: boolean
): void {
  const len = engine.snake.length;
  if (len === 0) return;

  // Interpolate segment center points (snap cleanly when wrapping across edges under shield)
  const pts: { x: number; y: number; wrapped: boolean }[] = new Array(len);
  const t = engine.phase === 'ACTIVE' ? alpha : 1;

  for (let i = 0; i < len; i++) {
    const curr = engine.snake[i];
    const prev = engine.prevSnake[i] ?? curr;
    const dx = Math.abs(curr.x - prev.x);
    const dy = Math.abs(curr.y - prev.y);
    const wrapped = dx > 1 || dy > 1;
    const ix = wrapped ? curr.x : prev.x + (curr.x - prev.x) * t;
    const iy = wrapped ? curr.y : prev.y + (curr.y - prev.y) * t;
    pts[i] = {
      x: offsetX + (ix + 0.5) * cell,
      y: offsetY + (iy + 0.5) * cell,
      wrapped,
    };
  }

  const hasShield = now < engine.safetyShieldExpiresAt;
  const hasGrace = now < engine.reviveInvulnerableExpiresAt;
  const graceBlink = hasGrace && !hasShield ? 0.6 + 0.4 * Math.abs(Math.sin(now * 0.018)) : 1;

  const headColor =
    engine.phase === 'GAME_OVER'
      ? '#EF4444'
      : hasShield
        ? '#FACC15'
        : hasSpeed
          ? '#22D3EE'
          : hasMult
            ? '#F472B6'
            : '#4ADE80';

  const bodyStart =
    engine.phase === 'GAME_OVER'
      ? '#DC2626'
      : hasShield
        ? '#EAB308'
        : hasSpeed
          ? '#06B6D4'
          : '#22C55E';

  const bodyEnd =
    engine.phase === 'GAME_OVER'
      ? '#7F1D1D'
      : hasShield
        ? '#CA8A04'
        : hasSpeed
          ? '#0E7490'
          : '#15803D';

  ctx.save();
  ctx.globalAlpha = graceBlink;

  // Soft neon under-glow along snake spine (skipping wrap jumps)
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle =
    engine.phase === 'GAME_OVER'
      ? 'rgba(239, 68, 68, 0.22)'
      : hasShield
        ? 'rgba(250, 204, 21, 0.34)'
        : hasSpeed
          ? 'rgba(34, 211, 238, 0.25)'
          : 'rgba(74, 222, 128, 0.22)';
  ctx.lineWidth = hasShield ? cell * 1.12 : cell * 0.92;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < len; i++) {
    const dist = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    if (dist > cell * 2.2) {
      ctx.moveTo(pts[i].x, pts[i].y);
    } else {
      ctx.lineTo(pts[i].x, pts[i].y);
    }
  }
  ctx.stroke();
  ctx.restore();

  // Tapered rounded segments from tail to head
  for (let i = len - 1; i >= 1; i--) {
    const ratio = i / Math.max(1, len - 1);
    const radius = cell * (0.41 - ratio * 0.12);
    const p = pts[i];
    const prevP = pts[i - 1];
    const dist = Math.hypot(p.x - prevP.x, p.y - prevP.y);

    if (dist <= cell * 2.2) {
      // Bridge capsule between adjacent segments so turns are seamless
      ctx.strokeStyle = i < 3 ? bodyStart : lerpHex(bodyStart, bodyEnd, ratio);
      ctx.lineWidth = radius * 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(prevP.x, prevP.y);
      ctx.stroke();
    } else {
      ctx.fillStyle = i < 3 ? bodyStart : lerpHex(bodyStart, bodyEnd, ratio);
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Subtle scale highlight every 2nd segment
    if (i % 2 === 0) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius * 0.36, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Expressive Snake Head
  const head = pts[0];
  const headRadius = cell * 0.45;
  ctx.save();
  ctx.translate(head.x, head.y);

  let angle = 0;
  if (engine.direction === 'RIGHT') angle = 0;
  else if (engine.direction === 'DOWN') angle = Math.PI / 2;
  else if (engine.direction === 'LEFT') angle = Math.PI;
  else angle = -Math.PI / 2;
  ctx.rotate(angle);

  // Subtle forked tongue flick when active
  if (engine.phase === 'ACTIVE' && Math.sin(now * 0.012) > 0.35) {
    ctx.strokeStyle = '#FB7185';
    ctx.lineWidth = Math.max(1.2, cell * 0.065);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(headRadius * 0.85, 0);
    ctx.lineTo(headRadius * 1.28, 0);
    ctx.lineTo(headRadius * 1.48, -headRadius * 0.2);
    ctx.moveTo(headRadius * 1.28, 0);
    ctx.lineTo(headRadius * 1.48, headRadius * 0.2);
    ctx.stroke();
  }

  // Head silhouette
  ctx.fillStyle = headColor;
  ctx.beginPath();
  ctx.roundRect(
    -headRadius * 0.92,
    -headRadius * 0.9,
    headRadius * 1.92,
    headRadius * 1.8,
    headRadius * 0.72
  );
  ctx.fill();

  // Head specular highlight
  ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.beginPath();
  ctx.ellipse(
    -headRadius * 0.1,
    -headRadius * 0.28,
    headRadius * 0.45,
    headRadius * 0.22,
    0,
    0,
    Math.PI * 2
  );
  ctx.fill();

  // Eyes
  const eyeX = headRadius * 0.32;
  const eyeY = headRadius * 0.42;
  const eyeR = headRadius * 0.24;

  ctx.fillStyle = '#F8FAFC';
  ctx.beginPath();
  ctx.arc(eyeX, -eyeY, eyeR, 0, Math.PI * 2);
  ctx.arc(eyeX, eyeY, eyeR, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#05080F';
  const pupilR = eyeR * 0.58;
  ctx.beginPath();
  ctx.arc(eyeX + eyeR * 0.2, -eyeY, pupilR, 0, Math.PI * 2);
  ctx.arc(eyeX + eyeR * 0.2, eyeY, pupilR, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
  ctx.restore();
}

function lerpHex(hexA: string, hexB: string, t: number): string {
  const a = parseInt(hexA.slice(1), 16);
  const b = parseInt(hexB.slice(1), 16);
  const rA = (a >> 16) & 255;
  const gA = (a >> 8) & 255;
  const bA = a & 255;
  const rB = (b >> 16) & 255;
  const gB = (b >> 8) & 255;
  const bB = b & 255;
  const r = Math.round(rA + (rB - rA) * t);
  const g = Math.round(gA + (gB - gA) * t);
  const bl = Math.round(bA + (bB - bA) * t);
  return `rgb(${r}, ${g}, ${bl})`;
}
