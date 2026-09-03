# Capacitor & Android Command Reference

## 1. npm Basics

Install project dependencies:
```bash
npm install
```
Use this after cloning/copying the project or when `node_modules/` is missing.

Install a package:
```bash
npm install package-name
```
Example:
```bash
npm install @capacitor/core
```

Install a development dependency:
```bash
npm install -D package-name
```
Example:
```bash
npm install -D @capacitor/cli
```

Check outdated packages:
```bash
npm outdated
```

Update packages:
```bash
npm update
```

List installed packages:
```bash
npm list
```
Top-level only:
```bash
npm list --depth=0
```
## 2. Capacitor Commands
Run these from the project root.

### Inspect environment
```bash
npx cap doctor
npx cap --version
```

### List platforms and plugins
```bash
npx cap ls
```
Example output:
```text
Installed platforms:
  android

Installed plugins:
  @capacitor/core
```

### Copy web assets into Android  ================================================
```bash
npx cap copy android
```
Copies latest frontend files from `www/` into the native Android project.

### Sync the project ==========================================================
```bash
npx cap sync android
```
Use this after changing web files or installing a Capacitor plugin. It copies `www/` and updates native dependencies.

### Open Android Studio
```bash
npx cap open android
```
This opens the native Android project at `iSeeGrass/android/`.

### Run on device or emulator
```bash
npx cap run android
```
For a physical device, enable USB debugging in Developer Options and verify with:
```bash
adb devices
```
Expected output:
```text
List of devices attached
ABC123456	device
```

## 3. Debugging with ADB

### Check connected devices
```bash
adb devices
```
If `adb` is not recognized, add Android SDK `platform-tools` to `PATH`.

### View logs
```bash
adb logcat
```
Filter for Capacitor:
```bash
adb logcat | grep -i capacitor
```
Filter for Chromium/JS errors:
```bash
adb logcat | grep -i chromium
```

### Clear logs first
```bash
adb logcat -c
adb logcat
```

### More device info
```bash
adb devices -l
```

### Restart ADB server
Useful if a device is not detected:
```bash
adb kill-server
adb start-server
adb devices
```

## 4. Android / Gradle Commands

From the Android project folder:
```bash
cd android
```

### Build debug APK ====================================================================
```bash
./gradlew assembleDebug
```
APK path:
`android/app/build/outputs/apk/debug/app-debug.apk`

### Build release APK
```bash
./gradlew assembleRelease =========================================================
```

### Clean build files
```bash
./gradlew clean
```
Then return to the project root and sync:
```bash
cd ..
npx cap sync android
```

## 5. Web Testing ===================================================================

Serve the frontend locally:
```bash
npx serve www
```
Or specify a port:
```bash
npx serve www -l 3000
```
Open:
```text
http://localhost:3000
```

> For PHP testing, use XAMPP/Apache. `serve` cannot execute PHP.

## 6. Useful npm Scripts for iSeeGrass
Add these to `package.json`:
```json
{
  "scripts": {
    "serve": "serve www -l 3000",
    "cap:sync": "npx cap sync android",
    "cap:copy": "npx cap copy android",
    "cap:open": "npx cap open android",
    "cap:run": "npx cap run android",
    "android:clean": "cd android && ./gradlew clean",
    "android:debug": "cd android && ./gradlew assembleDebug"
  }
}
```
Then use:
```bash
npm run serve
npm run cap:sync
npm run cap:copy
npm run cap:open
npm run cap:run
npm run android:clean
npm run android:debug
```

## 7. Recommended Workflow

### Fast frontend development
1. Run `npm run serve`
2. Edit frontend files in `www/`
3. Refresh the browser

### Android testing
1. Run `npm run cap:sync`
2. Run `npm run cap:run`

### When Android acts strange
```bash
npm run android:clean
npm run cap:sync
npm run android:debug
```

## 8. Quick Command Cheat Sheet

```bash
npm install                 # Install dependencies
npm list --depth=0          # Show installed packages
npm outdated                # Check outdated packages

npx cap doctor              # Check Capacitor environment
npx cap ls                  # Show platforms/plugins
npx cap sync android        # Copy + sync everything
npx cap copy android        # Copy www files only
npx cap open android        # Open Android Studio
npx cap run android         # Run on device/emulator

npx serve www               # Test static frontend
adb devices                 # Check connected phones
adb logcat                  # View Android logs
adb logcat -c               # Clear logs

cd android
./gradlew clean             # Clean build
./gradlew assembleDebug     # Build debug APK
./gradlew assembleRelease   # Build release APK
```

### Most-used commands for iSeeGrass
- `npm run serve`
- `npx cap sync android`
- `npx cap run android`

The browser is best for fast frontend testing. Capacitor/Android is where you verify mobile behavior, plugins, offline features, camera access, storage, and the final APK.

If Android starts acting strangely
npm run android:clean
npm run cap:sync
npm run android:debug
Quick command cheat sheet
npm install                 Install dependencies
npm list --depth=0          Show installed packages
npm outdated                Check outdated packages

npx cap doctor              Check Capacitor environment
npx cap ls                  Show platforms/plugins
npx cap sync android        Copy + sync everything
npx cap copy android        Copy www files only
npx cap open android        Open Android Studio
npx cap run android         Run on device/emulator

npx serve www               Test static frontend

adb devices                 Check connected phones
adb logcat                  View Android logs
adb logcat -c               Clear logs

cd android
./gradlew clean             Clean build
./gradlew assembleDebug     Build debug APK
./gradlew assembleRelease   Build release APK

For iSeeGrass, the three commands you'll likely use most are:

npm run serve
npx cap sync android
npx cap run android

The browser is your fast frontend testing environment, while Capacitor/Android is where you test mobile behavior, plugins, offline features, camera access, storage, and the actual APK.