import { CareerStats, Difficulty, GameSettings, ScoreRecord } from '../types/game';

const SETTINGS_KEY = 'snake_arena_settings_v1';
const STATS_KEY = 'snake_arena_stats_v1';

export const DEFAULT_SETTINGS: GameSettings = {
  soundEnabled: true,
  musicEnabled: true,
  vibrationEnabled: true,
  sensitivity: 'MEDIUM',
  difficulty: 'NORMAL',
  specialFeatures: true,
};

export const DEFAULT_STATS: CareerStats = {
  bestScore: 0,
  bestByDifficulty: {
    EASY: 0,
    NORMAL: 0,
    HARD: 0,
  },
  totalGamesPlayed: 0,
  totalFoodCollected: 0,
  bestDurationMs: 0,
  recentRuns: [],
};

function safeGetStorage(): Storage | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return null;
    }
    const testKey = '__snake_arena_probe__';
    window.localStorage.setItem(testKey, '1');
    window.localStorage.removeItem(testKey);
    return window.localStorage;
  } catch {
    return null;
  }
}

function isDifficulty(val: unknown): val is Difficulty {
  return val === 'EASY' || val === 'NORMAL' || val === 'HARD';
}

function isNonNegativeInt(val: unknown): val is number {
  return typeof val === 'number' && Number.isFinite(val) && val >= 0;
}

