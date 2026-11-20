import { Heart, Pause, Shield, Volume2, VolumeX, Zap } from 'lucide-react';
import { type MutableRefObject, useCallback, useEffect, useRef, useState } from 'react';
import { ADMOB_CONFIG } from '../ads/adConfig';
import { adMobService } from '../ads/adMobService';
import { soundEngine } from '../audio/soundEngine';
import { GRID_COLS, GRID_ROWS, SnakeEngine } from '../engine/snakeEngine';
import { renderSnakeArena } from '../engine/snakeRenderer';
import {
  ControlSensitivity,
  Direction,
  GameSettings,
  HudSnapshot,
  RunSummary,
} from '../types/game';
import { GameOverModal } from './GameOverModal';
import { PauseModal } from './PauseModal';

export interface GameplayControlHandle {
  handleAndroidBack: () => boolean;
  pauseFromBackground: () => void;
}

interface GameplayScreenProps {
  settings: GameSettings;
  bestScore: number;
  reducedMotion: boolean;
  controlRef?: MutableRefObject<GameplayControlHandle | null>;
  onRunFinished: (summary: RunSummary) => RunSummary;
  onExitToMenu: () => void;
  onToggleSound: () => void;
  onToggleMusic: () => void;
}

const SWIPE_THRESHOLD: Record<ControlSensitivity, number> = {
  LOW: 36,
  MEDIUM: 22,
  HIGH: 14,
};

