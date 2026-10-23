# iSeeGrass Native — Dev Setup Guide

## Every Session (do this in order)

### 1. Start XAMPP
Open XAMPP and start **Apache** and **MySQL**.

---

### 2. Start PHP server (Terminal 1 — keep open)
```bash
php -S 0.0.0.0:8080 -t /media/codex/Shared/iSeeGrass /media/codex/Shared/iSeeGrass/router.php
```

---

### 3. Start Cloudflare tunnel (Terminal 2 — keep open)
```bash
cloudflared tunnel --url http://localhost:8080
```
Wait for the URL to appear, e.g.:
```
https://some-words-here.trycloudflare.com
```
> ⚠️ The URL changes every session. You must update Constants.java each time.

---

### 4. Update BASE_URL
Open:
```
native-app/app/src/main/java/com/iseegrass/native_app/network/Constants.java
```
Replace the URL on line 4:
```java
public static final String BASE_URL = "https://your-new-url.trycloudflare.com/";
```
> ⚠️ No space before the `/` at the end — that causes a crash.

---

### 5. Build the APK
```bash
java -classpath /media/codex/Shared/iSeeGrass/native-app/gradle/wrapper/gradle-wrapper.jar \
  org.gradle.wrapper.GradleWrapperMain \
  -p /media/codex/Shared/iSeeGrass/native-app \
  assembleDebug -PappVersion=1.10
```
Output APK location:
```
native-app/app/build/outputs/apk/debug/iSeeGrass-Native-debug-1.10.apk
```
> Increment `-PappVersion=` each build (1.10, 1.11, etc.)

---

### 6. Install on phone
- Transfer the APK to your phone
- Install directly over the existing app (no need to uninstall)
- If you get a signature error, uninstall first then install

### 7. First launch after install
- Go to **Settings → Apps → iSeeGrass Native → Storage → Clear Cache + Clear Data**
- Then open the app and log in

---

## Accounts

| Username | Password | Role  |
|----------|----------|-------|
| toplevel | topaccess | admin |
| clark    | 12345678  | user  |
| emilio   | 12345678  | user  |
| ralph    | 12345678  | user  |

> 💡 The login screen pre-fills `clark` / `12345678` for quick testing.
> Remove `android:text` from `activity_login.xml` before the final release build.

---

## Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| App crashes on launch | Space in BASE_URL | Remove space before `/` in Constants.java |
| `Server returned HTML` | Wrong URL or PHP server not running | Restart PHP server, update BASE_URL |
| `Unable to resolve host` | Old APK with previous URL | Rebuild with new Cloudflare URL |
| `Invalid username or password` | First login attempt sometimes fails | Clear app data and try again |
| `Network error` on login | Cloudflare tunnel not running | Start Terminal 2 command |
| Camera crash | Storage permission denied | Grant camera + storage permission in phone settings |
| Assessment list blank | API not responding | Pull down to refresh |

---

## Notes
- Keep both terminals open while testing — closing either will break the connection
- The Cloudflare URL is temporary (free tier). It changes every time you restart the tunnel
- Phone can use **mobile data or any WiFi** — it goes through Cloudflare, not direct to laptop
- The Kaggle ngrok URL in `.env` also needs updating each time you restart the Colab notebook
