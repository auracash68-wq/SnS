import {
  Award,
  HelpCircle,
  Play,
  Settings,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { CareerStats, Difficulty, GameSettings } from '../types/game';
import { formatDifficultyLabel } from '../utils/format';
import { MenuHeroCanvas } from './MenuHeroCanvas';

interface MainMenuProps {
  settings: GameSettings;
  stats: CareerStats;
  reducedMotion: boolean;
  onPlay: () => void;
  onOpenHighScores: () => void;
  onOpenSettings: () => void;
  onOpenHowToPlay: () => void;
  onToggleSound: () => void;
  onSelectDifficulty: (diff: Difficulty) => void;
}

const DIFFICULTIES: Difficulty[] = ['EASY', 'NORMAL', 'HARD'];

export function MainMenu({
  settings,
  stats,
  reducedMotion,
  onPlay,
  onOpenHighScores,
  onOpenSettings,
  onOpenHowToPlay,
  onToggleSound,
  onSelectDifficulty,
}: MainMenuProps) {
  const modeBest = stats.bestByDifficulty[settings.difficulty] ?? 0;

  return (
    <div className="relative flex flex-col justify-between h-full w-full px-5 safe-pt safe-pb overflow-y-auto">
      {/* Top Bar: Sound Indicator & Quick Toggle */}
      <header className="flex items-center justify-between pt-1 pb-2 shrink-0">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span>Arcade Edition</span>
          <span aria-hidden="true">·</span>
          <span>{settings.specialFeatures ? 'Power-Ups On' : 'Classic Rules'}</span>
        </div>

        <button
          type="button"
          onClick={onToggleSound}
          aria-label={settings.soundEnabled ? 'Mute sound' : 'Enable sound'}
          className="min-h-[44px] min-w-[44px] px-3 flex items-center justify-center gap-2 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-200 hover:border-slate-700 active:scale-95 transition-transform whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-emerald-400"
        >
          {settings.soundEnabled ? (
            <Volume2 className="w-4 h-4 text-emerald-400" />
          ) : (
            <VolumeX className="w-4 h-4 text-slate-500" />
          )}
          <span className="text-xs font-medium">
            {settings.soundEnabled ? 'Sound On' : 'Muted'}
          </span>
        </button>
      </header>

      {/* Center Hero Brand & Animated Snake */}
      <main className="flex flex-col gap-4 my-auto py-2">
        <div className="text-center space-y-1.5">
          <h1 className="font-display text-4xl sm:text-[42px] font-extrabold tracking-tight text-white leading-none">
            SNAKE <span className="text-emerald-400">ARENA</span>
          </h1>
          <p className="text-sm text-slate-400">
            Precision grid survival with reactive speed &amp; power-ups
          </p>
        </div>

        <MenuHeroCanvas reducedMotion={reducedMotion} />

        {/* Best Score Summary Strip (Unboxed tabular metrics) */}
        <div className="grid grid-cols-3 divide-x divide-slate-800/90 rounded-2xl bg-[#0D1422] border border-slate-800/90 py-3 px-2">
          <div className="flex flex-col items-center justify-center px-2">
            <span className="text-[11px] font-medium text-slate-400">
              Best Score
            </span>
            <span className="font-mono-num text-xl font-bold text-emerald-400 mt-0.5">
              {stats.bestScore}
            </span>
          </div>
          <div className="flex flex-col items-center justify-center px-2">
            <span className="text-[11px] font-medium text-slate-400">
              {formatDifficultyLabel(settings.difficulty)} Best
            </span>
            <span className="font-mono-num text-xl font-bold text-slate-100 mt-0.5">
              {modeBest}
            </span>
          </div>
          <div className="flex flex-col items-center justify-center px-2">
            <span className="text-[11px] font-medium text-slate-400">
              Games
            </span>
            <span className="font-mono-num text-xl font-bold text-slate-100 mt-0.5">
              {stats.totalGamesPlayed}
            </span>
          </div>
        </div>

        {/* Difficulty Selector */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span className="font-medium text-slate-300">Speed Mode</span>
            <span>
              {settings.difficulty === 'EASY'
                ? 'Gentle & kid-friendly'
                : settings.difficulty === 'NORMAL'
                  ? 'Balanced arcade'
                  : 'High-speed reflex'}
            </span>
          </div>
          <div
            role="group"
            aria-label="Select difficulty"
            className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-[#0D1422] border border-slate-800"
          >
            {DIFFICULTIES.map((diff) => {
              const active = settings.difficulty === diff;
              return (
                <button
                  key={diff}
                  type="button"
                  onClick={() => onSelectDifficulty(diff)}
                  className={`min-h-[44px] rounded-lg text-xs font-semibold transition-all whitespace-nowrap focus-visible:outline-2 focus-visible:outline-emerald-400 ${
                    active
                      ? 'bg-emerald-500 text-slate-950 shadow-sm shadow-emerald-500/25'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  {formatDifficultyLabel(diff)}
                </button>
              );
            })}
          </div>
        </div>
      </main>

      {/* Primary Action & Secondary Navigation */}
      <footer className="flex flex-col gap-2.5 pt-2 pb-2 shrink-0">
        <button
          type="button"
          onClick={onPlay}
          className="w-full min-h-[54px] rounded-2xl bg-gradient-to-b from-emerald-400 to-emerald-600 text-slate-950 font-display text-lg font-bold tracking-wide flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-500/20 hover:brightness-105 active:scale-[0.98] transition-all whitespace-nowrap focus-visible:outline-2 focus-visible:outline-white"
        >
          <Play className="w-5 h-5 fill-slate-950" />
          <span>Play Now</span>
        </button>

        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={onOpenHighScores}
            className="min-h-[48px] px-2 rounded-xl bg-[#0E1626] border border-slate-800 text-slate-200 hover:border-slate-700 hover:bg-slate-800/80 active:scale-[0.97] transition-all flex flex-col items-center justify-center gap-1 whitespace-nowrap focus-visible:outline-2 focus-visible:outline-emerald-400"
          >
            <Award className="w-4 h-4 text-amber-400" />
            <span className="text-[11px] font-medium">High Scores</span>
          </button>

          <button
            type="button"
            onClick={onOpenHowToPlay}
            className="min-h-[48px] px-2 rounded-xl bg-[#0E1626] border border-slate-800 text-slate-200 hover:border-slate-700 hover:bg-slate-800/80 active:scale-[0.97] transition-all flex flex-col items-center justify-center gap-1 whitespace-nowrap focus-visible:outline-2 focus-visible:outline-emerald-400"
          >
            <HelpCircle className="w-4 h-4 text-cyan-400" />
            <span className="text-[11px] font-medium">How to Play</span>
          </button>

          <button
            type="button"
            onClick={onOpenSettings}
            className="min-h-[48px] px-2 rounded-xl bg-[#0E1626] border border-slate-800 text-slate-200 hover:border-slate-700 hover:bg-slate-800/80 active:scale-[0.97] transition-all flex flex-col items-center justify-center gap-1 whitespace-nowrap focus-visible:outline-2 focus-visible:outline-emerald-400"
          >
            <Settings className="w-4 h-4 text-slate-300" />
            <span className="text-[11px] font-medium">Settings</span>
          </button>
        </div>
      </footer>
    </div>
  );
}
