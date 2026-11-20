import { Difficulty } from '../types/game';

export function formatDuration(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function formatDifficultyLabel(diff: Difficulty): string {
  switch (diff) {
    case 'EASY':
      return 'Easy';
    case 'NORMAL':
      return 'Normal';
    case 'HARD':
      return 'Hard';
  }
}

export function formatShortDate(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return 'Recent';
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return 'Recent';
  }
}
