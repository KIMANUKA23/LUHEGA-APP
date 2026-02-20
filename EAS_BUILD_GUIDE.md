# 🚀 EAS Build Guide: Creating Your Standalone APK

Follow this simple guide to generate a **real, installable Android app (.apk)**. 
This is the **Gold Standard** for testing because it runs exactly like the final app your client will use.

---

## 🛑 Step 1: Login & Commit (Crucial!)

1.  **Login to Expo** (if not already logged in):
    ```bash
    npx eas-cli login
    ```

2.  **Save Your Work**: EAS Build only sees files that are committed to git.
    ```bash
    git add .
    git commit -m "Ready for APK build"
    ```

---

## 🏗️ Step 2: Build the APK (The Magic Command)

Run this command to start the build server. This will create a specific **"Preview"** build which gives you an `.apk` file you can install directly.

```bash
npx eas-cli build --platform android --profile preview
```

**What happens next?**
1.  You might be asked to log in or create a keystore. Just say **YES** (Y) to everything.
2.  The build runs in the cloud (it takes about **10-15 minutes**).
3.  You can close the terminal if you want, but it's better to verify it starts.

---

## 📲 Step 3: Download & Install

When the build finishes, you will see a link in the terminal (and in your Expo dashboard).

1.  **Click the Link** (or scan the QR code).
2.  Download the **`.apk`** file to your Android phone.
3.  **Install it** (You may need to allow "Install from Unknown Sources").

---

## 🍎 iOS (iPhone) Notes
*Testing on iPhone is harder without a paid developer account ($99/year).*
- If you **DO** have an account:
  ```bash
  npx eas-cli build --platform ios --profile preview
  ```
- If you **DON'T** have an account: 
  Stick to using the **Expo Go** app for iPhone testing.

---

## 🚀 Ready for Google Play Store?

When you are finally ready to submit to the Play Store, use the `production` profile to get an `.aab` file (App Bundle):

```bash
npx eas-cli build --platform android --profile production
```
*Note: You cannot install .aab files directly on your phone.*
