import { Home, Music, Play, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { GameSettings } from '../types/game';

interface PauseModalProps {
  score: number;
  level: number;
  settings: GameSettings;
  onResume: () => void;
  onRestart: () => void;
  onMainMenu: () => void;
  onToggleSound: () => void;
  onToggleMusic: () => void;
}

export function PauseModal({
  score,
  level,
  settings,
  onResume,
  onRestart,
  onMainMenu,
  onToggleSound,
  onToggleMusic,
}: PauseModalProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pause-title"
      className="absolute inset-0 z-30 flex items-center justify-center p-5 bg-[#05080F]/82 backdrop-blur-md"
    >
      <div className="w-full max-w-[330px] rounded-3xl bg-[#0D1422] border border-slate-800 p-6 shadow-2xl space-y-5">
        <div className="text-center space-y-1">
          <h2
            id="pause-title"
            className="font-display text-2xl font-bold text-white"
          >
            Game Paused
          </h2>
          <p className="text-xs text-slate-400 font-mono-num">
            Score {score} · Level {level}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={onToggleSound}
            className="min-h-[46px] px-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 active:scale-95 transition-all flex items-center justify-center gap-2 text-xs font-medium text-slate-200 whitespace-nowrap"
          >
            {settings.soundEnabled ? (
              <Volume2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <VolumeX className="w-4 h-4 text-slate-500" />
            )}
            <span>{settings.soundEnabled ? 'SFX On' : 'SFX Off'}</span>
          </button>

          <button
            type="button"
            onClick={onToggleMusic}
            className="min-h-[46px] px-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 active:scale-95 transition-all flex items-center justify-center gap-2 text-xs font-medium text-slate-200 whitespace-nowrap"
          >
            <Music
              className={`w-4 h-4 ${
                settings.musicEnabled ? 'text-emerald-400' : 'text-slate-500'
              }`}
            />
            <span>{settings.musicEnabled ? 'Music On' : 'Music Off'}</span>
          </button>
        </div>

        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onResume}
            className="w-full min-h-[48px] rounded-xl bg-gradient-to-b from-emerald-400 to-emerald-600 text-slate-950 font-display text-base font-bold flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20 hover:brightness-105 active:scale-[0.98] transition-all whitespace-nowrap"
          >
            <Play className="w-4 h-4 fill-slate-950" />
            <span>Resume</span>
          </button>

          <button
            type="button"
            onClick={onRestart}
            className="w-full min-h-[46px] rounded-xl bg-slate-800/90 hover:bg-slate-800 text-slate-100 text-sm font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-all whitespace-nowrap"
          >
            <RotateCcw className="w-4 h-4 text-slate-300" />
            <span>Restart Run</span>
          </button>

          <button
            type="button"
            onClick={onMainMenu}
            className="w-full min-h-[44px] rounded-xl border border-slate-800 hover:bg-slate-900 text-slate-300 text-sm font-medium flex items-center justify-center gap-2 active:scale-[0.98] transition-all whitespace-nowrap"
          >
            <Home className="w-4 h-4" />
            <span>Main Menu</span>
          </button>
        </div>
      </div>
    </div>
  );
}
