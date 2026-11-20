import {
  AlertTriangle,
  ArrowLeft,
  Compass,
  Gamepad2,
  Play,
  Sparkles,
  Star,
  Zap,
} from 'lucide-react';

interface HowToPlayScreenProps {
  onBack: () => void;
  onStartPlay: () => void;
}

export function HowToPlayScreen({ onBack, onStartPlay }: HowToPlayScreenProps) {
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

        <h1 className="font-display text-lg font-bold text-white">
          How to Play
        </h1>
        <div className="w-16" aria-hidden="true" />
      </header>

      <main className="flex-1 overflow-y-auto space-y-4 py-3 pr-0.5">
        {/* Core Movement & Growth */}
        <section className="rounded-2xl bg-[#0D1422] border border-slate-800 p-4 space-y-3">
          <div className="flex items-center gap-2 text-emerald-400">
            <Compass className="w-4 h-4 shrink-0" />
            <h2 className="text-sm font-bold text-white">
              Snake Movement &amp; Scoring
            </h2>
          </div>
          <ul className="space-y-2 text-xs text-slate-300 leading-relaxed">
            <li>
              Guide the neon snake continuously across the grid in four
              directions. You cannot reverse directly into the opposite direction
              in a single turn.
            </li>
            <li>
              Every <span className="text-rose-400 font-semibold">Ruby Apple</span>{' '}
              collected grows your snake by 1 segment and awards{' '}
              <span className="font-mono-num text-white">+10 pts</span>.
            </li>
            <li>
              Every 5 foods eaten advances your{' '}
              <span className="text-emerald-400 font-semibold">Level</span> and
              gradually increases movement speed.
            </li>
          </ul>
        </section>

        {/* Special Food & Power-ups */}
        <section className="rounded-2xl bg-[#0D1422] border border-slate-800 p-4 space-y-3">
          <div className="flex items-center gap-2 text-amber-400">
            <Sparkles className="w-4 h-4 shrink-0" />
            <h2 className="text-sm font-bold text-white">
              Special Food &amp; Power-Ups
            </h2>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-full bg-rose-500/20 border border-rose-400/50 flex items-center justify-center shrink-0">
                <span className="w-3 h-3 rounded-full bg-rose-400" />
              </span>
              <div>
                <span className="font-semibold text-slate-100">Normal Food</span>
                <span className="text-slate-400"> · +10 pts and +1 length</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-full bg-amber-500/20 border border-amber-400/50 flex items-center justify-center shrink-0">
                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              </span>
              <div>
                <span className="font-semibold text-slate-100">Bonus Star</span>
                <span className="text-slate-400">
                  {' '}
                  · Timed golden orb worth +35 pts
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-full bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center shrink-0">
                <Zap className="w-3.5 h-3.5 text-cyan-400" />
              </span>
              <div>
                <span className="font-semibold text-slate-100">Speed Boost</span>
                <span className="text-slate-400">
                  {' '}
                  · +15 pts &amp; temporary turbo speed
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-full bg-violet-500/20 border border-violet-400/50 flex items-center justify-center shrink-0 text-[11px] font-bold text-violet-300">
                ⧖
              </span>
              <div>
                <span className="font-semibold text-slate-100">Slow Motion</span>
                <span className="text-slate-400">
                  {' '}
                  · +15 pts &amp; calm precision pacing
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-full bg-pink-500/20 border border-pink-400/50 flex items-center justify-center shrink-0 text-[11px] font-bold text-pink-300">
                2×
              </span>
              <div>
                <span className="font-semibold text-slate-100">
                  Score Multiplier
                </span>
                <span className="text-slate-400">
                  {' '}
                  · Doubles all points for 10 seconds
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Hazards */}
        <section className="rounded-2xl bg-[#0D1422] border border-slate-800 p-4 space-y-2.5">
          <div className="flex items-center gap-2 text-rose-400">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <h2 className="text-sm font-bold text-white">
              Collisions &amp; Hazards
            </h2>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Hitting the glowing arena border walls or colliding with any segment
            of your own body ends the run immediately.
          </p>
        </section>

        {/* Controls */}
        <section className="rounded-2xl bg-[#0D1422] border border-slate-800 p-4 space-y-2.5">
          <div className="flex items-center gap-2 text-cyan-400">
            <Gamepad2 className="w-4 h-4 shrink-0" />
            <h2 className="text-sm font-bold text-white">
              Mobile &amp; Keyboard Controls
            </h2>
          </div>
          <ul className="space-y-1.5 text-xs text-slate-300 leading-relaxed">
            <li>
              <span className="font-semibold text-white">Tap Anywhere:</span>{' '}
              Tap any spot on the screen to steer toward that side of the snake
              (left/right when moving vertically, up/down when moving
              horizontally).
            </li>
            <li>
              <span className="font-semibold text-white">Swipe Anywhere:</span>{' '}
              Slide your finger in any direction anywhere on the screen. Adjust
              sensitivity in Settings.
            </li>
            <li>
              <span className="font-semibold text-white">Keyboard:</span>{' '}
              Arrow keys or WASD to steer · Space or Esc to Pause · Enter to
              Play Again.
            </li>
          </ul>
        </section>
      </main>

      <footer className="pt-2 pb-2 shrink-0">
        <button
          type="button"
          onClick={onStartPlay}
          className="w-full min-h-[48px] rounded-xl bg-gradient-to-b from-emerald-400 to-emerald-600 text-slate-950 font-display text-base font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all whitespace-nowrap"
        >
          <Play className="w-4 h-4 fill-slate-950" />
          <span>Start Playing</span>
        </button>
      </footer>
    </div>
  );
}
