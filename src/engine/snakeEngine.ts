import { soundEngine } from '../audio/soundEngine';
import {
  ActivePowerUp,
  Difficulty,
  Direction,
  FloatingText,
  FoodItem,
  FoodKind,
  HudSnapshot,
  Particle,
  PlayPhase,
  Point,
  PowerUpType,
  RunSummary,
} from '../types/game';

export const GRID_COLS = 17;
export const GRID_ROWS = 19;

const DIFFICULTY_CONFIG: Record<
  Difficulty,
  { baseMs: number; minMs: number; stepDropPerFood: number }
> = {
  EASY: { baseMs: 340, minMs: 210, stepDropPerFood: 2.0 },
  NORMAL: { baseMs: 230, minMs: 130, stepDropPerFood: 2.0 },
  HARD: { baseMs: 155, minMs: 88, stepDropPerFood: 1.8 },
};

export interface TapIndicator {
  x: number;
  y: number;
  direction: Direction;
  alpha: number;
}

const OPPOSITE_DIR: Record<Direction, Direction> = {
  UP: 'DOWN',
  DOWN: 'UP',
  LEFT: 'RIGHT',
  RIGHT: 'LEFT',
};

const DIR_DELTA: Record<Direction, Point> = {
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 },
};

export interface EngineCallbacks {
  onHudUpdate: (snapshot: HudSnapshot) => void;
  onGameOver: (summary: RunSummary) => void;
}

export class SnakeEngine {
  public snake: Point[] = [];
  public prevSnake: Point[] = [];
  public direction: Direction = 'UP';
  private directionQueue: Direction[] = [];
  private pendingGrowth = 0;

  public foods: FoodItem[] = [];
  private nextFoodId = 1;
  private specialSpawnCounter = 0;

  public activePowerUps: ActivePowerUp[] = [];
  public particles: Particle[] = [];
  public floatingTexts: FloatingText[] = [];
  public tapIndicators: TapIndicator[] = [];

  public score = 0;
  public bestScore = 0;
  public level = 1;
  public foodCollected = 0;
  public durationMs = 0;
  public phase: PlayPhase = 'ACTIVE';
  public difficulty: Difficulty = 'NORMAL';
  public specialFeatures = true;

  public extraLives = 0;
  public safetyCapsules = 0;
  public safetyShieldExpiresAt = 0;
  public safetyShieldDurationMs = 5000;
  public reviveInvulnerableExpiresAt = 0;

  public shakeTimeMs = 0;
  public shakeIntensity = 0;
  public flashAlpha = 0;
  public flashColor = '#22C55E';

  private accumulatorMs = 0;
  private stepIntervalMs = 230;
  private lastNow = 0;
  private pausedAt: number | null = null;
  private callbacks: EngineCallbacks;

  constructor(callbacks: EngineCallbacks) {
    this.callbacks = callbacks;
  }

  public startNewGame(opts: {
    difficulty: Difficulty;
    specialFeatures: boolean;
    bestScore: number;
  }): void {
    this.difficulty = opts.difficulty;
    this.specialFeatures = opts.specialFeatures;
    this.bestScore = opts.bestScore;

    const startX = Math.floor(GRID_COLS / 2);
    const startY = Math.floor(GRID_ROWS / 2) + 1;

    this.snake = [
      { x: startX, y: startY },
      { x: startX, y: startY + 1 },
      { x: startX, y: startY + 2 },
    ];
    this.prevSnake = this.snake.map((p) => ({ ...p }));
    this.direction = 'UP';
    this.directionQueue = [];
    this.pendingGrowth = 0;

    this.foods = [];
    this.activePowerUps = [];
    this.particles = [];
    this.floatingTexts = [];
    this.tapIndicators = [];
    this.specialSpawnCounter = 0;

    this.score = 0;
    this.level = 1;
    this.foodCollected = 0;
    this.durationMs = 0;
    this.extraLives = 0;
    this.safetyCapsules = 0;
    this.safetyShieldExpiresAt = 0;
    this.reviveInvulnerableExpiresAt = 0;
    this.accumulatorMs = 0;
    this.pausedAt = null;
    this.shakeTimeMs = 0;
    this.shakeIntensity = 0;
    this.flashAlpha = 0;

    this.phase = 'ACTIVE';
    this.lastNow = performance.now();
    this.recomputeStepInterval();

    this.spawnFood('NORMAL', this.lastNow);
    this.emitHud();
  }

