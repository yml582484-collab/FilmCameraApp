# Film Cam

A professional film-style camera app built with Expo / React Native. Capture photos with authentic film emulations from iconic brands.

## Features

- **38 Film Presets** across 7 categories
  - Kodak (Portra 400/800/160, Gold 200, Ektar 100, Tri-X 400, Ektachrome E100, UltraMax 400, ColorPlus 200)
  - Fujifilm (Velvia 50, Provia 100F, Superia 400, C200, Astia 100, Natura 1600, Pro 400H, Reala 500)
  - Ilford (HP5 Plus, Delta 400, FP4 Plus, XP2 Super, Pan F Plus)
  - CineStill (800T, 50D)
  - CCD (Canon IXUS, Olympus μ, Sony W200, Ricoh GR, Nikon S, Pentax *ist)
  - Polaroid (600, SX-70, B&W)
  - Vintage (Old Photo, LOMO, Film Grain, High Contrast B&W, Light Leak, Wide Film, Faded, Sepia, Cross Process, Redscale)
- **Real-time filter preview** via WebView Canvas
- **Tap-to-focus** with animated ring indicator
- **1:1 crop mode** with viewfinder mask
- **Grid overlay** toggle (rule of thirds)
- **Video recording** with filter tint overlay
- **Private app gallery** (photos stored in app sandbox + system gallery)
- **OTA updates** via EAS Update

## Tech Stack

- Expo SDK 54
- React Native 0.81
- expo-camera
- react-native-webview (Canvas-based filter engine)
- expo-file-system (private storage)
- expo-media-library (system gallery sync)

## Getting Started

```bash
npm install
npx expo start
```

Open in Expo Go with the link shown in terminal.

## Build APK

```bash
eas build --platform android --profile preview
```

## Build for App Store

```bash
eas build --platform ios --profile production
```

## Project Structure

```
FilmCameraApp/
├── App.tsx                          # Main app (camera, gallery, controls)
├── src/filters/
│   └── FilmFilterEngine.ts          # 38 presets + Canvas filter pipeline
├── assets/                           # Icons and splash screens
├── patches/
│   └── expo-av+14.0.7.patch         # CMake fix for expo-av
├── app.json                          # Expo config
└── eas.json                          # EAS build/update config
```

## License

MIT