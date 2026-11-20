export const ADMOB_CONFIG = {
  /**
   * Official Google AdMob Android Test App ID.
   * Configured in android/app/src/main/res/values/strings.xml (admob_app_id).
   */
  androidAppId: 'ca-app-pub-3940256099942544~3347511713',

  /**
   * Official Google AdMob Android Test Ad Unit IDs (Test Mode).
   * Replace with your verified production Ad Unit IDs only when releasing to Play Store.
   */
  adUnits: {
    appOpen: 'ca-app-pub-3940256099942544/9257395921',
    interstitialVideo: 'ca-app-pub-3940256099942544/8691691433',
    rewardedVideo: 'ca-app-pub-3940256099942544/5224354917',
  },

  /**
   * Keep test mode explicitly enabled as requested by the user.
   */
  isTesting: true,

  /**
   * Exact user-approved frequency caps & reward specifications.
   */
  frequency: {
    appOpenCooldownMs: 12 * 60 * 60 * 1000, // Max 1 App Open Ad per 12 hours
    appOpenMaxPer24h: 2, // Max 2 App Open Ads per 24 hours
    interstitialFirstGameOver: 5, // First Interstitial Video on 5th Game Over
    interstitialRepeatEvery: 8, // Then every 8th Game Over (5, 13, 21, 29, 37)
    interstitialMaxPer24h: 5, // Hard cap: max 5 Interstitial Video Ads per 24 hours
    rollingWindowMs: 24 * 60 * 60 * 1000, // 24 hours
  },

  reviveReward: {
    extraLives: 3,
    safetyCapsules: 2,
    safetyCapsuleDurationMs: 5000, // 5 seconds per capsule
  },
} as const;
