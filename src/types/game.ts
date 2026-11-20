export type ScreenState =
  | 'MENU'
  | 'PLAYING'
  | 'HIGH_SCORES'
  | 'SETTINGS'
  | 'HOW_TO_PLAY';

export type PlayPhase = 'READY' | 'ACTIVE' | 'PAUSED' | 'GAME_OVER';

export type Difficulty = 'EASY' | 'NORMAL' | 'HARD';

export type ControlSensitivity = 'LOW' | 'MEDIUM' | 'HIGH';

export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export interface Point {
  x: number;
  y: number;
}

export type FoodKind =
  | 'NORMAL'
  | 'BONUS'
  | 'SPEED_BOOST'
  | 'SLOW_MOTION'
  | 'MULTIPLIER';

export interface FoodItem {
  id: number;
  x: number;
  y: number;
  kind: FoodKind;
  spawnedAt: number;
  expiresAt: number | null;
}

export type PowerUpType = 'SPEED_BOOST' | 'SLOW_MOTION' | 'MULTIPLIER';

export interface ActivePowerUp {
  type: PowerUpType;
  label: string;
  expiresAt: number;
  durationMs: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  decay: number;
}

export interface FloatingText {
  x: number;
  y: number;
  vy: number;
  text: string;
  color: string;
  alpha: number;
  scale: number;
}

export interface GameSettings {
  soundEnabled: boolean;
  musicEnabled: boolean;
  vibrationEnabled: boolean;
  sensitivity: ControlSensitivity;
  difficulty: Difficulty;
  specialFeatures: boolean;
}

export interface ScoreRecord {
  id: string;
  score: number;
  difficulty: Difficulty;
  foodCollected: number;
  durationMs: number;
  level: number;
  specialFeatures: boolean;
  dateIso: string;
}

export interface CareerStats {
  bestScore: number;
  bestByDifficulty: Record<Difficulty, number>;
  totalGamesPlayed: number;
  totalFoodCollected: number;
  bestDurationMs: number;
  recentRuns: ScoreRecord[];
}

export interface RunSummary {
  score: number;
  bestScore: number;
  isNewRecord: boolean;
  foodCollected: number;
  durationMs: number;
  level: number;
  difficulty: Difficulty;
  deathReason: 'WALL' | 'SELF';
}

export interface HudSnapshot {
  score: number;
  bestScore: number;
  level: number;
  foodCollected: number;
  durationMs: number;
  activePowerUps: ActivePowerUp[];
  phase: PlayPhase;
  extraLives: number;
  safetyCapsules: number;
  safetyShieldExpiresAt: number;
  safetyShieldDurationMs: number;
}