  public queueDirection(dir: Direction): void {
    if (this.phase !== 'ACTIVE') return;

    const lastPlanned =
      this.directionQueue.length > 0
        ? this.directionQueue[this.directionQueue.length - 1]
        : this.direction;

    if (dir === lastPlanned || OPPOSITE_DIR[dir] === lastPlanned) {
      return;
    }

    if (this.directionQueue.length < 2) {
      this.directionQueue.push(dir);
      soundEngine.playTurn();
    }
  }

  public pause(): void {
    if (this.phase !== 'ACTIVE') return;
    this.phase = 'PAUSED';
    this.pausedAt = performance.now();
    soundEngine.playPause();
    soundEngine.stopMusicLoop();
    this.emitHud();
  }

  public resume(): void {
    if (this.phase !== 'PAUSED') return;
    const now = performance.now();
    if (this.pausedAt !== null) {
      const pausedDelta = now - this.pausedAt;
      for (const p of this.activePowerUps) {
        p.expiresAt += pausedDelta;
      }
      for (const f of this.foods) {
        if (f.expiresAt !== null) {
          f.expiresAt += pausedDelta;
        }
        f.spawnedAt += pausedDelta;
      }
      if (this.safetyShieldExpiresAt > this.pausedAt) {
        this.safetyShieldExpiresAt += pausedDelta;
      }
      if (this.reviveInvulnerableExpiresAt > this.pausedAt) {
        this.reviveInvulnerableExpiresAt += pausedDelta;
      }
    }
    this.pausedAt = null;
    this.lastNow = now;
    this.phase = 'ACTIVE';
    soundEngine.playResume();
    soundEngine.startMusicLoop();
    this.emitHud();
  }

  /**
   * Continues the current run after a verified Rewarded Video Ad:
   * preserves score/level/length, grants 3 extra lives & 2 Safety Capsules.
   */
  public reviveWithReward(
    extraLives = 3,
    safetyCapsules = 2,
    capsuleDurationMs = 5000
  ): void {
    if (this.phase !== 'GAME_OVER') return;
    const now = performance.now();

    this.extraLives = extraLives;
    this.safetyCapsules = safetyCapsules;
    this.safetyShieldDurationMs = capsuleDurationMs;
    this.safetyShieldExpiresAt = 0;
    this.reviveInvulnerableExpiresAt = now + 2200;

    this.repositionSnakeSafely();
    this.accumulatorMs = 0;
    this.pausedAt = null;
    this.lastNow = now;
    this.phase = 'ACTIVE';
    this.recomputeStepInterval();

    this.flashScreen('#22D3EE', 0.2);
    this.spawnParticles(this.snake[0].x + 0.5, this.snake[0].y + 0.5, '#38BDF8', 22);
    this.spawnFloatingText(
      this.snake[0].x + 0.5,
      Math.max(1.5, this.snake[0].y - 1),
      `REVIVED +${extraLives}♥`,
      '#38BDF8'
    );
    soundEngine.playPowerUp();
    soundEngine.startMusicLoop();
    this.emitHud();
  }

  /**
   * Activates a 5-second Safety Capsule shield:
   * snake cannot die from wall collisions or self-collisions while active.
   */
  public activateSafetyCapsule(): boolean {
    if (this.phase !== 'ACTIVE' || this.safetyCapsules <= 0) {
      return false;
    }
    const now = performance.now();
    this.safetyCapsules -= 1;
    const baseTime = Math.max(now, this.safetyShieldExpiresAt);
    this.safetyShieldExpiresAt = baseTime + this.safetyShieldDurationMs;

    this.flashScreen('#FACC15', 0.18);
    this.spawnParticles(this.snake[0].x + 0.5, this.snake[0].y + 0.5, '#FACC15', 18);
    this.spawnFloatingText(
      this.snake[0].x + 0.5,
      Math.max(1.5, this.snake[0].y - 0.8),
      `SHIELD ${Math.round(this.safetyShieldDurationMs / 1000)}s`,
      '#FACC15'
    );
    soundEngine.playPowerUp();
    this.emitHud();
    return true;
  }

