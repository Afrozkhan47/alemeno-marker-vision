# Marker Vision (Expo + React Native + TypeScript)

Production-ready Expo starter tailored for an Android-focused computer vision assignment.

## Tech stack

- Expo SDK `54` (latest stable at scaffold time)
- React Native + TypeScript
- React Navigation (Native Stack)
- ESLint + Prettier
- Path aliases via `tsconfig` + Babel module resolver

## Project structure

```text
src/
  components/
  constants/
  hooks/
  navigation/
  screens/
  services/
  store/
  types/
  utils/
```

## Setup commands

```bash
# 1) Create project (already done for this repository)
npx create-expo-app@latest . --template blank-typescript --yes

# 2) Install runtime dependencies
npm install @react-navigation/native @react-navigation/native-stack react-native-screens react-native-safe-area-context react-native-gesture-handler

# 3) Install realtime scanner UI dependencies
npx expo install expo-camera react-native-reanimated

# 4) Install dev tooling
npm install -D eslint prettier eslint-config-prettier eslint-plugin-prettier @typescript-eslint/parser @typescript-eslint/eslint-plugin eslint-config-expo babel-plugin-module-resolver
```

## Run on Android emulator

Prerequisites:

- Android Studio installed
- Android SDK + Emulator configured
- One emulator running before launching the app (or let Expo open one)

Commands:

```bash
# Start Metro
npm run start

# Open directly on Android emulator
npm run android

# Optional: tunnel mode if local networking is restricted
npm run android:tunnel

# Build native projects for emulator/device
npx expo prebuild --clean
npx expo run:android
```

## Quality checks

```bash
npm run lint
npm run typecheck
npm run format:check
```

## Included screens

- `HomeScreen`
- `ScannerScreen`
- `ResultsScreen`

Navigation flow:

- `Home -> Scanner -> Results`

## Implementation Details

- **Marker Detection**: Implemented using a custom TypeScript-based computer vision pipeline.
- **Marker Extraction**: Perspective-corrected extraction is functional, unskewing markers into a 300x300 px format.
- **Scanning Flow**: Collects 20 valid marker frames at high resolution (2000-3000 px) and displays them in the Results screen.
- **Performance**: Uses a custom pure-JS JPEG decoder to process high-resolution frames without requiring native modules or external CV libraries.

## Marker Detection Pipeline

1. **Capture**: Expo Camera takes a high-resolution JPEG (2000-3000px).
2. **Decoding**: Custom JPEG decoder in `jpegDecode.ts` converts the buffer to RGBA.
3. **Preprocessing**: Grayscale conversion and Otsu thresholding for adaptive binarization.
4. **Region Proposal**: Connected component labeling using a simplified flood-fill algorithm.
5. **Filtering**: Heuristic filters based on area, aspect ratio, and border contrast.
6. **Corner Estimation**: Quadrilateral corner detection from binary mask.
7. **Perspective Correction**: Homography matrix calculation and bilinear interpolation warp.
8. **Normalization**: Final 300x300 px PNG generation via custom encoder.

## Project Structure

```text
src/
  components/  # UI components (HUD, Overlay, Buttons)
  constants/   # Config (Scan count, theme)
  navigation/  # React Navigation setup
  screens/     # Main screens (Home, Scanner, Results)
  services/    # Core logic (CV pipeline, JPEG decoding)
  types/       # TypeScript definitions
```

