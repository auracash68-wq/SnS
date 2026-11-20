import { useCallback, useEffect, useRef, useState } from 'react';
import { adMobService } from './ads/adMobService';
import { soundEngine } from './audio/soundEngine';
import {
  type GameplayControlHandle,
  GameplayScreen,
} from './components/GameplayScreen';
import { HighScoresScreen } from './components/HighScoresScreen';
import { HowToPlayScreen } from './components/HowToPlayScreen';
import { MainMenu } from './components/MainMenu';
import { SettingsScreen } from './components/SettingsScreen';
import {
  exitNativeApp,
  initializeNativeShell,
  registerNativeLifecycle,
} from './native/androidBridge';
import {
  CareerStats,
  Difficulty,
  GameSettings,
  RunSummary,
  ScreenState,
} from './types/game';
import {
  loadSettings,
  loadStats,
  recordCompletedRun,
  resetAllHighScores,
  saveSettings,
} from './utils/storage';

export default function App() {
  const [screen, setScreen] = useState<ScreenState>('MENU');
  const [settings, setSettings] = useState<GameSettings>(() => loadSettings());
  const [stats, setStats] = useState<CareerStats>(() => loadStats());
  const [reducedMotion, setReducedMotion] = useState<boolean>(false);
  const [exitToastVisible, setExitToastVisible] = useState<boolean>(false);

  const screenRef = useRef<ScreenState>(screen);
  screenRef.current = screen;

  const gameplayControlRef = useRef<GameplayControlHandle | null>(null);
  const lastBackPressRef = useRef<number>(0);
  const exitToastTimerRef = useRef<number | null>(null);

  // Sync reduced motion preference
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Initialize native Android shell & Google AdMob (App Open Ad with 12h/24h frequency cap)
  useEffect(() => {
    void (async () => {
      await initializeNativeShell();
      await adMobService.initialize();
      if (screenRef.current === 'MENU') {
        void adMobService.maybeShowAppOpenAd();
      }
    })();
  }, []);

  // Register Android hardware Back Button & App Lifecycle listeners
  useEffect(() => {
    const cleanup = registerNativeLifecycle({
      onBackButton: () => {
        const currentScreen = screenRef.current;

        if (currentScreen === 'PLAYING') {
          const handled = gameplayControlRef.current?.handleAndroidBack();
          if (handled) return;
          setScreen('MENU');
          return;
        }

        if (currentScreen !== 'MENU') {
          soundEngine.playClick();
          setScreen('MENU');
          return;
        }

        // Double-back-to-exit guard on Main Menu to prevent accidental exit
        const now = Date.now();
        if (now - lastBackPressRef.current < 2000) {
          void exitNativeApp();
          return;
        }

        lastBackPressRef.current = now;
        setExitToastVisible(true);
        if (exitToastTimerRef.current !== null) {
          window.clearTimeout(exitToastTimerRef.current);
        }
        exitToastTimerRef.current = window.setTimeout(() => {
          setExitToastVisible(false);
        }, 2000);
      },
      onPauseBackground: () => {
        gameplayControlRef.current?.pauseFromBackground();
        soundEngine.suspendForBackground();
      },
      onResumeForeground: () => {
        // Only check App Open Ad when safely on menu/non-active screens (never interrupts active play)
        if (screenRef.current !== 'PLAYING') {
          void adMobService.maybeShowAppOpenAd();
        }
      },
    });

    return () => {
      cleanup();
      if (exitToastTimerRef.current !== null) {
        window.clearTimeout(exitToastTimerRef.current);
      }
    };
  }, []);

  // Sync audio engine preferences whenever settings update
  useEffect(() => {
    soundEngine.configure({
      soundEnabled: settings.soundEnabled,
      musicEnabled: settings.musicEnabled,
      vibrationEnabled: settings.vibrationEnabled,
    });
  }, [settings.soundEnabled, settings.musicEnabled, settings.vibrationEnabled]);

  const updateSettings = useCallback((patch: Partial<GameSettings>) => {
    soundEngine.unlock();
    soundEngine.playClick();
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

  const handleToggleSound = useCallback(() => {
    soundEngine.unlock();
    setSettings((prev) => {
      const next = { ...prev, soundEnabled: !prev.soundEnabled };
      saveSettings(next);
      soundEngine.configure({
        soundEnabled: next.soundEnabled,
        musicEnabled: next.musicEnabled,
        vibrationEnabled: next.vibrationEnabled,
      });
      if (next.soundEnabled) soundEngine.playClick();
      return next;
    });
  }, []);

  const handleToggleMusic = useCallback(() => {
    soundEngine.unlock();
    soundEngine.playClick();
    setSettings((prev) => {
      const next = { ...prev, musicEnabled: !prev.musicEnabled };
      saveSettings(next);
      soundEngine.configure({
        soundEnabled: next.soundEnabled,
        musicEnabled: next.musicEnabled,
        vibrationEnabled: next.vibrationEnabled,
      });
      return next;
    });
  }, []);

  const handleSelectDifficulty = useCallback(
    (difficulty: Difficulty) => {
      updateSettings({ difficulty });
    },
    [updateSettings]
  );

  const navigate = useCallback((target: ScreenState) => {
    soundEngine.unlock();
    soundEngine.playClick();
    setScreen(target);
  }, []);

  const handleRunFinished = useCallback(
    (rawSummary: RunSummary): RunSummary => {
      const { updated, isNewRecord } = recordCompletedRun(stats, {
        score: rawSummary.score,
        difficulty: rawSummary.difficulty,
        foodCollected: rawSummary.foodCollected,
        durationMs: rawSummary.durationMs,
        level: rawSummary.level,
        specialFeatures: settings.specialFeatures,
      });
      setStats(updated);
      if (isNewRecord) {
        window.setTimeout(() => soundEngine.playNewRecord(), 280);
      }
      return {
        ...rawSummary,
        bestScore: updated.bestScore,
        isNewRecord,
      };
    },
    [stats, settings.specialFeatures]
  );

  const handleResetHighScores = useCallback(() => {
    soundEngine.unlock();
    soundEngine.playClick();
    const clean = resetAllHighScores();
    setStats(clean);
  }, []);

  // Keyboard Enter shortcut on Main Menu to start immediately
  useEffect(() => {
    if (screen !== 'MENU') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        navigate('PLAYING');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [screen, navigate]);

  return (
    <div className="relative w-full h-full bg-[#05080F] flex items-center justify-center sm:p-4 overflow-hidden">
      {/* Subtle Desktop Ambient Backdrop */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 hidden sm:block"
        style={{
          background:
            'radial-gradient(circle at 50% 35%, rgba(16, 185, 129, 0.08), rgba(5, 8, 15, 0) 60%)',
        }}
      />

      {/* 9:16 Portrait Arcade Console Frame */}
      <div className="relative w-full h-full sm:w-auto sm:h-[min(94dvh,860px)] sm:aspect-[9/16] sm:max-w-[440px] bg-[#080D18] sm:rounded-[30px] sm:border sm:border-slate-800/90 sm:shadow-[0_24px_80px_rgba(0,0,0,0.75)] overflow-hidden flex flex-col">
        {screen === 'MENU' && (
          <MainMenu
            settings={settings}
            stats={stats}
            reducedMotion={reducedMotion}
            onPlay={() => navigate('PLAYING')}
            onOpenHighScores={() => navigate('HIGH_SCORES')}
            onOpenSettings={() => navigate('SETTINGS')}
            onOpenHowToPlay={() => navigate('HOW_TO_PLAY')}
            onToggleSound={handleToggleSound}
            onSelectDifficulty={handleSelectDifficulty}
          />
        )}

        {screen === 'PLAYING' && (
          <GameplayScreen
            settings={settings}
            bestScore={stats.bestScore}
            reducedMotion={reducedMotion}
            controlRef={gameplayControlRef}
            onRunFinished={handleRunFinished}
            onExitToMenu={() => navigate('MENU')}
            onToggleSound={handleToggleSound}
            onToggleMusic={handleToggleMusic}
          />
        )}

        {screen === 'HIGH_SCORES' && (
          <HighScoresScreen
            stats={stats}
            onBack={() => navigate('MENU')}
            onStartPlay={() => navigate('PLAYING')}
          />
        )}

        {screen === 'SETTINGS' && (
          <SettingsScreen
            settings={settings}
            bestScore={stats.bestScore}
            onUpdateSettings={updateSettings}
            onResetHighScores={handleResetHighScores}
            onBack={() => navigate('MENU')}
          />
        )}

        {screen === 'HOW_TO_PLAY' && (
          <HowToPlayScreen
            onBack={() => navigate('MENU')}
            onStartPlay={() => navigate('PLAYING')}
          />
        )}

        {exitToastVisible && (
          <div
            role="status"
            aria-live="polite"
            className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-slate-900/95 border border-slate-700 text-xs font-medium text-slate-100 shadow-lg whitespace-nowrap"
          >
            Press back again to exit
          </div>
        )}
      </div>
    </div>
  );
}
