import { Heart, Home, PlayCircle, RotateCcw, Shield, Trophy } from 'lucide-react';
import { useState } from 'react';
import { RunSummary } from '../types/game';
import { formatDifficultyLabel, formatDuration } from '../utils/format';

interface GameOverModalProps {
  summary: RunSummary;
  onWatchAdToContinue: () => Promise<{ ok: boolean; message?: string }>;
  onPlayAgain: () => void;
  onMainMenu: () => void;
}

export function GameOverModal({
  summary,
  onWatchAdToContinue,
  onPlayAgain,
  onMainMenu,
}: GameOverModalProps) {
  const [loadingAd, setLoadingAd] = useState(false);
  const [adStatusMessage, setAdStatusMessage] = useState<string | null>(null);

  const handleContinueClick = async () => {
    if (loadingAd) return;
    setLoadingAd(true);
    setAdStatusMessage(null);
    try {
      const result = await onWatchAdToContinue();
      if (!result.ok && result.message) {
        setAdStatusMessage(result.message);
      }
    } finally {
      setLoadingAd(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="gameover-title"
      className="absolute inset-0 z-30 flex items-center justify-center p-5 bg-[#05080F]/85 backdrop-blur-md"
    >
      <div className="w-full max-w-[340px] rounded-3xl bg-[#0D1422] border border-slate-800 p-6 shadow-2xl space-y-4">
        <div className="text-center space-y-1.5">
          {summary.isNewRecord ? (
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-400">
              <Trophy className="w-4 h-4" />
              <span>New High Score</span>
            </div>
          ) : (
            <div className="text-xs font-medium text-rose-400">
              {summary.deathReason === 'WALL'
                ? 'Arena Wall Impact'
                : 'Self Collision'}
            </div>
          )}

          <h2
            id="gameover-title"
            className="font-display text-3xl font-extrabold text-white tracking-tight"
          >
            Game Over
          </h2>
          <p className="text-xs text-slate-400">
            {formatDifficultyLabel(summary.difficulty)} Mode · Level {summary.level}
          </p>
        </div>

        {/* Score Highlight */}
        <div className="text-center py-3 rounded-2xl bg-[#080D18] border border-slate-800/80">
          <div className="text-xs font-medium text-slate-400">Final Score</div>
          <div className="font-mono-num text-4xl font-bold text-emerald-400 mt-0.5">
            {summary.score}
          </div>
        </div>

        {/* Run Breakdown Grid */}
        <div className="grid grid-cols-3 divide-x divide-slate-800 text-center py-1">
          <div className="px-1">
            <div className="text-[11px] text-slate-400">Best</div>
            <div className="font-mono-num text-base font-bold text-slate-100 mt-0.5">
              {summary.bestScore}
            </div>
          </div>
          <div className="px-1">
            <div className="text-[11px] text-slate-400">Food</div>
            <div className="font-mono-num text-base font-bold text-slate-100 mt-0.5">
              {summary.foodCollected}
            </div>
          </div>
          <div className="px-1">
            <div className="text-[11px] text-slate-400">Time</div>
            <div className="font-mono-num text-base font-bold text-slate-100 mt-0.5">
              {formatDuration(summary.durationMs)}
            </div>
          </div>
        </div>

        {/* Rewarded Video Continue CTA */}
        <div className="space-y-2 pt-0.5">
          <button
            type="button"
            disabled={loadingAd}
            onClick={handleContinueClick}
            className="w-full min-h-[54px] px-4 py-2.5 rounded-xl bg-gradient-to-b from-amber-400 to-amber-500 text-slate-950 font-display font-bold flex flex-col items-center justify-center shadow-lg shadow-amber-500/20 hover:brightness-105 active:scale-[0.98] disabled:opacity-65 transition-all"
          >
            <span className="flex items-center gap-2 text-sm sm:text-base whitespace-nowrap">
              <PlayCircle className="w-4 h-4 shrink-0" />
              <span>
                {loadingAd ? 'Loading Video Ad...' : 'Watch Ad to Continue'}
              </span>
            </span>
            <span className="flex items-center gap-2 text-[11px] font-semibold text-slate-900/85 mt-0.5 whitespace-nowrap">
              <span className="inline-flex items-center gap-1">
                <Heart className="w-3 h-3 fill-rose-600 text-rose-600" />
                3 Lives
              </span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1">
                <Shield className="w-3 h-3 fill-slate-950 text-slate-950" />
                2× 5s Shields
              </span>
            </span>
          </button>

          {adStatusMessage && (
            <p
              role="status"
              className="text-center text-[11px] text-amber-300/90 leading-snug px-1"
            >
              {adStatusMessage}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            disabled={loadingAd}
            onClick={onPlayAgain}
            className="w-full min-h-[48px] rounded-xl bg-gradient-to-b from-emerald-400 to-emerald-600 text-slate-950 font-display text-base font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 hover:brightness-105 active:scale-[0.98] disabled:opacity-60 transition-all whitespace-nowrap"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Play Again</span>
          </button>

          <button
            type="button"
            disabled={loadingAd}
            onClick={onMainMenu}
            className="w-full min-h-[44px] rounded-xl border border-slate-800 hover:bg-slate-900 text-slate-300 text-sm font-medium flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-60 transition-all whitespace-nowrap"
          >
            <Home className="w-4 h-4" />
            <span>Main Menu</span>
          </button>
        </div>
      </div>
    </div>
  );
}
