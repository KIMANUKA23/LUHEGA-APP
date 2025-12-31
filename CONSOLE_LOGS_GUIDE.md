# How to See Console Logs in Expo Go

## 📱 **In Expo Go on Your Phone:**

### **Method 1: Metro Bundler Terminal (EASIEST)**
1. Look at your computer terminal where you ran `npx expo start`
2. All `console.log()`, `console.error()`, `console.warn()` will appear there
3. This is the **BEST** way to see errors in real-time

### **Method 2: Expo Go Developer Menu**
1. **Shake your phone** (or press `Cmd+D` on iOS simulator, `Cmd+M` on Android)
2. Tap **"Debug Remote JS"** 
3. This opens Chrome DevTools where you can see console logs

### **Method 3: React Native Debugger**
1. Install React Native Debugger app
2. Enable remote debugging in Expo Go
3. View logs in the debugger

## 🔍 **What to Look For:**

When you click the buttons, you should see in the Metro terminal:
- `🔵 OTP button pressed` or `🔵 Login button pressed`
- `Navigation result: ...`
- Any errors will show as `❌ Navigation error: ...`

## ✅ **Fixes Applied:**

1. **AuthContext Loading Fix:**
   - Added 5-second timeout to prevent infinite loading
   - Added error handling so loading always resolves
   - Made sync non-blocking

2. **Database Initialization:**
   - Added 3-second timeout
   - Made it non-blocking so app doesn't hang
   - App continues even if DB init fails

3. **Navigation Improvements:**
   - Added comprehensive error logging
   - Added try-catch blocks
   - Better error messages

4. **Loading Indicators:**
   - Added loading screen while auth initializes
   - User sees progress instead of blank screen

## 🚀 **Performance Optimizations:**

- Database init runs in background
- Network checks are non-blocking
- Sync operations don't block UI
- Timeouts prevent infinite waits

## 📝 **Next Steps:**

1. **Check your Metro terminal** - all logs appear there
2. **Click the buttons** - you'll see logs like:
   ```
   🔵 OTP button pressed
   Navigation result: ...
   ```
3. **If errors appear** - copy them and share with me

The app should now:
- ✅ Load faster
- ✅ Not get stuck
- ✅ Show clear error messages
- ✅ Work smoothly

