# Nexus ERP - Desktop & Mobile Apps

This directory contains the dedicated desktop (Electron/Windows) and mobile (Android) applications for Klypso Nexus ERP.

## Directory Structure

```
nexus/
├── desktop/           # Electron desktop application (Windows/Mac/Linux)
│   ├── src/          # Desktop source (Electron main/preload/sync)
│   ├── package.json  # Electron dependencies & build config
│   └── build.bat     # Windows build script
├── mobile/            # React Native Expo app (Android/iOS)
│   ├── App.tsx       # Main app entry
│   ├── app.json      # Expo configuration
│   └── eas.json      # EAS Build configuration
└── frontend/         # Web app (Next.js)
    └── public/       # Static files for downloads
        ├── nexus-desktop-setup.exe
        └── nexus-gateway.apk
```

## Building the Desktop App (Windows EXE)

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Steps

```bash
# Navigate to desktop folder
cd nexus/desktop

# Install dependencies
npm install

# Build Windows installer
npm run build
```

Or use the provided batch script:
```cmd
cd nexus\desktop
build.bat
```

Output:
- `nexus/desktop/release/nexus-desktop-setup.exe`
- `nexus/desktop/release/win-unpacked/Nexus ERP.exe`

### Features
- Offline SQLite cache and sync engine
- Bundled local Next.js frontend, so the desktop app can boot even when the public site is unavailable
- Single instance enforcement
- Secure preload/context isolation bridge
- Background sync telemetry storage

## Building the Mobile App (Android APK)

### Prerequisites
- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- EAS CLI (`npm install -g eas-cli`)
- Android Studio (for local builds)

### Steps

#### Option 1: Local Development Build
```bash
cd nexus/mobile

# Install dependencies
npm install

# Run on Android device/emulator
npx expo run:android
```

#### Option 2: EAS Build (Cloud Build)
```bash
cd nexus/mobile

# Configure EAS (if not done)
eas build:configure

# Build for Android (APK)
eas build -p android --profile preview
```

#### Option 3: Local Release Build
```bash
cd nexus/mobile

# Generate Android native project
npx expo prebuild

# Build release APK
cd android && ./gradlew assembleRelease
```

Output: `nexus/mobile/android/app/build/outputs/apk/release/app-release.apk`

### Features
- Native Android experience
- Offline-first with SQLite storage
- Push notifications via Firebase
- Secure credential storage
- Auto-sync when online

## Deployment

### Desktop App Distribution
1. Build the installer using electron-builder
2. Host the installer at: `https://klypso.in/portal/nexus-desktop-setup.exe`
3. Or publish to Microsoft Store (future)

### Mobile App Distribution
1. Build the APK using EAS or local Gradle
2. Host APK at: `https://klypso.in/portal/nexus-gateway.apk`
3. Or publish to Google Play Store (future)

## Environment Variables

### Desktop App (.env)
```
# Optional override. If omitted, the desktop app serves its bundled local frontend.
NEXUS_FRONTEND_URL=
NEXUS_BACKEND_URL=http://127.0.0.1:3001
AUTO_START=false
OFFLINE_MODE=false
```

### Mobile App (.env)
```
API_URL=https://klypso.in/portal/api
API_TIMEOUT=30000
SYNC_INTERVAL=60000
```

## Build Status

| Platform | Status | Output |
|----------|--------|--------|
| Windows Installer | Ready to build | `desktop/release/` |
| Android APK | Ready to build | `mobile/android/app/build/` |

## Support

For issues or questions about the mobile/desktop apps, contact support@klypso.in
