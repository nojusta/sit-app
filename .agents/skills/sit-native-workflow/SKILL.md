---
name: sit-native-workflow
description: Handle SIT Expo native builds, prebuild/config changes, Google Navigation wrapper patches, SDK upgrades, and simulator or device connection/location failures. Use when native configuration or runtime compatibility is involved; ordinary JS/TS UI edits do not need this workflow.
---

# SIT native workflow

Use the root AGENTS.md for architecture and product rules. Run commands from the repository root.

## Find the source of truth

- Read package.json and the relevant patch before choosing versions or changing native code. A newer package is not automatically compatible with the Expo/React Native pair.
- App-owned native setup lives in app.config.js and plugins/with-google-navigation.js. The plugin handles Google initialization, API metadata, Android desugaring and copying the native marker bitmap.
- The original Android marker bitmap is assets/images/custom-marker-android.png. Verify it is packaged at android/app/src/main/assets/markers/custom-marker.png after prebuild; a rendered map with default red pins is not sufficient validation.
- Keep Google wrapper changes in the tracked versioned patch. Exclude generated build output from patches. Tests for prebuild persistence live in scripts/**tests**/native-config.test.js.
- Keep .env contents and private Appwrite/admin credentials out of logs and Expo extra. The tracked Expo CLI patch redacts dotenv diagnostic values; scripts/**tests**/expo-env-log.test.js covers initial load and reload.

## Choose the smallest check

- Reuse installed Xcode, SDKs, runtimes and AVDs. Honor the user's download constraints; do not install replacements as a troubleshooting shortcut.
- Use npm ci when dependency installation is needed. Inspect package scripts for current build commands. npm run ios and npm run ios:device use scripts/expo.js, which prefers /Applications/Xcode.app unless DEVELOPER_DIR is explicit.
- Regenerate only the affected native platform when config/plugins change, then rebuild it. Preserve local native work before clean prebuild; ignored native folders may contain changes not represented in config yet.
- For plugin edits, run the native-config tests and inspect the generated result. For wrapper edits, confirm the patch reapplies and rebuild the touched platform. For dependency-only edits, verify consumers and the dependency graph before deciding a native rebuild is necessary.
- Follow AGENTS.md's focused lint/type/Jest checks. Use a full check when the change spans the dependency/tooling stack; avoid repeated full installs or cross-platform builds without new evidence.

## Diagnose before editing app logic

- A successful iPhone build/install followed by "Finding dev servers" is a Metro connection problem. Check the existing listener and LAN reachability first. A phone needs the Mac's LAN URL, not localhost; automatic discovery can fail even when manual connection works. Check Local Network permission and same-network access before rebuilding.
- Simulator location permission does not supply GPS samples. Select Device Hub's Device > Location scenario, or set an explicitly synthetic coordinate with simctl. Cathedral Square test location: 54.6858,25.2870. Keep simulated and physical GPS evidence distinct.
- Confirm an emulator's activity service is available before diagnosing app launch failures. QEMU crashes and broken snapshots are host/emulator issues. Prefer a cold boot or supported software graphics flag on an existing AVD over wiping its data or downloading another image.
- Inspect npm audit's leaf advisories and consumer APIs. A successful install does not imply zero warnings. Do not use audit fix --force to chase counts; it can propose incompatible upgrades or SDK downgrades. Recheck advisories rather than assuming the historical audit count is current.

## Report observable results

For map/navigation changes, check markers and custom icons, selection, guidance startup, "Keep navigation", and confirmed cancellation back to browse. Check relevant loading overlays and safe areas. Use existing data for smoke tests; backend mutations need to be within the user's requested scope.

State which platforms/devices and flows actually passed, which checks were not run, and remaining warnings or blockers. Simulator guidance is not proof of physical GPS behavior. Read docs/maintenance/modernization-results.md only when migration history or compatibility decisions are relevant; verify current files before reusing historical commands or versions.