export function GameplayScreen({
  settings,
  bestScore,
  reducedMotion,
  controlRef,
  onRunFinished,
  onExitToMenu,
  onToggleSound,
  onToggleMusic,
}: GameplayScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const boardContainerRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<SnakeEngine | null>(null);

  const activePointerIdRef = useRef<number | null>(null);
  const pointerOriginRef = useRef<{ x: number; y: number } | null>(null);
  const didSwipeRef = useRef<boolean>(false);

  const bestScoreRef = useRef(bestScore);
  bestScoreRef.current = bestScore;

  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const onRunFinishedRef = useRef(onRunFinished);
  onRunFinishedRef.current = onRunFinished;

  const [hud, setHud] = useState<HudSnapshot>({
    score: 0,
    bestScore,
    level: 1,
    foodCollected: 0,
    durationMs: 0,
    activePowerUps: [],
    phase: 'ACTIVE',
    extraLives: 0,
    safetyCapsules: 0,
    safetyShieldExpiresAt: 0,
    safetyShieldDurationMs: ADMOB_CONFIG.reviveReward.safetyCapsuleDurationMs,
  });
  const [gameOverSummary, setGameOverSummary] = useState<RunSummary | null>(null);
  const [nowTick, setNowTick] = useState<number>(() => performance.now());

  const handleDirectionInput = useCallback((dir: Direction) => {
    soundEngine.unlock();
    const eng = engineRef.current;
    if (!eng || eng.phase !== 'ACTIVE') return;
    eng.queueDirection(dir);
  }, []);

  const steerFromTap = useCallback((clientX: number, clientY: number) => {
    soundEngine.unlock();
    const eng = engineRef.current;
    const canvas = canvasRef.current;
    if (!eng || !canvas || eng.phase !== 'ACTIVE') return;

    const rect = canvas.getBoundingClientRect();
    const cell = Math.min(rect.width / GRID_COLS, rect.height / GRID_ROWS);
    const boardW = cell * GRID_COLS;
    const boardH = cell * GRID_ROWS;
    const offsetX = rect.left + (rect.width - boardW) * 0.5;
    const offsetY = rect.top + (rect.height - boardH) * 0.5;

    const head = eng.snake[0];
    const headScreenX = offsetX + (head.x + 0.5) * cell;
    const headScreenY = offsetY + (head.y + 0.5) * cell;

    const planned = eng.getPlannedDirection();
    let nextDir: Direction;

    if (planned === 'UP' || planned === 'DOWN') {
      const dx = clientX - headScreenX;
      if (Math.abs(dx) > 4) {
        nextDir = dx < 0 ? 'LEFT' : 'RIGHT';
      } else {
        nextDir = head.x >= GRID_COLS / 2 ? 'LEFT' : 'RIGHT';
      }
    } else {
      const dy = clientY - headScreenY;
      if (Math.abs(dy) > 4) {
        nextDir = dy < 0 ? 'UP' : 'DOWN';
      } else {
        nextDir = head.y >= GRID_ROWS / 2 ? 'UP' : 'DOWN';
      }
    }

    const gx = (clientX - offsetX) / cell;
    const gy = (clientY - offsetY) / cell;
    eng.queueDirection(nextDir);
    eng.spawnTapIndicator(gx, gy, nextDir);
  }, []);

  const startFreshRun = useCallback(() => {
    soundEngine.unlock();
    const eng = engineRef.current;
    if (!eng) return;
    setGameOverSummary(null);
    eng.startNewGame({
      difficulty: settingsRef.current.difficulty,
      specialFeatures: settingsRef.current.specialFeatures,
      bestScore: bestScoreRef.current,
    });
    soundEngine.startMusicLoop();
  }, []);

  const handleActivateSafetyCapsule = useCallback(() => {
    soundEngine.unlock();
    engineRef.current?.activateSafetyCapsule();
  }, []);

  const handleWatchAdToContinue = useCallback(async (): Promise<{
    ok: boolean;
    message?: string;
  }> => {
    const result = await adMobService.showReviveRewardedAd();
    if (result.rewarded) {
      const eng = engineRef.current;
      if (eng) {
        setGameOverSummary(null);
        eng.reviveWithReward(
          ADMOB_CONFIG.reviveReward.extraLives,
          ADMOB_CONFIG.reviveReward.safetyCapsules,
          ADMOB_CONFIG.reviveReward.safetyCapsuleDurationMs
        );
      }
      return { ok: true };
    }

    if (result.reason === 'dismissed') {
      return {
        ok: false,
        message: 'Watch the full video to unlock Continue, 3 Lives & 2 Safety Capsules.',
      };
    }

    return {
      ok: false,
      message: 'Video ad unavailable right now. Rewards require watching an ad — tap Play Again to continue.',
    };
  }, []);

  // Register imperative Android Back / Background Pause controls
  useEffect(() => {
    if (!controlRef) return;
    controlRef.current = {
      handleAndroidBack: () => {
        const eng = engineRef.current;
        if (!eng) return false;
        if (eng.phase === 'ACTIVE') {
          eng.pause();
          return true;
        }
        if (eng.phase === 'PAUSED') {
          eng.resume();
          return true;
        }
        if (eng.phase === 'GAME_OVER') {
          onExitToMenu();
          return true;
        }
        return false;
      },
      pauseFromBackground: () => {
        const eng = engineRef.current;
        if (eng && eng.phase === 'ACTIVE') {
          eng.pause();
        }
      },
    };
    return () => {
      controlRef.current = null;
    };
  }, [controlRef, onExitToMenu]);

  // Initialize engine, ResizeObserver, and RAF loop
  useEffect(() => {
    const engine = new SnakeEngine({
      onHudUpdate: (snapshot) => {
        setHud(snapshot);
      },
      onGameOver: (rawSummary) => {
        const enriched = onRunFinishedRef.current(rawSummary);
        setGameOverSummary(enriched);
        // Trigger frequency-capped Interstitial Video Ad non-blockingly on Game Over
        void adMobService.maybeShowInterstitialOnGameOver();
      },
    });
    engineRef.current = engine;

    engine.startNewGame({
      difficulty: settingsRef.current.difficulty,
      specialFeatures: settingsRef.current.specialFeatures,
      bestScore: bestScoreRef.current,
    });
    soundEngine.startMusicLoop();

    const canvas = canvasRef.current;
    const container = boardContainerRef.current;
    if (!canvas || !container) {
      return () => {
        soundEngine.stopMusicLoop();
      };
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return () => {
        soundEngine.stopMusicLoop();
      };
    }

    let viewWidth = 320;
    let viewHeight = 460;

    const resizeCanvas = () => {
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      viewWidth = Math.max(180, rect.width);
      viewHeight = Math.max(220, rect.height);
      canvas.width = Math.floor(viewWidth * dpr);
      canvas.height = Math.floor(viewHeight * dpr);
      canvas.style.width = `${viewWidth}px`;
      canvas.style.height = `${viewHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resizeCanvas();
    const resizeObserver = new ResizeObserver(resizeCanvas);
    resizeObserver.observe(container);

    let rafId = 0;
    let hudTimerCounter = 0;

    const frame = (now: number) => {
      const alpha = engine.update(now);
      renderSnakeArena(
        ctx,
        viewWidth,
        viewHeight,
        engine,
        alpha,
        now,
        reducedMotion
      );

      if (engine.activePowerUps.length > 0 || engine.safetyShieldExpiresAt > now) {
        hudTimerCounter++;
        if (hudTimerCounter % 5 === 0) {
          setNowTick(now);
        }
      }

      rafId = requestAnimationFrame(frame);
    };

    rafId = requestAnimationFrame(frame);

    const onVisibilityChange = () => {
      if (document.hidden && engine.phase === 'ACTIVE') {
        engine.pause();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      document.removeEventListener('visibilitychange', onVisibilityChange);
      soundEngine.stopMusicLoop();
      engineRef.current = null;
    };
  }, [reducedMotion]);

  // Keyboard controls (Arrows, WASD, Space/Esc/P for pause, Enter to restart on Game Over)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const eng = engineRef.current;
      if (!eng) return;

      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          e.preventDefault();
          handleDirectionInput('UP');
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          e.preventDefault();
          handleDirectionInput('DOWN');
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          e.preventDefault();
          handleDirectionInput('LEFT');
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          e.preventDefault();
          handleDirectionInput('RIGHT');
          break;
        case ' ':
        case 'p':
        case 'P':
        case 'Escape':
          e.preventDefault();
          if (eng.phase === 'ACTIVE') eng.pause();
          else if (eng.phase === 'PAUSED') eng.resume();
          break;
        case 'Enter':
          if (eng.phase === 'GAME_OVER') {
            e.preventDefault();
            startFreshRun();
          } else if (eng.phase === 'PAUSED') {
            e.preventDefault();
            eng.resume();
          }
          break;
        case 'c':
        case 'C':
        case 'Shift':
          if (eng.phase === 'ACTIVE' && eng.safetyCapsules > 0) {
            e.preventDefault();
            eng.activateSafetyCapsule();
          }
          break;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleDirectionInput, startFreshRun]);

  // Unified All-Screen Pointer Controller (Tap-to-Steer + Swipe anywhere below HUD)
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (engineRef.current?.phase !== 'ACTIVE') return;
    if (activePointerIdRef.current !== null) return;

    soundEngine.unlock();
    activePointerIdRef.current = e.pointerId;
    pointerOriginRef.current = { x: e.clientX, y: e.clientY };
    didSwipeRef.current = false;

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore if pointer capture is unsupported
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== activePointerIdRef.current || !pointerOriginRef.current) {
      return;
    }
    const dx = e.clientX - pointerOriginRef.current.x;
    const dy = e.clientY - pointerOriginRef.current.y;
    const threshold = SWIPE_THRESHOLD[settings.sensitivity];

    if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) {
      return;
    }

    const dir: Direction =
      Math.abs(dx) > Math.abs(dy)
        ? dx > 0
          ? 'RIGHT'
          : 'LEFT'
        : dy > 0
          ? 'DOWN'
          : 'UP';

    handleDirectionInput(dir);
    didSwipeRef.current = true;
    pointerOriginRef.current = { x: e.clientX, y: e.clientY };

    const canvas = canvasRef.current;
    const eng = engineRef.current;
    if (canvas && eng) {
      const rect = canvas.getBoundingClientRect();
      const cell = Math.min(rect.width / GRID_COLS, rect.height / GRID_ROWS);
      const boardW = cell * GRID_COLS;
      const boardH = cell * GRID_ROWS;
      const offsetX = rect.left + (rect.width - boardW) * 0.5;
      const offsetY = rect.top + (rect.height - boardH) * 0.5;
      eng.spawnTapIndicator(
        (e.clientX - offsetX) / cell,
        (e.clientY - offsetY) / cell,
        dir
      );
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== activePointerIdRef.current) return;

    if (!didSwipeRef.current) {
      steerFromTap(e.clientX, e.clientY);
    }

    activePointerIdRef.current = null;
    pointerOriginRef.current = null;
    didSwipeRef.current = false;
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerId === activePointerIdRef.current) {
      activePointerIdRef.current = null;
      pointerOriginRef.current = null;
      didSwipeRef.current = false;
    }
  };

  return (
    <div className="relative flex flex-col h-full w-full px-3 safe-pt safe-pb overflow-hidden touch-board">
      {/* Top HUD */}
      <header className="flex items-center justify-between gap-2 px-1 py-1.5 shrink-0">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="flex flex-col">
            <span className="text-[10px] font-medium text-slate-400 leading-none">
              Score
            </span>
            <span className="font-mono-num text-xl font-bold text-emerald-400 leading-tight">
              {hud.score}
            </span>
          </div>

          <div className="h-6 w-px bg-slate-800" aria-hidden="true" />

          <div className="flex flex-col">
            <span className="text-[10px] font-medium text-slate-400 leading-none">
              Best
            </span>
            <span className="font-mono-num text-base font-bold text-slate-100 leading-tight">
              {hud.bestScore}
            </span>
          </div>

          <div className="h-6 w-px bg-slate-800" aria-hidden="true" />

          <div className="flex flex-col">
            <span className="text-[10px] font-medium text-slate-400 leading-none">
              Level
            </span>
            <span className="font-mono-num text-base font-bold text-slate-100 leading-tight">
              {hud.level}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onToggleSound}
            aria-label={settings.soundEnabled ? 'Mute sound' : 'Unmute sound'}
            className="min-h-[44px] min-w-[44px] rounded-xl bg-[#0D1422] border border-slate-800 hover:border-slate-700 active:scale-95 transition-all flex items-center justify-center text-slate-200 focus-visible:outline-2 focus-visible:outline-emerald-400"
          >
            {settings.soundEnabled ? (
              <Volume2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <VolumeX className="w-4 h-4 text-slate-500" />
            )}
          </button>

          <button
            type="button"
            onClick={() => engineRef.current?.pause()}
            aria-label="Pause game"
            className="min-h-[44px] min-w-[44px] px-3 rounded-xl bg-[#0D1422] border border-slate-800 hover:border-slate-700 active:scale-95 transition-all flex items-center justify-center gap-1.5 text-slate-100 whitespace-nowrap focus-visible:outline-2 focus-visible:outline-emerald-400"
          >
            <Pause className="w-4 h-4" />
            <span className="text-xs font-semibold hidden sm:inline">Pause</span>
          </button>
        </div>
      </header>

      {/* Active Power-Up / Shield / Lives Strip */}
      <div className="min-h-[30px] px-1 flex items-center justify-between gap-2 shrink-0">
        {hud.safetyShieldExpiresAt > nowTick ? (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-300 whitespace-nowrap">
              <Shield className="w-3.5 h-3.5 shrink-0 fill-amber-400 text-amber-400" />
              <span>
                Shield{' '}
                {Math.max(
                  0.1,
                  (hud.safetyShieldExpiresAt - nowTick) / 1000
                ).toFixed(1)}
                s
              </span>
            </span>
            <div className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-amber-400"
                style={{
                  width: `${Math.max(
                    0,
                    Math.min(
                      100,
                      ((hud.safetyShieldExpiresAt - nowTick) /
                        hud.safetyShieldDurationMs) *
                        100
                    )
                  )}%`,
                }}
              />
            </div>
          </div>
        ) : hud.activePowerUps.length > 0 ? (
          <div className="flex items-center gap-3 flex-1 min-w-0 overflow-hidden">
            {hud.activePowerUps.map((p) => {
              const remaining = Math.max(0, p.expiresAt - nowTick);
              const pct = Math.max(0, Math.min(100, (remaining / p.durationMs) * 100));
              const accent =
                p.type === 'SPEED_BOOST'
                  ? 'bg-cyan-400 text-cyan-300'
                  : p.type === 'SLOW_MOTION'
                    ? 'bg-violet-400 text-violet-300'
                    : 'bg-pink-400 text-pink-300';
              const textColor = accent.split(' ')[1];
              const barColor = accent.split(' ')[0];

              return (
                <div
                  key={p.type}
                  className="flex items-center gap-2 flex-1 min-w-0"
                >
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-semibold whitespace-nowrap ${textColor}`}
                  >
                    <Zap className="w-3 h-3 shrink-0" />
                    <span>{p.label}</span>
                  </span>
                  <div className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${barColor}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-1 min-w-0 text-[11px] text-slate-500 truncate">
            <span>Tap or swipe anywhere to steer</span>
          </div>
        )}

        <div className="flex items-center gap-2 shrink-0">
          {hud.extraLives > 0 && (
            <span
              aria-label={`${hud.extraLives} extra lives remaining`}
              className="inline-flex items-center gap-1 text-xs font-bold text-rose-400 font-mono-num whitespace-nowrap"
            >
              <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
              <span>{hud.extraLives}</span>
            </span>
          )}

          {hud.safetyCapsules > 0 && (
            <button
              type="button"
              onClick={handleActivateSafetyCapsule}
              aria-label={`Activate 5-second safety shield (${hud.safetyCapsules} left)`}
              className="min-h-[32px] px-2.5 rounded-lg bg-amber-400/20 border border-amber-400/60 text-amber-300 hover:bg-amber-400/30 active:scale-95 transition-all inline-flex items-center gap-1 text-[11px] font-bold whitespace-nowrap focus-visible:outline-2 focus-visible:outline-amber-400"
            >
              <Shield className="w-3.5 h-3.5 shrink-0" />
              <span>Shield ×{hud.safetyCapsules}</span>
            </button>
          )}

          {hud.extraLives === 0 && hud.safetyCapsules === 0 && (
            <span className="text-[11px] text-slate-500 font-mono-num whitespace-nowrap">
              Food {hud.foodCollected}
            </span>
          )}
        </div>
      </div>

      {/* Full-Screen Playfield & All-Screen Controller */}
      <div
        ref={boardContainerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        className="flex-1 min-h-0 w-full flex items-center justify-center py-1.5 touch-board cursor-pointer"
      >
        <canvas
          ref={canvasRef}
          aria-label="Snake Arena game board — tap or swipe anywhere to steer"
          className="block rounded-xl"
        />
      </div>

      {/* Pause Overlay */}
      {hud.phase === 'PAUSED' && (
        <PauseModal
          score={hud.score}
          level={hud.level}
          settings={settings}
          onResume={() => engineRef.current?.resume()}
          onRestart={startFreshRun}
          onMainMenu={onExitToMenu}
          onToggleSound={onToggleSound}
          onToggleMusic={onToggleMusic}
        />
      )}

      {/* Game Over Overlay */}
      {hud.phase === 'GAME_OVER' && gameOverSummary && (
        <GameOverModal
          summary={gameOverSummary}
          onWatchAdToContinue={handleWatchAdToContinue}
          onPlayAgain={startFreshRun}
          onMainMenu={onExitToMenu}
        />
      )}
    </div>
  );
}
