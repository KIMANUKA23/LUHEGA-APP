# EAS Build Workflow

Follow these steps to generate your mobile application builds.

## 1. Login to Expo
Open your terminal and run:
```bash
npx eas-cli login
```

## 2. Commit your changes
EAS Build only builds files that are committed to git. Ensure everything is saved:
```bash
git add .
git commit -m "Optimize mobile ergonomics and fix stock data"
```

## 3. Generate Android APK
To get a downloadable `.apk` file (for sideloading):
```bash
npx eas-build --platform android --profile preview
```

## 4. Generate iOS Build
To create a build for iOS (requires an Apple Developer Account):
```bash
npx eas-build --platform ios --profile production
```

## 5. Generate Android App Bundle (Play Store)
To create a `.aab` file for Google Play:
```bash
npx eas-build --platform android --profile production
```

> [!IMPORTANT]
> - **APK (Android)**: Use the `preview` profile.
> - **AAB (Android)**: Use the `production` profile.
