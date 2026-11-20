import {
  AdMob,
  AdmobConsentStatus,
  AppOpenAdPluginEvents,
  InterstitialAdPluginEvents,
  MaxAdContentRating,
  RewardAdPluginEvents,
} from '@capacitor-community/admob';
import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import { soundEngine } from '../audio/soundEngine';
import { ADMOB_CONFIG } from './adConfig';
import {
  canShowAppOpenAd,
  recordAppOpenAdShown,
  recordGameOverAndCheckInterstitialEligibility,
  recordInterstitialAdShown,
} from './adFrequencyStore';

export type RewardedAdResult =
  | { rewarded: true }
  | { rewarded: false; reason: 'unavailable' | 'dismissed' | 'busy' };

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error('Ad operation timed out'));
    }, timeoutMs);

    promise
      .then((val) => {
        window.clearTimeout(timer);
        resolve(val);
      })
      .catch((err) => {
        window.clearTimeout(timer);
        reject(err);
      });
  });
}

class AdMobManager {
  private initPromise: Promise<boolean> | null = null;
  private initialized = false;
  private isShowingFullscreenAd = false;

  private appOpenLoading = false;
  private interstitialLoaded = false;
  private interstitialLoading = false;
  private rewardedLoaded = false;
  private rewardedLoading = false;

  private persistentListenersRegistered = false;

  public isNativeSupported(): boolean {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
  }

