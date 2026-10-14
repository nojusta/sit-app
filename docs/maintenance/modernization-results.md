# SDK 57 modernization

Implemented on 2026-10-12, from SDK 54 through SDK 55 and 56 checkpoints to stable Expo 57.0.28, React Native 0.86.3 and Expo's exact React 19.2.3 pair. SDK 58 prereleases were not selected.

## Native compatibility

- Xcode 27 is selected per process by `scripts/expo.js`; global `xcode-select` remains unchanged. Explicit `DEVELOPER_DIR` overrides this default.
- iOS scene lifecycle is enabled through `expo-build-properties`; minimum iOS is 16.4. See [Expo scene lifecycle guidance](https://github.com/expo/fyi/blob/main/ios-scene-lifecycle.md).
- Google initialization, iOS key metadata, Android key metadata, the original Android custom-marker bitmap and Android core-library desugaring survive prebuild through `plugins/with-google-navigation.js`. Kotlin is pinned to 2.2.10 for the retained Google wrapper.
- Google wrapper 0.14.2 and its existing behavioral fixes are retained. Its patch now contains source fixes only, removing generated Android build artifacts. Google iOS Navigation/Maps remain at the previously working 9.4.0. Updating this stack is a separate migration requiring physical navigation validation.
- No Xcode, Command Line Tools, iOS runtime or Android emulator image was downloaded. Existing iOS 27 / 26.4 and installed Android AVDs were used. Gradle and npm/CocoaPods application dependencies were updated.

## Dependency and code changes

Node 22.23.3 and npm 11.21.0 are the recorded local toolchain. Removed stale direct Metro packages, redundant navigation dependency, obsolete RN types and deprecated Jest Native matchers. ESLint uses flat configuration. Tests use the supported React Native Testing Library and Worklets setup. Existing Hooks rules remain enabled; adoption of four new React Compiler lint rules is deferred for imperative native refs and Worklets.

Router theme/focus imports, color-scheme normalization and removed React Native/StatusBar APIs were adapted. Web-specific boundaries preserve the existing map-unavailable state without resolving native Google components; native marker asset resolution is skipped on web. The missing favicon reference now uses the existing logo asset. NativeWind 2 styling was preserved. The existing marker, auth, map and navigation behavioral tests were retained.

Private admin credentials are no longer exposed in Expo `extra`; the bundled admin login shortcut was removed. Normal sign-in remains. A tracked Expo CLI patch redacts environment values in both initial-load and reload diagnostic events without modifying the actual environment. Generated logs were sanitized after discovering this upstream logging behavior. Both native prebuild persistence and log redaction have focused regression coverage. Postinstall fails if a tracked patch cannot apply.

## Validation

- SDK 55 and 56 intermediate checkpoints: type check, lint, all 145 existing tests and snapshot passed.
- SDK 57: full lint, type check, all 34 existing suites / 145 tests and snapshot passed. Final gate: 36 suites / 149 tests and one snapshot passed. Focused photo viewer and marker-sheet timer tests passed after correcting asynchronous list test cleanup.
- Web static export: passed after isolating native-only Google imports, guarding native asset resolution and fixing the favicon path. Web continues to show the existing map-unavailable fallback.
- Expo Doctor: all 21 checks passed. The narrowly scoped Google wrapper directory exclusion avoids outdated directory metadata; the package uses Fabric/TurboModules and is validated by actual native builds.
- npm dependency graph: no invalid direct dependencies or peer-resolution failures.
- Android API 36 emulator: installed and launched; retained authenticated session, Google MapView, markers, marker selection and weather loaded. A software graphics flag was used because the emulator host renderer was unstable. The launch check caught the missing native marker bitmap; prebuild now restores the exact original bytes from a tracked asset. The incremental rebuild and visual check confirmed the original SIT icons are restored; the asset-copy regression test passed.
- Android arm64 debug build: succeeded with the installed SDK/NDK and SDK auto-download disabled. The Navigation SDK desugaring requirement was fixed in the tracked plugin.
- Xcode 27 simulator build: succeeded with zero errors, installed on iOS 27 and loaded in Device Hub. Welcome and sign-in navigation were visually verified. The one build-phase warning belongs to Expo Dev Launcher.
- First Metro bundle exceeded the connection timeout during concurrent native compilation; reloading after the bundle was generated loaded the app successfully.
- Existing iOS 26.4 authenticated session: Google MapView, marker selection, weather, expanded sheet, starting guidance, keeping guidance in the cancel dialog and confirmed return to browse passed. No marker/rating/favorite data was changed.
- Fresh isolated `npm ci`: succeeded; both patches applied, and the resulting dependency graph is valid.
- Physical iPhone testing is deferred at the user's request. Real GPS guidance and physical-device safe areas must be included in that smoke test before claiming full runtime regression coverage.

## Remaining npm warnings and advisories

The initial migration reduced audit entries from 94 (2 critical, 66 high) to 76. A follow-up on 2026-10-14 reduced this to **66 affected entries: 0 critical, 55 high, 11 moderate, 0 low**. These are dependency-chain counts arising from five underlying advisories, not 66 independent flaws. Warning and vulnerability cleanup remains incomplete.

The follow-up updates `@tootallnate/once` from 2.0.0 to its compatible patched 2.0.1 release and pins UUID 11.1.1 through an override. This removes the two UUID deprecation warnings. The two consumers, `xcode` and `@expo/ngrok`, only use `uuid.v4()`, which UUID 11 still exposes through CommonJS. Validation covered both consumers' UUID APIs, ngrok module loading, and parsing/identifier generation/serialization of the existing Xcode project. The complete lint/type/test gate passed: 36 suites, 150 tests, one snapshot. Both tracked patches still apply and the dependency graph is valid. No native/app source was changed or rebuilt for this follow-up.

Remaining deprecation warnings:

| Warning                                   | Dependency path / constraint                                                                     |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `inflight`, `glob@7`                      | Jest 29 and its coverage tooling. A global Glob major override changes APIs used by these tools. |
| `abab`, `domexception`, `whatwg-encoding` | jsdom 20, required by Expo's Jest 29 environment.                                                |
| `eslint@9`                                | ESLint 10 is published, but the current React and import plugins do not declare support for it.  |

Remaining underlying advisories are `braces`, `node-forge`, `postcss-selector-parser`, `decode-uri-component` and `sprintf-js`. The [braces advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) and [node-forge advisory](https://github.com/advisories/GHSA-86w9-cpqp-85rv) list no patched release; neither does the reported sprintf-js advisory. The patched URI decoder switches to ESM, incompatible with its current CommonJS caller. The patched selector parser changes iteration behavior across a major version and requires a validated styling dependency upgrade.

These findings are not all app-runtime issues: several concern build/test tools. Router's URI decoder is also affected, so the report must not be dismissed as entirely development-only. Compatible XML, tar and shell-quoting fixes remain applied. Do not use `npm audit fix --force`: the current report even proposes downgrading Expo to 44 for one chain, which would undo the SDK migration. Further cleanup needs compatible parent releases or deliberate test/styling/tooling migrations; a warning-free or vulnerability-free install is not claimed.

## Physical iPhone handoff

```bash
npm run ios:device
npm run start -- --dev-client
```

Connect and unlock the paired iPhone and select it in the device picker. Use Device Hub to interact with the installed development build. The phone needs access to Metro on the same network; use the LAN URL rather than `localhost` on a physical phone. Rebuild after native/config changes. Validate normal login, approved markers, marker selection, filters, location permission, start guidance, confirmed cancellation, background/resume and camera/photo picker. Do not create or edit production marker data solely for testing.

The pre-upgrade native backup and SDK 55/56 checkpoint archives are in `/private/tmp`; tracked source/config/patches remain the source of truth.
