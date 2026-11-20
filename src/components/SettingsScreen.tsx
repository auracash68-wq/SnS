import { ArrowLeft, Music, Smartphone, Trash2, Volume2, Zap } from 'lucide-react';
import { useState } from 'react';
import {
  ControlSensitivity,
  Difficulty,
  GameSettings,
} from '../types/game';
import { formatDifficultyLabel } from '../utils/format';

interface SettingsScreenProps {
  settings: GameSettings;
  bestScore: number;
  onUpdateSettings: (patch: Partial<GameSettings>) => void;
  onResetHighScores: () => void;
  onBack: () => void;
}

const DIFFICULTIES: Difficulty[] = ['EASY', 'NORMAL', 'HARD'];
const SENSITIVITIES: ControlSensitivity[] = ['LOW', 'MEDIUM', 'HIGH'];

export function SettingsScreen({
  settings,
  bestScore,
  onUpdateSettings,
  onResetHighScores,
  onBack,
}: SettingsScreenProps) {
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  const handleConfirmReset = () => {
    onResetHighScores();
    setConfirmReset(false);
    setResetDone(true);
    window.setTimeout(() => setResetDone(false), 2200);
  };

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

        <h1 className="font-display text-lg font-bold text-white">Settings</h1>
        <div className="w-16" aria-hidden="true" />
      </header>

      {/* Scrollable Preferences */}
      <main className="flex-1 overflow-y-auto space-y-5 py-3 pr-0.5">
        {/* Audio & Haptics */}
        <section className="space-y-2">
          <h2 className="text-xs font-semibold text-slate-400 px-1">
            Audio &amp; Feedback
          </h2>

          <div className="rounded-2xl bg-[#0D1422] border border-slate-800 divide-y divide-slate-800/80">
            <ToggleRow
              icon={<Volume2 className="w-4 h-4 text-emerald-400" />}
              title="Sound Effects"
              description="Arcade clicks, food chimes, and alerts"
              enabled={settings.soundEnabled}
              onToggle={() =>
                onUpdateSettings({ soundEnabled: !settings.soundEnabled })
              }
            />

            <ToggleRow
              icon={<Music className="w-4 h-4 text-cyan-400" />}
              title="Arcade Music"
              description="Synthesized background pulse during play"
              enabled={settings.musicEnabled}
              onToggle={() =>
                onUpdateSettings({ musicEnabled: !settings.musicEnabled })
              }
            />

            <ToggleRow
              icon={<Smartphone className="w-4 h-4 text-violet-400" />}
              title="Vibration Feedback"
              description="Haptic pulse on food &amp; collisions"
              enabled={settings.vibrationEnabled}
              onToggle={() =>
                onUpdateSettings({
                  vibrationEnabled: !settings.vibrationEnabled,
                })
              }
            />
          </div>
        </section>

        {/* Gameplay & Controls */}
        <section className="space-y-2">
          <h2 className="text-xs font-semibold text-slate-400 px-1">
            Gameplay &amp; Controls
          </h2>

          <div className="rounded-2xl bg-[#0D1422] border border-slate-800 p-4 space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-100">
                  Difficulty Mode
                </span>
                <span className="text-xs text-slate-400">
                  {settings.difficulty === 'EASY'
                    ? 'Slow & forgiving'
                    : settings.difficulty === 'NORMAL'
                      ? 'Balanced speed'
                      : 'Fast reflex'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-[#080D18] border border-slate-800">
                {DIFFICULTIES.map((diff) => {
                  const active = settings.difficulty === diff;
                  return (
                    <button
                      key={diff}
                      type="button"
                      onClick={() => onUpdateSettings({ difficulty: diff })}
                      className={`min-h-[42px] rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                        active
                          ? 'bg-emerald-500 text-slate-950'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      {formatDifficultyLabel(diff)}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2 pt-1 border-t border-slate-800/80">
              <div className="flex items-center justify-between pt-2">
                <span className="text-sm font-semibold text-slate-100">
                  Swipe Sensitivity
                </span>
                <span className="text-xs text-slate-400">
                  {settings.sensitivity === 'LOW'
                    ? 'Longer swipe'
                    : settings.sensitivity === 'MEDIUM'
                      ? 'Balanced'
                      : 'Instant flick'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-[#080D18] border border-slate-800">
                {SENSITIVITIES.map((sens) => {
                  const active = settings.sensitivity === sens;
                  return (
                    <button
                      key={sens}
                      type="button"
                      onClick={() => onUpdateSettings({ sensitivity: sens })}
                      className={`min-h-[42px] rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                        active
                          ? 'bg-cyan-400 text-slate-950'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      {sens === 'LOW'
                        ? 'Low'
                        : sens === 'MEDIUM'
                          ? 'Medium'
                          : 'High'}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800/80">
              <ToggleRow
                icon={<Zap className="w-4 h-4 text-amber-400" />}
                title="Special Power-Ups"
                description="Bonus stars, speed boost, slow-mo &amp; 2x"
                enabled={settings.specialFeatures}
                compact
                onToggle={() =>
                  onUpdateSettings({
                    specialFeatures: !settings.specialFeatures,
                  })
                }
              />
            </div>
          </div>
        </section>

        {/* Data Management */}
        <section className="space-y-2 pb-4">
          <h2 className="text-xs font-semibold text-slate-400 px-1">
            Saved Records
          </h2>

          <div className="rounded-2xl bg-[#0D1422] border border-slate-800 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-100">
                  Reset High Scores
                </div>
                <div className="text-xs text-slate-400">
                  Current best score: <span className="font-mono-num text-slate-200">{bestScore}</span>
                </div>
              </div>

              {!confirmReset && (
                <button
                  type="button"
                  onClick={() => setConfirmReset(true)}
                  className="min-h-[44px] px-3.5 rounded-xl bg-rose-500/15 border border-rose-500/35 text-rose-300 hover:bg-rose-500/25 active:scale-95 transition-all text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Reset</span>
                </button>
              )}
            </div>

            {confirmReset && (
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                <span className="text-xs text-rose-300">
                  Clear all scores &amp; history?
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setConfirmReset(false)}
                    className="min-h-[40px] px-3 rounded-lg bg-slate-800 text-slate-200 text-xs font-medium whitespace-nowrap"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmReset}
                    className="min-h-[40px] px-3 rounded-lg bg-rose-500 text-white text-xs font-semibold whitespace-nowrap"
                  >
                    Confirm Reset
                  </button>
                </div>
              </div>
            )}

            {resetDone && (
              <p className="text-xs text-emerald-400 font-medium">
                All high scores and run records have been cleared.
              </p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

interface ToggleRowProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  enabled: boolean;
  compact?: boolean;
  onToggle: () => void;
}

function ToggleRow({
  icon,
  title,
  description,
  enabled,
  compact = false,
  onToggle,
}: ToggleRowProps) {
  return (
    <div
      className={`flex items-center justify-between gap-3 ${
        compact ? 'py-1' : 'px-4 py-3.5'
      }`}
    >
      <div className="flex items-start gap-3 min-w-0">
        <div className="mt-0.5 shrink-0">{icon}</div>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-100">{title}</div>
          <div className="text-xs text-slate-400 leading-snug">{description}</div>
        </div>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label={title}
        onClick={onToggle}
        className={`relative min-h-[44px] min-w-[54px] flex items-center justify-center shrink-0 focus-visible:outline-2 focus-visible:outline-emerald-400 rounded-xl`}
      >
        <span
          className={`w-12 h-7 rounded-full transition-colors flex items-center px-1 ${
            enabled ? 'bg-emerald-500' : 'bg-slate-700'
          }`}
        >
          <span
            className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
              enabled ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </span>
      </button>
    </div>
  );
}