  /**
   * Initializes Google Mobile Ads SDK once (no duplicate initialization),
   * checks UMP consent when available, and preloads approved ad formats.
   */
  public initialize(): Promise<boolean> {
    if (!this.isNativeSupported()) {
      return Promise.resolve(false);
    }
    if (this.initialized) {
      return Promise.resolve(true);
    }
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      try {
        // Request UMP consent info non-blockingly where configured
        try {
          const consentInfo = await withTimeout(AdMob.requestConsentInfo(), 3000);
          if (
            consentInfo.isConsentFormAvailable &&
            consentInfo.status === AdmobConsentStatus.REQUIRED
          ) {
            await AdMob.showConsentForm();
          }
        } catch {
          // Proceed in test mode even if UMP form isn't configured on test App ID
        }

        await AdMob.initialize({
          initializeForTesting: ADMOB_CONFIG.isTesting,
          maxAdContentRating: MaxAdContentRating.General,
        });

        this.initialized = true;
        await this.registerPersistentListeners();

        // Preload ad formats quietly in background
        void this.preloadAppOpen();
        void this.preloadInterstitial();
        void this.preloadRewarded();

        return true;
      } catch {
        this.initPromise = null;
        return false;
      }
    })();

    return this.initPromise;
  }

  private async registerPersistentListeners(): Promise<void> {
    if (this.persistentListenersRegistered) return;
    this.persistentListenersRegistered = true;

    try {
      await AdMob.addListener(AppOpenAdPluginEvents.Closed, () => {
        this.isShowingFullscreenAd = false;
        void this.preloadAppOpen();
      });
      await AdMob.addListener(AppOpenAdPluginEvents.FailedToShow, () => {
        this.isShowingFullscreenAd = false;
        void this.preloadAppOpen();
      });

      await AdMob.addListener(InterstitialAdPluginEvents.Loaded, () => {
        this.interstitialLoaded = true;
        this.interstitialLoading = false;
      });
      await AdMob.addListener(InterstitialAdPluginEvents.FailedToLoad, () => {
        this.interstitialLoaded = false;
        this.interstitialLoading = false;
      });
      await AdMob.addListener(InterstitialAdPluginEvents.Dismissed, () => {
        this.interstitialLoaded = false;
        this.isShowingFullscreenAd = false;
        void this.preloadInterstitial();
      });
      await AdMob.addListener(InterstitialAdPluginEvents.FailedToShow, () => {
        this.interstitialLoaded = false;
        this.isShowingFullscreenAd = false;
        void this.preloadInterstitial();
      });

      await AdMob.addListener(RewardAdPluginEvents.Loaded, () => {
        this.rewardedLoaded = true;
        this.rewardedLoading = false;
      });
      await AdMob.addListener(RewardAdPluginEvents.FailedToLoad, () => {
        this.rewardedLoaded = false;
        this.rewardedLoading = false;
      });
      await AdMob.addListener(RewardAdPluginEvents.Dismissed, () => {
        this.rewardedLoaded = false;
        this.isShowingFullscreenAd = false;
        void this.preloadRewarded();
      });
      await AdMob.addListener(RewardAdPluginEvents.FailedToShow, () => {
        this.rewardedLoaded = false;
        this.isShowingFullscreenAd = false;
        void this.preloadRewarded();
      });
    } catch {
      // Listener errors should never block app startup
    }
  }

  private async preloadAppOpen(): Promise<boolean> {
    if (!this.initialized || this.appOpenLoading) return false;
    this.appOpenLoading = true;
    try {
      await AdMob.loadAppOpen({ adId: ADMOB_CONFIG.adUnits.appOpen });
      return true;
    } catch {
      return false;
    } finally {
      this.appOpenLoading = false;
    }
  }

  private async preloadInterstitial(): Promise<boolean> {
    if (!this.initialized || this.interstitialLoaded || this.interstitialLoading) {
      return this.interstitialLoaded;
    }
    this.interstitialLoading = true;
    try {
      await AdMob.prepareInterstitial({
        adId: ADMOB_CONFIG.adUnits.interstitialVideo,
        isTesting: ADMOB_CONFIG.isTesting,
      });
      this.interstitialLoaded = true;
      return true;
    } catch {
      this.interstitialLoaded = false;
      return false;
    } finally {
      this.interstitialLoading = false;
    }
  }

  private async preloadRewarded(): Promise<boolean> {
    if (!this.initialized || this.rewardedLoaded || this.rewardedLoading) {
      return this.rewardedLoaded;
    }
    this.rewardedLoading = true;
    try {
      await AdMob.prepareRewardVideoAd({
        adId: ADMOB_CONFIG.adUnits.rewardedVideo,
        isTesting: ADMOB_CONFIG.isTesting,
      });
      this.rewardedLoaded = true;
      return true;
    } catch {
      this.rewardedLoaded = false;
      return false;
    } finally {
      this.rewardedLoading = false;
    }
  }

  /**
   * App Open Ad:
   * - Shown max 1x per 12h and max 2x per 24h
   * - Never blocks or interrupts active gameplay or fails harshly if offline
   */
  public async maybeShowAppOpenAd(): Promise<boolean> {
    if (!this.isNativeSupported() || this.isShowingFullscreenAd) {
      return false;
    }
    if (!canShowAppOpenAd()) {
      return false;
    }

    const ready = await this.initialize();
    if (!ready) return false;

    try {
      const status = await AdMob.isAppOpenLoaded({
        adId: ADMOB_CONFIG.adUnits.appOpen,
      });

      if (!status.value) {
        // Attempt a brief non-blocking load on cold launch (max 2.5s)
        const loaded = await withTimeout(this.preloadAppOpen(), 2500).catch(
          () => false
        );
        if (!loaded) return false;
      }

      if (this.isShowingFullscreenAd || !canShowAppOpenAd()) {
        return false;
      }

      this.isShowingFullscreenAd = true;
      soundEngine.suspendForBackground();
      await AdMob.showAppOpen({ adId: ADMOB_CONFIG.adUnits.appOpen });
      recordAppOpenAdShown();
      return true;
    } catch {
      this.isShowingFullscreenAd = false;
      return false;
    }
  }

  /**
   * Interstitial Video Ad on Game Over:
   * - 5th Game Over in 24h window, then every 8th (5, 13, 21, 29, 37)
   * - Max 5 Interstitial Ads per 24 hours
   * - Fails silently without disrupting user flow if unavailable
   */
  public async maybeShowInterstitialOnGameOver(): Promise<boolean> {
    const eligible = recordGameOverAndCheckInterstitialEligibility();
    if (!eligible || !this.isNativeSupported() || this.isShowingFullscreenAd) {
      return false;
    }

    const ready = await this.initialize();
    if (!ready) return false;

    if (!this.interstitialLoaded) {
      // Do not freeze Game Over screen waiting for slow network; preload for next time
      void this.preloadInterstitial();
      return false;
    }

    try {
      this.isShowingFullscreenAd = true;
      soundEngine.suspendForBackground();
      await AdMob.showInterstitial({
        adId: ADMOB_CONFIG.adUnits.interstitialVideo,
      });
      this.interstitialLoaded = false;
      recordInterstitialAdShown();
      return true;
    } catch {
      this.isShowingFullscreenAd = false;
      this.interstitialLoaded = false;
      void this.preloadInterstitial();
      return false;
    }
  }

  /**
   * Rewarded Video Ad on Game Over (Revive + 3 Lives + 2 Safety Capsules):
   * - Strictly prevents duplicate reward callbacks
   * - Never grants rewards if ad fails to load, fails to show, or is dismissed early
   */
  public async showReviveRewardedAd(): Promise<RewardedAdResult> {
    if (!this.isNativeSupported()) {
      return { rewarded: false, reason: 'unavailable' };
    }
    if (this.isShowingFullscreenAd) {
      return { rewarded: false, reason: 'busy' };
    }

    const ready = await this.initialize();
    if (!ready) {
      return { rewarded: false, reason: 'unavailable' };
    }

    if (!this.rewardedLoaded) {
      const loaded = await withTimeout(this.preloadRewarded(), 4500).catch(
        () => false
      );
      if (!loaded) {
        return { rewarded: false, reason: 'unavailable' };
      }
    }

    this.isShowingFullscreenAd = true;
    soundEngine.suspendForBackground();

    let rewardGranted = false;
    const tempListeners: PluginListenerHandle[] = [];

    try {
      const rewardHandle = await AdMob.addListener(
        RewardAdPluginEvents.Rewarded,
        () => {
          rewardGranted = true;
        }
      );
      tempListeners.push(rewardHandle);

      const rewardItem = await AdMob.showRewardVideoAd({
        adId: ADMOB_CONFIG.adUnits.rewardedVideo,
      });

      if (rewardItem && typeof rewardItem.amount === 'number' && rewardItem.amount > 0) {
        rewardGranted = true;
      }

      this.rewardedLoaded = false;
      void this.preloadRewarded();

      return rewardGranted
        ? { rewarded: true }
        : { rewarded: false, reason: 'dismissed' };
    } catch {
      this.rewardedLoaded = false;
      void this.preloadRewarded();
      return { rewarded: false, reason: 'unavailable' };
    } finally {
      this.isShowingFullscreenAd = false;
      for (const handle of tempListeners) {
        void handle.remove().catch(() => {});
      }
    }
  }
}

export const adMobService = new AdMobManager();
