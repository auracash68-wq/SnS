# Third-Party Licenses & Attribution — Snake Arena

This document records the open-source packages, native SDKs, and bundled/linked assets verified during the build and compliance audit.

## 1. Direct JavaScript / Capacitor Dependencies

| Package | License | Category |
| :--- | :--- | :--- |
| `@capacitor-community/admob` | MIT | Android AdMob Bridge |
| `@capacitor/android` | MIT | Android Native Runtime |
| `@capacitor/app` | MIT | Lifecycle / Back Button |
| `@capacitor/cli` | MIT | Build Tooling |
| `@capacitor/core` | MIT | Core Bridge |
| `@capacitor/haptics` | MIT | Tactile Feedback |
| `@capacitor/screen-orientation` | MIT | Portrait Lock |
| `@capacitor/splash-screen` | MIT | Native Splash Screen |
| `@capacitor/status-bar` | MIT | Status Bar Styling |
| `@google/genai` | Apache-2.0 | Base Template Dependency |
| `@tailwindcss/vite` | MIT | Build Tooling |
| `@vitejs/plugin-react` | MIT | Build Tooling |
| `dotenv` | BSD-2-Clause | Configuration Utility |
| `express` | MIT | Server Utility |
| `lucide-react` | ISC | UI Icons |
| `motion` | MIT | UI Animations |
| `react` | MIT | UI Framework |
| `react-dom` | MIT | UI Renderer |
| `vite` | MIT | Web Bundler |
| `@types/express`, `@types/node`, `@types/react`, `@types/react-dom` | MIT | TypeScript Dev Types |
| `autoprefixer` | MIT | CSS Dev Tooling |
| `esbuild` | MIT | Build Tooling |
| `tailwindcss` | MIT | CSS Framework |
| `tsx` | MIT | TypeScript Runner |
| `typescript` | Apache-2.0 | Compiler |

## 2. Transitive npm Dependencies Summary (272 Scanned)

- **Permissive licenses**: MIT (212), ISC (15), Apache-2.0 (13), BSD-3-Clause (13), BlueOak-1.0.0 (12), Unlicense (2), BSD-2-Clause (1), 0BSD (1).
- **Weak-copyleft / attribution build-time tools (not bundled in the Android APK)**:
  - `lightningcss` & `lightningcss-linux-x64-gnu` (`MPL-2.0`) — used only at build time by Tailwind/Vite CSS optimization.
  - `caniuse-lite` (`CC-BY-4.0`) — browser compatibility database used only at build time.
- **Strong copyleft (GPL / LGPL / AGPL)**: None detected (`0`).
- **Unknown / Unlicensed packages**: None detected (`0`).

## 3. Native Android & Proprietary SDK Dependencies

- **AndroidX libraries** (`appcompat`, `coordinatorlayout`, `core-splashscreen`, `webkit`): `Apache-2.0`
- **Google Mobile Ads SDK (`com.google.android.gms:play-services-ads`) & Google UMP SDK**: Governed by the Google Play Services / Google AdMob SDK Terms of Service (proprietary SDK). Review and accept AdMob & Google Play policies before publishing a production release to Google Play Console.

## 4. Visual, Audio & Font Assets

- **Typography**: `Outfit`, `Plus Jakarta Sans`, and `JetBrains Mono` loaded via Google Fonts (`SIL Open Font License 1.1`).
- **Icons**: Lucide React (`ISC`).
- **Game Graphics, Adaptive Launcher Icon (`ic_launcher_snake_fg.xml`), and Web Audio SFX**: 100% programmatically generated original project code; no unlicensed third-party sprites, music, or images are bundled.