  private repositionSnakeSafely(): void {
    const keepLen = Math.max(3, this.snake.length);
    const centerX = Math.floor(GRID_COLS / 2);
    const centerY = Math.floor(GRID_ROWS / 2);

    const rebuilt: Point[] = [];
    for (let i = 0; i < keepLen; i++) {
      // Lay snake segments gently downward from center, folding safely inside bounds
      const y = Math.min(GRID_ROWS - 2, centerY + i);
      const overflow = centerY + i - (GRID_ROWS - 2);
      const x =
        overflow > 0
          ? Math.max(1, Math.min(GRID_COLS - 2, centerX + (overflow % 2 === 0 ? -1 : 1) * Math.min(overflow, 4)))
          : centerX;
      rebuilt.push({ x, y });
    }

    this.snake = rebuilt;
    this.prevSnake = rebuilt.map((p) => ({ ...p }));
    this.direction = 'UP';
    this.directionQueue = [];
  }

  private consumeExtraLife(now: number): void {
    this.extraLives = Math.max(0, this.extraLives - 1);
    this.reviveInvulnerableExpiresAt = now + 2000;
    this.repositionSnakeSafely();
    this.triggerShake(160, 4.5);
    this.flashScreen('#38BDF8', 0.22);
    this.spawnParticles(this.snake[0].x + 0.5, this.snake[0].y + 0.5, '#38BDF8', 20);
    this.spawnFloatingText(
      this.snake[0].x + 0.5,
      Math.max(1.5, this.snake[0].y - 1),
      `LIFE SAVED (${this.extraLives} LEFT)`,
      '#38BDF8'
    );
    soundEngine.playPowerUp();
    this.emitHud();
  }

  public update(now: number): number {
    const rawDt = now - this.lastNow;
    this.lastNow = now;
    const dt = Math.max(0, Math.min(rawDt, 80));

    this.updateEffects(dt);

    if (this.phase !== 'ACTIVE') {
      return 1;
    }

    this.durationMs += dt;
    this.pruneExpiredItems(now);
    this.recomputeStepInterval();

    this.accumulatorMs += dt;
    while (this.accumulatorMs >= this.stepIntervalMs && this.phase === 'ACTIVE') {
      this.accumulatorMs -= this.stepIntervalMs;
      this.stepSimulation(now);
      this.recomputeStepInterval();
    }

    return this.phase === 'ACTIVE'
      ? Math.min(1, this.accumulatorMs / this.stepIntervalMs)
      : 1;
  }

  private pruneExpiredItems(now: number): void {
    let hudDirty = false;

    const prevPowerCount = this.activePowerUps.length;
    this.activePowerUps = this.activePowerUps.filter((p) => p.expiresAt > now);
    if (this.activePowerUps.length !== prevPowerCount) {
      hudDirty = true;
    }

    this.foods = this.foods.filter((f) => f.expiresAt === null || f.expiresAt > now);

    if (
      this.safetyShieldExpiresAt > 0 &&
      this.safetyShieldExpiresAt <= now
    ) {
      this.safetyShieldExpiresAt = 0;
      hudDirty = true;
    }

    if (hudDirty) {
      this.emitHud();
    }
  }

  public getPlannedDirection(): Direction {
    return this.directionQueue.length > 0
      ? this.directionQueue[this.directionQueue.length - 1]
      : this.direction;
  }

  public spawnTapIndicator(gridX: number, gridY: number, dir: Direction): void {
    this.tapIndicators.push({
      x: Math.max(0.5, Math.min(GRID_COLS - 0.5, gridX)),
      y: Math.max(0.5, Math.min(GRID_ROWS - 0.5, gridY)),
      direction: dir,
      alpha: 0.9,
    });
    if (this.tapIndicators.length > 6) {
      this.tapIndicators.shift();
    }
  }

