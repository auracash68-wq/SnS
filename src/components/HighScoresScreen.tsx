import { ArrowLeft, Play, Trophy } from 'lucide-react';
import { CareerStats } from '../types/game';
import {
  formatDifficultyLabel,
  formatDuration,
  formatShortDate,
} from '../utils/format';

interface HighScoresScreenProps {
  stats: CareerStats;
  onBack: () => void;
  onStartPlay: () => void;
}

export function HighScoresScreen({
  stats,
  onBack,
  onStartPlay,
}: HighScoresScreenProps) {
  return (
    <div className="flex flex-col h-full w-full px-5 safe-pt safe-pb overflow-hidden">
      {/* Top Bar */}
      <header className="flex items-center justify-between py-2 shrink-0">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to main menu"
          className="min-h-[44px] min-w-[44px] -ml-2 px-2 flex items-center gap-1.5 rounded-xl text-slate-200 hover:text-white hover:bg-slate-900 active:scale-95 transition-all whitespace-nowrap focus-visible:outline-2 focus-visible:outline-emerald-400"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Back</span>
        </button>

        <h1 className="font-display text-lg font-bold text-white">High Scores</h1>
        <div className="w-16" aria-hidden="true" />
      </header>

      <main className="flex-1 overflow-y-auto space-y-5 py-3 pr-0.5">
        {/* Overall Record */}
        <section className="rounded-2xl bg-[#0D1422] border border-slate-800 p-4 text-center space-y-1">
          <div className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-400">
            <Trophy className="w-4 h-4" />
            <span>All-Time Best Score</span>
          </div>
          <div className="font-mono-num text-4xl font-bold text-emerald-400">
            {stats.bestScore}
          </div>
          <p className="text-xs text-slate-400 font-mono-num">
            {stats.totalGamesPlayed} games · {stats.totalFoodCollected} food ·{' '}
            {formatDuration(stats.bestDurationMs)} longest
          </p>
        </section>

        {/* Best By Difficulty */}
        <section className="space-y-2">
          <h2 className="text-xs font-semibold text-slate-400 px-1">
            Best by Difficulty
          </h2>
          <div className="grid grid-cols-3 divide-x divide-slate-800 rounded-2xl bg-[#0D1422] border border-slate-800 py-3">
            <div className="text-center px-2">
              <div className="text-[11px] text-slate-400">Easy</div>
              <div className="font-mono-num text-lg font-bold text-slate-100 mt-0.5">
                {stats.bestByDifficulty.EASY}
              </div>
            </div>
            <div className="text-center px-2">
              <div className="text-[11px] text-slate-400">Normal</div>
              <div className="font-mono-num text-lg font-bold text-slate-100 mt-0.5">
                {stats.bestByDifficulty.NORMAL}
              </div>
            </div>
            <div className="text-center px-2">
              <div className="text-[11px] text-slate-400">Hard</div>
              <div className="font-mono-num text-lg font-bold text-slate-100 mt-0.5">
                {stats.bestByDifficulty.HARD}
              </div>
            </div>
          </div>
        </section>

        {/* Top Runs Leaderboard */}
        <section className="space-y-2 pb-4">
          <h2 className="text-xs font-semibold text-slate-400 px-1">
            Top Saved Runs
          </h2>

          {stats.recentRuns.length === 0 ? (
            <div className="rounded-2xl bg-[#0D1422] border border-slate-800 p-6 text-center space-y-3">
              <p className="text-sm text-slate-300">
                No completed runs recorded yet.
              </p>
              <p className="text-xs text-slate-400">
                Complete a game in any difficulty mode to save your personal
                leaderboard.
              </p>
              <button
                type="button"
                onClick={onStartPlay}
                className="min-h-[44px] px-5 rounded-xl bg-emerald-500 text-slate-950 font-semibold text-sm inline-flex items-center gap-2 active:scale-95 transition-transform"
              >
                <Play className="w-4 h-4 fill-slate-950" />
                <span>Play First Run</span>
              </button>
            </div>
          ) : (
            <div className="rounded-2xl bg-[#0D1422] border border-slate-800 divide-y divide-slate-800/80">
              {stats.recentRuns.map((run, index) => (
                <div
                  key={run.id}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`font-mono-num text-sm font-bold w-6 text-center ${
                        index === 0
                          ? 'text-amber-400'
                          : index === 1
                            ? 'text-slate-200'
                            : index === 2
                              ? 'text-amber-600'
                              : 'text-slate-500'
                      }`}
                    >
                      {index + 1}.
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-100 truncate">
                        {formatDifficultyLabel(run.difficulty)} · Level{' '}
                        {run.level}
                      </div>
                      <div className="text-xs text-slate-400 font-mono-num">
                        {run.foodCollected} food ·{' '}
                        {formatDuration(run.durationMs)} ·{' '}
                        {formatShortDate(run.dateIso)}
                      </div>
                    </div>
                  </div>

                  <div className="font-mono-num text-lg font-bold text-emerald-400 shrink-0">
                    {run.score}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
