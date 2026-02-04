# SeekerMigrate Mobile (Expo)

This folder contains the **Expo-first** SeekerMigrate mobile app scaffold intended for the **Solana Mobile dApp Store** (Android APK).

## Goals

- Feel like a polished Solana wallet app (Phantom/Jupiter-grade UX)
- Mainnet-only for initial store builds
- Core flows: Welcome → Disclosure → Tabs (Home / Unlock / Profile / Featured)
- Calls the existing SeekerMigrate backend endpoints under `/api/*`

## Prerequisites

- Android SDK / emulator (or a physical Android device)
- Expo CLI
- **Expo Development Build** (required for Solana Mobile Wallet Adapter)

Solana Mobile docs: https://docs.solanamobile.com/react-native/setup

## Configure API base URL

Set the backend base URL (Vercel deployment or local dev server):

- `EXPO_PUBLIC_API_BASE_URL` (example: `https://your-vercel-app.vercel.app`)

## Install

```bash
cd apps/mobile
npm install
```

## Run (development build)

Create/install a dev-client build (required for MWA libraries):

```bash
cd apps/mobile
npm run run:android
```

Then start the dev server:

```bash
npm run dev:client
```

## Build for distribution (Solana Mobile dApp Store)

This repo is wired for **EAS Build** (cloud builds).

1) Install/login:

```bash
npm i -g eas-cli
cd apps/mobile
npm run eas:login
npm run eas:whoami
```

2) Set the API base URL in `eas.json`:
- `EXPO_PUBLIC_API_BASE_URL` = your **prod** Vercel URL

3) Build artifacts:

```bash
# Internal testing build (APK)
npm run build:apk

# Store build (AAB)
npm run build:aab
```

Note: you will need a stable Android application id/package name before store submission.

## Notes

- `index.js` sets up Solana web3 polyfills for Expo SDK 49+ style (crypto + Buffer).
- Current screens are minimal scaffolds; we will iterate UI/animations to match Phantom/Jupiter.