  private recomputeStepInterval(): void {
    const cfg = DIFFICULTY_CONFIG[this.difficulty];
    let interval = Math.max(
      cfg.minMs,
      cfg.baseMs - this.foodCollected * cfg.stepDropPerFood
    );

    const hasSpeed = this.activePowerUps.some((p) => p.type === 'SPEED_BOOST');
    const hasSlow = this.activePowerUps.some((p) => p.type === 'SLOW_MOTION');

    if (hasSpeed) {
      interval = Math.max(70, interval * 0.76);
    } else if (hasSlow) {
      interval = Math.min(480, interval * 1.55);
    }

    this.stepIntervalMs = interval;
  }

  private stepSimulation(now: number): void {
    this.prevSnake = this.snake.map((p) => ({ ...p }));

    if (this.directionQueue.length > 0) {
      const nextDir = this.directionQueue.shift()!;
      if (OPPOSITE_DIR[nextDir] !== this.direction) {
        this.direction = nextDir;
      }
    }

    const head = this.snake[0];
    const delta = DIR_DELTA[this.direction];
    const nextHead: Point = {
      x: head.x + delta.x,
      y: head.y + delta.y,
    };

    const isProtected =
      now < this.safetyShieldExpiresAt || now < this.reviveInvulnerableExpiresAt;

    // Wall collision check
    if (
      nextHead.x < 0 ||
      nextHead.x >= GRID_COLS ||
      nextHead.y < 0 ||
      nextHead.y >= GRID_ROWS
    ) {
      if (isProtected) {
        nextHead.x = (nextHead.x + GRID_COLS) % GRID_COLS;
        nextHead.y = (nextHead.y + GRID_ROWS) % GRID_ROWS;
      } else if (this.extraLives > 0) {
        this.consumeExtraLife(now);
        return;
      } else {
        this.triggerGameOver('WALL');
        return;
      }
    }

    const eatenIndex = this.foods.findIndex(
      (f) => f.x === nextHead.x && f.y === nextHead.y
    );
    const willGrow = eatenIndex !== -1 || this.pendingGrowth > 0;

    // Self collision check (ignore tail tip if it moves away this tick)
    if (!isProtected) {
      const bodyLimit = willGrow ? this.snake.length : this.snake.length - 1;
      for (let i = 0; i < bodyLimit; i++) {
        if (this.snake[i].x === nextHead.x && this.snake[i].y === nextHead.y) {
          if (this.extraLives > 0) {
            this.consumeExtraLife(now);
            return;
          }
          this.triggerGameOver('SELF');
          return;
        }
      }
    }

    this.snake.unshift(nextHead);
    if (this.pendingGrowth > 0) {
      this.pendingGrowth--;
      // Pad prevSnake tail so interpolation stays anchored
      const lastPrev = this.prevSnake[this.prevSnake.length - 1];
      this.prevSnake.push({ ...lastPrev });
    } else if (eatenIndex === -1) {
      this.snake.pop();
    } else {
      const lastPrev = this.prevSnake[this.prevSnake.length - 1];
      this.prevSnake.push({ ...lastPrev });
    }

    if (eatenIndex !== -1) {
      const eaten = this.foods[eatenIndex];
      this.foods.splice(eatenIndex, 1);
      this.handleFoodCollected(eaten, now);
    }
  }

