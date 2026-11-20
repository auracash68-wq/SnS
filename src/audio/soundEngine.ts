import { type HapticFeedbackKind, triggerNativeHaptic } from '../native/androidBridge';

class ArcadeAudioEngine {
  private ctx: AudioContext | null = null;
  private soundEnabled = true;
  private musicEnabled = true;
  private vibrationEnabled = true;
  private musicTimer: number | null = null;
  private musicStep = 0;
  private isPlayingMusic = false;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {
        // Autoplay blocked until next gesture
      });
    }
    return this.ctx;
  }

  public unlock(): void {
    this.ensureContext();
  }

  public suspendForBackground(): void {
    this.stopMusicLoop();
    if (this.ctx && this.ctx.state === 'running') {
      this.ctx.suspend().catch(() => {
        // Ignore suspend errors
      });
    }
  }

  public configure(opts: {
    soundEnabled: boolean;
    musicEnabled: boolean;
    vibrationEnabled: boolean;
  }): void {
    this.soundEnabled = opts.soundEnabled;
    this.musicEnabled = opts.musicEnabled;
    this.vibrationEnabled = opts.vibrationEnabled;

    if (!this.musicEnabled && this.isPlayingMusic) {
      this.stopMusicLoop();
    }
  }

  public vibrate(pattern: number | number[], nativeKind: HapticFeedbackKind = 'light'): void {
    if (!this.vibrationEnabled) return;
    if (triggerNativeHaptic(nativeKind)) return;
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate(pattern);
      }
    } catch {
      // Vibration unsupported or blocked
    }
  }

  private playTone(
    freq: number,
    duration: number,
    type: OscillatorType,
    volume: number,
    slideToFreq?: number,
    delay = 0
  ): void {
    if (!this.soundEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const startTime = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);
    if (slideToFreq) {
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(20, slideToFreq),
        startTime + duration
      );
    }

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(volume, startTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.02);
  }

  public playClick(): void {
    this.playTone(580, 0.055, 'triangle', 0.08, 420);
  }

  public playTurn(): void {
    this.playTone(210, 0.03, 'sine', 0.03, 250);
  }

  public playEatNormal(): void {
    this.playTone(520, 0.075, 'triangle', 0.12, 780);
    this.playTone(780, 0.09, 'sine', 0.09, 1040, 0.045);
    this.vibrate(14, 'light');
  }

  public playEatBonus(): void {
    this.playTone(587.33, 0.08, 'triangle', 0.13);
    this.playTone(783.99, 0.08, 'triangle', 0.13, undefined, 0.06);
    this.playTone(1046.5, 0.14, 'sine', 0.14, 1318.5, 0.12);
    this.vibrate([18, 25, 22], 'success');
  }

  public playPowerUp(): void {
    this.playTone(440, 0.08, 'sawtooth', 0.06, 660);
    this.playTone(660, 0.08, 'triangle', 0.09, 880, 0.06);
    this.playTone(880, 0.15, 'sine', 0.1, 1180, 0.12);
    this.vibrate([20, 20, 30], 'medium');
  }

  public playLevelUp(): void {
    this.playTone(523.25, 0.09, 'triangle', 0.1);
    this.playTone(659.25, 0.09, 'triangle', 0.1, undefined, 0.08);
    this.playTone(783.99, 0.18, 'sine', 0.12, undefined, 0.16);
  }

  public playPause(): void {
    this.playTone(480, 0.07, 'triangle', 0.09, 320);
    this.playTone(320, 0.09, 'triangle', 0.08, 220, 0.06);
  }

  public playResume(): void {
    this.playTone(320, 0.07, 'triangle', 0.08, 480);
    this.playTone(480, 0.09, 'triangle', 0.09, 640, 0.06);
  }

  public playGameOver(): void {
    this.stopMusicLoop();
    this.playTone(330, 0.14, 'sawtooth', 0.1, 240);
    this.playTone(240, 0.16, 'sawtooth', 0.1, 165, 0.12);
    this.playTone(165, 0.28, 'triangle', 0.12, 95, 0.25);
    this.vibrate([45, 35, 70], 'error');
  }

  public playNewRecord(): void {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, idx) => {
      this.playTone(n, 0.14, 'triangle', 0.12, undefined, idx * 0.09);
    });
  }

  public startMusicLoop(): void {
    if (!this.musicEnabled || this.isPlayingMusic) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    this.isPlayingMusic = true;
    const pattern = [
      130.81, 0, 196.0, 0, 155.56, 0, 196.0, 174.61,
      130.81, 0, 233.08, 0, 196.0, 0, 155.56, 0,
    ];

    const stepTick = () => {
      if (!this.isPlayingMusic || !this.musicEnabled) return;
      const audioCtx = this.ctx;
      if (!audioCtx || audioCtx.state !== 'running') return;

      const freq = pattern[this.musicStep % pattern.length];
      this.musicStep++;

      if (freq > 0) {
        const now = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const filter = audioCtx.createBiquadFilter();
        const gain = audioCtx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(520, now);

        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(0.032, now + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start(now);
        osc.stop(now + 0.18);
      }
    };

    stepTick();
    this.musicTimer = window.setInterval(stepTick, 190);
  }

  public stopMusicLoop(): void {
    this.isPlayingMusic = false;
    if (this.musicTimer !== null) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }
}

export const soundEngine = new ArcadeAudioEngine();
