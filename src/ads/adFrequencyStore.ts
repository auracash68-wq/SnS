import { ADMOB_CONFIG } from './adConfig';

const AD_FREQ_STORAGE_KEY = 'snake_arena_ad_freq_v1';

interface AdFrequencyState {
  appOpenShownAt: number[];
  interstitialShownAt: number[];
  gameOverWindowStart: number;
  gameOversInWindow: number;
}

const DEFAULT_FREQ_STATE: AdFrequencyState = {
  appOpenShownAt: [],
  interstitialShownAt: [],
  gameOverWindowStart: 0,
  gameOversInWindow: 0,
};

function safeStorage(): Storage | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

function pruneRolling24h(timestamps: number[], now: number): number[] {
  const cutoff = now - ADMOB_CONFIG.frequency.rollingWindowMs;
  return timestamps
    .filter((ts) => typeof ts === 'number' && Number.isFinite(ts) && ts > cutoff && ts <= now + 60_000)
    .sort((a, b) => a - b);
}

function loadState(now: number): AdFrequencyState {
  const storage = safeStorage();
  if (!storage) return { ...DEFAULT_FREQ_STATE };

  try {
    const raw = storage.getItem(AD_FREQ_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_FREQ_STATE };
    const parsed = JSON.parse(raw) as Partial<AdFrequencyState>;

    const appOpenShownAt = Array.isArray(parsed.appOpenShownAt)
      ? pruneRolling24h(parsed.appOpenShownAt, now)
      : [];
    const interstitialShownAt = Array.isArray(parsed.interstitialShownAt)
      ? pruneRolling24h(parsed.interstitialShownAt, now)
      : [];

    let gameOverWindowStart =
      typeof parsed.gameOverWindowStart === 'number' &&
      Number.isFinite(parsed.gameOverWindowStart)
        ? parsed.gameOverWindowStart
        : 0;
    let gameOversInWindow =
      typeof parsed.gameOversInWindow === 'number' &&
      Number.isFinite(parsed.gameOversInWindow) &&
      parsed.gameOversInWindow >= 0
        ? Math.floor(parsed.gameOversInWindow)
        : 0;

    if (
      gameOverWindowStart === 0 ||
      now - gameOverWindowStart >= ADMOB_CONFIG.frequency.rollingWindowMs
    ) {
      gameOverWindowStart = now;
      gameOversInWindow = 0;
    }

    return {
      appOpenShownAt,
      interstitialShownAt,
      gameOverWindowStart,
      gameOversInWindow,
    };
  } catch {
    return { ...DEFAULT_FREQ_STATE };
  }
}

function saveState(state: AdFrequencyState): void {
  const storage = safeStorage();
  if (!storage) return;
  try {
    storage.setItem(AD_FREQ_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage write errors gracefully
  }
}

/**
 * Checks App Open Ad eligibility:
 * - Max 1 ad per 12 hours
 * - Max 2 ads per 24 hours
 */
export function canShowAppOpenAd(now = Date.now()): boolean {
  const state = loadState(now);
  if (state.appOpenShownAt.length >= ADMOB_CONFIG.frequency.appOpenMaxPer24h) {
    return false;
  }
  if (state.appOpenShownAt.length > 0) {
    const lastShown = state.appOpenShownAt[state.appOpenShownAt.length - 1];
    if (now - lastShown < ADMOB_CONFIG.frequency.appOpenCooldownMs) {
      return false;
    }
  }
  return true;
}

export function recordAppOpenAdShown(now = Date.now()): void {
  const state = loadState(now);
  state.appOpenShownAt = pruneRolling24h([...state.appOpenShownAt, now], now);
  saveState(state);
}

/**
 * Increments the 24-hour Game Over counter and evaluates Interstitial Video cadence:
 * - First ad on 5th Game Over within the 24h window
 * - Then every 8th Game Over (5, 13, 21, 29, 37...)
 * - Hard cap of 5 Interstitial Ads per 24 hours
 */
export function recordGameOverAndCheckInterstitialEligibility(
  now = Date.now()
): boolean {
  const state = loadState(now);
  if (
    state.gameOverWindowStart === 0 ||
    now - state.gameOverWindowStart >= ADMOB_CONFIG.frequency.rollingWindowMs
  ) {
    state.gameOverWindowStart = now;
    state.gameOversInWindow = 0;
  }

  state.gameOversInWindow += 1;
  saveState(state);

  if (
    state.interstitialShownAt.length >= ADMOB_CONFIG.frequency.interstitialMaxPer24h
  ) {
    return false;
  }

  const count = state.gameOversInWindow;
  const first = ADMOB_CONFIG.frequency.interstitialFirstGameOver;
  const repeat = ADMOB_CONFIG.frequency.interstitialRepeatEvery;

  if (count === first) return true;
  if (count > first && (count - first) % repeat === 0) return true;
  return false;
}

export function recordInterstitialAdShown(now = Date.now()): void {
  const state = loadState(now);
  state.interstitialShownAt = pruneRolling24h(
    [...state.interstitialShownAt, now],
    now
  );
  saveState(state);
}