  private handleFoodCollected(food: FoodItem, now: number): void {
    const hasMultiplier = this.activePowerUps.some((p) => p.type === 'MULTIPLIER');
    const mult = hasMultiplier ? 2 : 1;

    this.foodCollected += 1;
    const prevLevel = this.level;
    this.level = 1 + Math.floor(this.foodCollected / 5);

    let basePoints = 10;
    let color = '#FB7185';
    let label = '';

    switch (food.kind) {
      case 'NORMAL':
        basePoints = 10;
        color = '#FB7185';
        soundEngine.playEatNormal();
        this.spawnFood('NORMAL', now);
        this.maybeSpawnSpecial(now);
        break;

      case 'BONUS':
        basePoints = 35;
        color = '#FBBF24';
        soundEngine.playEatBonus();
        this.triggerShake(120, 3);
        break;

      case 'SPEED_BOOST':
        basePoints = 15;
        color = '#22D3EE';
        label = 'SPEED x1.4';
        this.activatePowerUp('SPEED_BOOST', 'Speed Boost', 6500, now);
        soundEngine.playPowerUp();
        this.flashScreen('#22D3EE', 0.16);
        break;

      case 'SLOW_MOTION':
        basePoints = 15;
        color = '#A78BFA';
        label = 'SLOW MO';
        this.activatePowerUp('SLOW_MOTION', 'Slow Motion', 7500, now);
        soundEngine.playPowerUp();
        this.flashScreen('#A78BFA', 0.16);
        break;

      case 'MULTIPLIER':
        basePoints = 20;
        color = '#F472B6';
        label = '2X SCORE';
        this.activatePowerUp('MULTIPLIER', '2x Multiplier', 10000, now);
        soundEngine.playPowerUp();
        this.flashScreen('#F472B6', 0.18);
        break;
    }

    const earned = basePoints * mult;
    this.score += earned;

    if (this.score > this.bestScore) {
      this.bestScore = this.score;
    }

    const cx = food.x + 0.5;
    const cy = food.y + 0.5;
    this.spawnParticles(cx, cy, color, food.kind === 'NORMAL' ? 12 : 20);
    this.spawnFloatingText(
      cx,
      cy - 0.3,
      label ? `+${earned} ${label}` : `+${earned}`,
      color
    );

    if (this.level > prevLevel) {
      soundEngine.playLevelUp();
      this.spawnFloatingText(
        this.snake[0].x + 0.5,
        Math.max(1.2, this.snake[0].y - 0.8),
        `LEVEL ${this.level}`,
        '#4ADE80'
      );
      this.flashScreen('#22C55E', 0.14);
    }

    this.emitHud();
  }

  private activatePowerUp(
    type: PowerUpType,
    label: string,
    durationMs: number,
    now: number
  ): void {
    // Speed Boost and Slow Motion are mutually exclusive so gameplay stays predictable
    if (type === 'SPEED_BOOST') {
      this.activePowerUps = this.activePowerUps.filter(
        (p) => p.type !== 'SLOW_MOTION' && p.type !== 'SPEED_BOOST'
      );
    } else if (type === 'SLOW_MOTION') {
      this.activePowerUps = this.activePowerUps.filter(
        (p) => p.type !== 'SPEED_BOOST' && p.type !== 'SLOW_MOTION'
      );
    } else {
      this.activePowerUps = this.activePowerUps.filter((p) => p.type !== type);
    }

    this.activePowerUps.push({
      type,
      label,
      expiresAt: now + durationMs,
      durationMs,
    });
  }

  private maybeSpawnSpecial(now: number): void {
    if (!this.specialFeatures) return;
    this.specialSpawnCounter += 1;

    // Limit to at most 1 special item on board simultaneously
    const hasSpecialOnBoard = this.foods.some((f) => f.kind !== 'NORMAL');
    if (hasSpecialOnBoard) return;

    const shouldSpawn =
      this.specialSpawnCounter >= 4 ||
      (this.specialSpawnCounter >= 3 && Math.random() < 0.45);

    if (!shouldSpawn) return;
    this.specialSpawnCounter = 0;

    const roll = Math.random();
    let kind: FoodKind = 'BONUS';
    if (roll < 0.38) kind = 'BONUS';
    else if (roll < 0.6) kind = 'MULTIPLIER';
    else if (roll < 0.8) kind = 'SLOW_MOTION';
    else kind = 'SPEED_BOOST';

    this.spawnFood(kind, now);
  }