export function loadSettings(): GameSettings {
  const storage = safeGetStorage();
  if (!storage) return { ...DEFAULT_SETTINGS };

  try {
    const raw = storage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<GameSettings>;

    return {
      soundEnabled:
        typeof parsed.soundEnabled === 'boolean'
          ? parsed.soundEnabled
          : DEFAULT_SETTINGS.soundEnabled,
      musicEnabled:
        typeof parsed.musicEnabled === 'boolean'
          ? parsed.musicEnabled
          : DEFAULT_SETTINGS.musicEnabled,
      vibrationEnabled:
        typeof parsed.vibrationEnabled === 'boolean'
          ? parsed.vibrationEnabled
          : DEFAULT_SETTINGS.vibrationEnabled,
      sensitivity:
        parsed.sensitivity === 'LOW' ||
        parsed.sensitivity === 'MEDIUM' ||
        parsed.sensitivity === 'HIGH'
          ? parsed.sensitivity
          : DEFAULT_SETTINGS.sensitivity,
      difficulty: isDifficulty(parsed.difficulty)
        ? parsed.difficulty
        : DEFAULT_SETTINGS.difficulty,
      specialFeatures:
        typeof parsed.specialFeatures === 'boolean'
          ? parsed.specialFeatures
          : DEFAULT_SETTINGS.specialFeatures,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: GameSettings): void {
  const storage = safeGetStorage();
  if (!storage) return;
  try {
    storage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Ignore quota or storage write errors gracefully
  }
}

function sanitizeScoreRecord(item: unknown): ScoreRecord | null {
  if (!item || typeof item !== 'object') return null;
  const r = item as Partial<ScoreRecord>;
  if (
    typeof r.id !== 'string' ||
    !isNonNegativeInt(r.score) ||
    !isDifficulty(r.difficulty) ||
    !isNonNegativeInt(r.foodCollected) ||
    !isNonNegativeInt(r.durationMs) ||
    !isNonNegativeInt(r.level) ||
    typeof r.dateIso !== 'string'
  ) {
    return null;
  }
  return {
    id: r.id,
    score: Math.floor(r.score),
    difficulty: r.difficulty,
    foodCollected: Math.floor(r.foodCollected),
    durationMs: Math.floor(r.durationMs),
    level: Math.max(1, Math.floor(r.level)),
    specialFeatures: typeof r.specialFeatures === 'boolean' ? r.specialFeatures : true,
    dateIso: r.dateIso,
  };
}

export function loadStats(): CareerStats {
  const storage = safeGetStorage();
  if (!storage) {
    return {
      ...DEFAULT_STATS,
      bestByDifficulty: { ...DEFAULT_STATS.bestByDifficulty },
      recentRuns: [],
    };
  }

  try {
    const raw = storage.getItem(STATS_KEY);
    if (!raw) {
      return {
        ...DEFAULT_STATS,
        bestByDifficulty: { ...DEFAULT_STATS.bestByDifficulty },
        recentRuns: [],
      };
    }
    const parsed = JSON.parse(raw) as Partial<CareerStats>;

    const bestByDiff = parsed.bestByDifficulty;
    const easyBest =
      bestByDiff && isNonNegativeInt(bestByDiff.EASY) ? Math.floor(bestByDiff.EASY) : 0;
    const normalBest =
      bestByDiff && isNonNegativeInt(bestByDiff.NORMAL) ? Math.floor(bestByDiff.NORMAL) : 0;
    const hardBest =
      bestByDiff && isNonNegativeInt(bestByDiff.HARD) ? Math.floor(bestByDiff.HARD) : 0;

    const runsRaw = Array.isArray(parsed.recentRuns) ? parsed.recentRuns : [];
    const recentRuns = runsRaw
      .map(sanitizeScoreRecord)
      .filter((r): r is ScoreRecord => r !== null)
      .slice(0, 12);

    const bestScore = isNonNegativeInt(parsed.bestScore)
      ? Math.max(Math.floor(parsed.bestScore), easyBest, normalBest, hardBest)
      : Math.max(easyBest, normalBest, hardBest);

    return {
      bestScore,
      bestByDifficulty: {
        EASY: easyBest,
        NORMAL: normalBest,
        HARD: hardBest,
      },
      totalGamesPlayed: isNonNegativeInt(parsed.totalGamesPlayed)
        ? Math.floor(parsed.totalGamesPlayed)
        : 0,
      totalFoodCollected: isNonNegativeInt(parsed.totalFoodCollected)
        ? Math.floor(parsed.totalFoodCollected)
        : 0,
      bestDurationMs: isNonNegativeInt(parsed.bestDurationMs)
        ? Math.floor(parsed.bestDurationMs)
        : 0,
      recentRuns,
    };
  } catch {
    return {
      ...DEFAULT_STATS,
      bestByDifficulty: { ...DEFAULT_STATS.bestByDifficulty },
      recentRuns: [],
    };
  }
}

export function saveStats(stats: CareerStats): void {
  const storage = safeGetStorage();
  if (!storage) return;
  try {
    storage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch {
    // Ignore storage write failure
  }
}

export function recordCompletedRun(
  current: CareerStats,
  run: Omit<ScoreRecord, 'id' | 'dateIso'>
): { updated: CareerStats; isNewRecord: boolean } {
  const isNewRecord = run.score > current.bestScore && run.score > 0;
  const newBestOverall = Math.max(current.bestScore, run.score);
  const prevDiffBest = current.bestByDifficulty[run.difficulty] ?? 0;

  const entry: ScoreRecord = {
    ...run,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    dateIso: new Date().toISOString(),
  };

  const mergedRuns = [entry, ...current.recentRuns]
    .sort((a, b) => b.score - a.score || b.durationMs - a.durationMs)
    .slice(0, 12);

  const updated: CareerStats = {
    bestScore: newBestOverall,
    bestByDifficulty: {
      ...current.bestByDifficulty,
      [run.difficulty]: Math.max(prevDiffBest, run.score),
    },
    totalGamesPlayed: current.totalGamesPlayed + 1,
    totalFoodCollected: current.totalFoodCollected + run.foodCollected,
    bestDurationMs: Math.max(current.bestDurationMs, run.durationMs),
    recentRuns: mergedRuns,
  };

  saveStats(updated);
  return { updated, isNewRecord };
}

export function resetAllHighScores(): CareerStats {
  const clean: CareerStats = {
    ...DEFAULT_STATS,
    bestByDifficulty: { ...DEFAULT_STATS.bestByDifficulty },
    recentRuns: [],
  };
  saveStats(clean);
  return clean;
}
