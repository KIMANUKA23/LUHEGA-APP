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
npx eas-cli build --platform android --profile preview
```

## 4. Generate iOS Build (for iPhone)
To create a build for real iPhones:
```bash
npx eas-cli build --platform ios --profile preview
```
> [!NOTE]
> This requires an **Apple Developer Account** ($99/year). If you don't have one, you can only test on iPhone using the **Expo Go** app.

## 5. Submit to App Store
To create a build for the Apple App Store:
```bash
npx eas-cli build --platform ios --profile production
```

> [!IMPORTANT]
> - **APK (Android)**: Use the `preview` profile.
> - **AAB (Android)**: Use the `production` profile.