  private spawnFood(kind: FoodKind, now: number): void {
    const freeCells: Point[] = [];
    for (let y = 0; y < GRID_ROWS; y++) {
      for (let x = 0; x < GRID_COLS; x++) {
        const occupiedBySnake = this.snake.some((s) => s.x === x && s.y === y);
        if (occupiedBySnake) continue;
        const occupiedByFood = this.foods.some((f) => f.x === x && f.y === y);
        if (occupiedByFood) continue;
        freeCells.push({ x, y });
      }
    }

    if (freeCells.length === 0) {
      // Board completely filled — victory/end
      this.triggerGameOver('WALL');
      return;
    }

    const chosen = freeCells[Math.floor(Math.random() * freeCells.length)];
    const lifetimeMs =
      kind === 'NORMAL' ? null : kind === 'BONUS' ? 8500 : 8000;

    this.foods.push({
      id: this.nextFoodId++,
      x: chosen.x,
      y: chosen.y,
      kind,
      spawnedAt: now,
      expiresAt: lifetimeMs !== null ? now + lifetimeMs : null,
    });
  }

  private triggerGameOver(reason: 'WALL' | 'SELF'): void {
    this.phase = 'GAME_OVER';
    const head = this.snake[0];
    this.spawnParticles(head.x + 0.5, head.y + 0.5, '#EF4444', 24);
    this.triggerShake(260, 7);
    this.flashScreen('#EF4444', 0.28);
    soundEngine.playGameOver();

    this.emitHud();
    this.callbacks.onGameOver({
      score: this.score,
      bestScore: this.bestScore,
      isNewRecord: false, // Computed against persisted career stats by App
      foodCollected: this.foodCollected,
      durationMs: this.durationMs,
      level: this.level,
      difficulty: this.difficulty,
      deathReason: reason,
    });
  }

  private spawnParticles(gx: number, gy: number, color: string, count: number): void {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const speed = 1.6 + Math.random() * 3.4;
      this.particles.push({
        x: gx,
        y: gy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 0.1 + Math.random() * 0.14,
        color,
        alpha: 1,
        decay: 1.8 + Math.random() * 1.1,
      });
    }
    if (this.particles.length > 90) {
      this.particles.splice(0, this.particles.length - 90);
    }
  }

  private spawnFloatingText(
    gx: number,
    gy: number,
    text: string,
    color: string
  ): void {
    this.floatingTexts.push({
      x: Math.max(2, Math.min(GRID_COLS - 2, gx)),
      y: Math.max(1.2, gy),
      vy: -1.45,
      text,
      color,
      alpha: 1,
      scale: 1,
    });
  }

  private triggerShake(durationMs: number, intensity: number): void {
    this.shakeTimeMs = durationMs;
    this.shakeIntensity = intensity;
  }

  private flashScreen(color: string, alpha: number): void {
    this.flashColor = color;
    this.flashAlpha = alpha;
  }

  private updateEffects(dtMs: number): void {
    const dtSec = dtMs / 1000;

    if (this.shakeTimeMs > 0) {
      this.shakeTimeMs = Math.max(0, this.shakeTimeMs - dtMs);
    }
    if (this.flashAlpha > 0) {
      this.flashAlpha = Math.max(0, this.flashAlpha - dtSec * 0.9);
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dtSec;
      p.y += p.vy * dtSec;
      p.vx *= 0.93;
      p.vy *= 0.93;
      p.alpha -= p.decay * dtSec;
      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }

    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const t = this.floatingTexts[i];
      t.y += t.vy * dtSec;
      t.alpha -= 1.05 * dtSec;
      if (t.alpha <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }

    for (let i = this.tapIndicators.length - 1; i >= 0; i--) {
      const ti = this.tapIndicators[i];
      ti.alpha -= 3.2 * dtSec;
      if (ti.alpha <= 0) {
        this.tapIndicators.splice(i, 1);
      }
    }
  }

  public emitHud(): void {
    this.callbacks.onHudUpdate({
      score: this.score,
      bestScore: this.bestScore,
      level: this.level,
      foodCollected: this.foodCollected,
      durationMs: this.durationMs,
      activePowerUps: [...this.activePowerUps],
      phase: this.phase,
      extraLives: this.extraLives,
      safetyCapsules: this.safetyCapsules,
      safetyShieldExpiresAt: this.safetyShieldExpiresAt,
      safetyShieldDurationMs: this.safetyShieldDurationMs,
    });
  }
}
