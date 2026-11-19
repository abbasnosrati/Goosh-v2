# Goosh v2

Independent bilingual solfège studio and practice player. No account or server is needed. To open the web app run `npm run web` with Python 3 installed and visit http://localhost:8080. A secure origin (HTTPS or localhost) is required for microphone access.

## Android and iOS
Use Node 22, JDK 21 and the Android SDK. Run npm install, npm run android:init, then cd android and run ./gradlew assembleDebug. Subsequent web changes need npm run android:sync. The Android workflow packages the debug APK. On macOS use npm run ios:init with Xcode installed and configure NSMicrophoneUsageDescription before testing.

## Resume here
- web/src/model.js defines the portable etude format, tuning and rule defaults.
- web/src/audio.js schedules individual voices and estimates microphone pitch locally.
- web/src/score.js draws a treble staff, relative onset spacing and selection.
- web/src/app.js implements recording, editing, practice phases, browser print and file exchange.
- Record stores onset and actual held duration in seconds. Audible envelopes are independent: short taps (<180 ms) ring for up to two seconds; holding sustains for up to six seconds.
- A file contains one etude and its practice rules. The active etude and results are local to the browser/device.
- Verify APK generation, WebView sharing/export, printing, orientation, permission denial, real microphone tracking and acoustic quality on devices. Each theme uses its supplied Goosh wordmark on a matching header. The Salamander sampled piano, synthesized loading fallback and basic score renderer need musician review. Sample attribution is in web/piano/CREDITS.txt. Staff spacing preserves raw time; full rhythmic engraving (ties, beams and written rests) remains open.
