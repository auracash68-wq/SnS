import { App as CapApp, type BackButtonListenerEvent } from '@capacitor/app';
import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { ScreenOrientation } from '@capacitor/screen-orientation';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';

export type HapticFeedbackKind = 'light' | 'medium' | 'heavy' | 'success' | 'error';

export function isNativeAndroid(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
}

export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

export async function initializeNativeShell(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    await StatusBar.setStyle({ style: Style.Dark });
    if (Capacitor.getPlatform() === 'android') {
      await StatusBar.setBackgroundColor({ color: '#05080F' });
    }
  } catch {
    // StatusBar may be managed by system edge-to-edge on newer Android builds
  }

  try {
    await ScreenOrientation.lock({ orientation: 'portrait' });
  } catch {
    // Orientation lock may be restricted on foldables/tablets
  }

  try {
    await SplashScreen.hide({ fadeOutDuration: 220 });
  } catch {
    // Splash screen already hidden
  }
}

export function triggerNativeHaptic(kind: HapticFeedbackKind): boolean {
  if (!Capacitor.isNativePlatform()) return false;

  try {
    switch (kind) {
      case 'light':
        void Haptics.impact({ style: ImpactStyle.Light });
        break;
      case 'medium':
        void Haptics.impact({ style: ImpactStyle.Medium });
        break;
      case 'heavy':
        void Haptics.impact({ style: ImpactStyle.Heavy });
        break;
      case 'success':
        void Haptics.notification({ type: NotificationType.Success });
        break;
      case 'error':
        void Haptics.notification({ type: NotificationType.Error });
        break;
    }
    return true;
  } catch {
    return false;
  }
}

export function registerNativeLifecycle(handlers: {
  onBackButton: (event: BackButtonListenerEvent) => void;
  onPauseBackground: () => void;
  onResumeForeground: () => void;
}): () => void {
  if (!Capacitor.isNativePlatform()) {
    return () => {};
  }

  const listenerPromises: Promise<PluginListenerHandle>[] = [
    CapApp.addListener('backButton', handlers.onBackButton),
    CapApp.addListener('appStateChange', ({ isActive }) => {
      if (isActive) {
        handlers.onResumeForeground();
      } else {
        handlers.onPauseBackground();
      }
    }),
    CapApp.addListener('pause', () => {
      handlers.onPauseBackground();
    }),
    CapApp.addListener('resume', () => {
      handlers.onResumeForeground();
    }),
  ];

  return () => {
    for (const p of listenerPromises) {
      void p
        .then((handle) => handle.remove())
        .catch(() => {
          // Listener already removed
        });
    }
  };
}

export async function exitNativeApp(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await CapApp.exitApp();
  } catch {
    // Ignore if platform restricts programmatic exit
  }
}
