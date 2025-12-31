# Fix Expo Networking Issue

## Problem
Expo is running in offline mode even though internet connection is available:
- "Networking has been disabled"
- "Unable to reach well-known versions endpoint"
- "Dependency validation is unreliable in offline-mode"

## Solution Steps

### Step 1: Clear Expo Cache
```powershell
npx expo start --clear
```

### Step 2: If that doesn't work, try these commands:

**Option A: Remove offline mode explicitly**
```powershell
$env:EXPO_OFFLINE = $null
npx expo start --clear
```

**Option B: Clear all caches and restart**
```powershell
# Clear npm cache
npm cache clean --force

# Clear Expo cache
npx expo start --clear

# Or delete .expo folder if it exists
Remove-Item -Recurse -Force .expo -ErrorAction SilentlyContinue
npx expo start --clear
```

**Option C: Check for environment variables**
```powershell
# Check if EXPO_OFFLINE is set
$env:EXPO_OFFLINE

# If it's set to "1" or "true", unset it:
Remove-Item Env:\EXPO_OFFLINE -ErrorAction SilentlyContinue
npx expo start --clear
```

### Step 3: Verify Network Access
Make sure your firewall isn't blocking Expo's network requests.

## Quick Fix (Recommended)
Run this command:
```powershell
Remove-Item Env:\EXPO_OFFLINE -ErrorAction SilentlyContinue; npx expo start --clear
```

