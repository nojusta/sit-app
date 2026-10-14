# SIT modernization plan

Implementation is recorded in [modernization-results.md](modernization-results.md). The audit below is the pre-upgrade baseline.

Audit date: 2026-10-12. This document plans the migration; no dependencies, native projects, backend data, or installed development tools were changed during the audit.

## Objective and constraints

Make dependency installation reproducible, restore development on the installed Xcode 27 / Device Hub / iOS 27 environment, and retain existing Android and app behavior before adding features.

- Use the installed Xcode applications, iOS runtimes, Android SDKs, and AVDs. Do not download Xcode, simulator runtimes, emulator images, or create replacement devices.
- Use development builds for Google maps/navigation. Updating JavaScript alone cannot validate a native migration.
- Keep feature behavior, backend schema, application identifiers, map providers, and architecture boundaries stable during the SDK migration.
- Commit each verified stage separately. Stop advancing when a gate fails; fix or roll back the stage first.
- No plan can guarantee zero regressions. Acceptance requires automated checks, native builds, and comparison of actual runtime behavior. Simulator validation does not replace real-device navigation validation.

## Evidence from the repository and machine

| Area                     | Observed baseline                                                                                                                        | Implication                                                                                                                                            |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Expo                     | Manifest `~54.0.33`; lockfile 54.0.33; installed 54.0.37                                                                                 | A passing local checkout is not yet a reproducible install.                                                                                            |
| React / React Native     | 19.1.0 / 0.81.5                                                                                                                          | Upgrade as the Expo-supported pair, including renderer/types.                                                                                          |
| Checks                   | TypeScript and full ESLint pass; 34 Jest suites, 145 tests, 1 snapshot pass                                                              | Preserve this baseline and extend only meaningful coverage.                                                                                            |
| Package tree             | `npm ls --all` fails: installed PostCSS 8.5.28 conflicts with Expo Metro's `~8.4.32` requirement                                         | Resolve dependency ownership; do not hide the mismatch.                                                                                                |
| Lockfile drift           | Ten direct packages differ from installed versions                                                                                       | Reconcile the lockfile and prove a fresh installation.                                                                                                 |
| npm audit                | 94 affected package entries: 2 critical, 66 high, 24 moderate, 2 low                                                                     | Triage shared dependency causes and runtime/build/test exposure; counts are not 94 independent exploits. Critical entries are `tar` and `shell-quote`. |
| Overrides                | `@xmldom/xmldom` pinned to 0.8.12; locked `tar` 7.5.13                                                                                   | Existing overrides no longer establish a secure dependency graph.                                                                                      |
| Deprecated dependencies  | ESLint 8, `@testing-library/jest-native`, `@types/react-native`; transitive glob/inflight/rimraf/uuid entries                            | Modernize direct owners, then reassess inherited warnings.                                                                                             |
| Google wrapper           | Installed 0.14.2; manifest permits 0.14.3; patch names 0.14.2                                                                            | Pin exactly while preserving the current patch; treat wrapper updates separately.                                                                      |
| Navigation patch         | 179 file sections, including 156 Android build-artifact sections; 556,358 bytes                                                          | Remove machine-specific build output while preserving meaningful native, JS, and declaration fixes.                                                    |
| Google iOS SDK           | Patch changes GoogleNavigation 10.10.0 to 9.4.0                                                                                          | Investigate the reason and test before removing or replacing the downgrade.                                                                            |
| Native persistence       | `ios/` and `android/` are ignored; iOS AppDelegate has custom Google startup; Android Gradle has custom key/minimum-SDK handling         | Preserve and encode required native edits before regeneration.                                                                                         |
| Apple tooling            | `/Applications/Xcode.app` is 27.0; command-line selection points to Xcode-26.4.app                                                       | Use a per-command `DEVELOPER_DIR` for Xcode 27; avoid changing the machine's global selection.                                                         |
| Existing iOS devices     | iOS 27.0 iPhone 18 Pro and other devices; iOS 26.4 devices also installed                                                                | Test on existing device UUIDs; use 26.4 as an additional comparison.                                                                                   |
| Existing Android tooling | SDK platforms 35, 36, 36.1; build-tools include 35/36/37; Pixel_7 and Pixel_7_API_36_Maestro AVDs                                        | Inventory Java, Gradle, NDK, and actual AVD images before builds; disable automatic SDK provisioning where applicable.                                 |
| Credentials              | `app.config.js` puts `ADMIN_PASSWORD` into client-readable `extra`; `app/index.tsx` uses it for Dev Log without a development-only guard | Treat credential removal as a separate explicit security fix. Do not carry a privileged password into a release bundle.                                |
| Documentation / CI       | Map checklist dated April 5 contains statements contradicted by current code; no checked-in CI workflow found                            | Update from implemented behavior and make the final checks reproducible.                                                                               |

The Expo dependency check passed using the local bundled dependency map, with an offline-mode caveat. Expo Doctor and native builds were not run in this planning audit. No `npm install` was run; installation warnings were investigated through the lockfile and dependency tree.

## Target and compatibility decisions

Recommended initial target: **Expo 57.0.28**, the npm `latest`/`sdk-57` version observed during this audit. npm `next` is 58.0.7; stable SDK 58 availability was not established. Recheck tags and release notes before execution, then freeze the chosen versions in the lockfile.

SDK 57 uses React Native 0.86, React 19.2.3, and requires Node 22.13.x or later. The installed Node 24.2.0 satisfies that minimum, whereas `.nvmrc` 20.19.4 does not. Align `.nvmrc`, `engines`, documentation, and CI with one supported runtime. Let Expo select compatible package patches rather than independently choosing npm's `latest` versions. See the [SDK compatibility reference](https://docs.expo.dev/versions/v57.0.0/).

**Minimum iOS support changes from 16.0 to 16.4 with SDK 56/57.** This excludes iOS 16.0–16.3 and must be recorded as an intentional support-policy change. If retaining those versions is required, reassess the target before execution. Android's current app minimum is already API 24; preserve it.

For Xcode 27, use SDK 57's documented scene lifecycle opt-in: Expo 57.0.23 or newer, an SDK-compatible `expo-build-properties` release that implements `ios.enableSceneSupport`, and `enableSceneSupport: true`. Its transform expects the standard AppDelegate template, so order persistent Google startup integration carefully and verify generated output. See [Expo's scene migration guidance](https://github.com/expo/fyi/blob/main/ios-scene-lifecycle.md).

Device Hub discovery, booting, installation, and opening are a separate acceptance gate. [SDK 58's beta notes](https://expo.dev/changelog/sdk-58-beta) explicitly describe Device Hub support; they do not prove the selected SDK 57 CLI works. Validate the exact stable CLI. If it fails, investigate a narrowly scoped upstream fix or a documented direct launch through installed tools. A manual workaround is not equivalent to normal CLI support. Do not silently switch to SDK 58 prerelease.

Google's latest wrapper 0.17.x requires RN 0.87+, newer Kotlin, and introduces an iOS Swift Package Manager migration. It is unsuitable for blindly pairing with SDK 57 / RN 0.86. Google's guidance points older RN versions to 0.16.3. Keep 0.14.2 exact during the Expo migration; evaluate 0.16.3 in a separate stage after the core build passes. See [Google's compatibility requirements](https://github.com/googlemaps/react-native-navigation-sdk/blob/main/README.md) and [changelog](https://github.com/googlemaps/react-native-navigation-sdk/blob/main/CHANGELOG.md).

## Execution stages

### 1. Establish a reproducible SDK 54 baseline

Record the starting commit, dependency versions, installed device UUIDs, tooling, and passing checks. Create a migration branch or isolated checkout without disturbing user changes. Preserve the current native directories, Pods lockfile, native integration edits, and working development binaries outside generated paths before regenerating anything; the Git commit alone does not preserve ignored native state.

Capture representative screenshots and verify existing browse, guidance startup/cancel, auth, and image flows on the working iOS 26.4 environment and an existing Android AVD. Classify existing failures separately from migration regressions. The passing Jest baseline uses mocked native integrations and is not proof of these runtime flows.

Pin the patched wrapper to 0.14.2. Clean its patch to meaningful source/distribution/declaration changes, excluding `android/build`, compiled binaries, and caches. Persist necessary AppDelegate, manifest, Gradle, location, key initialization, and deployment settings in app config, config plugins, or a tracked native integration module. Keep external integration code in `src/services` and wrapper changes in `patches`.

Reconcile manifest, lockfile, and installed packages; resolve the PostCSS mismatch. Prove `npm ci` in an isolated directory with lifecycle scripts enabled, successful patch application, and `npm ls --all` without invalid or missing dependencies. Review actual install warnings and classify each by owner and remedy. Capture this fresh-install baseline before upgrading.

Gate: fresh installation, JS checks, repeatable native generation, and baseline native smoke tests pass. Repeating generation must retain Google startup and permissions without hand edits.

### 2. Upgrade one Expo SDK at a time

Follow [Expo's incremental upgrade workflow](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/): **54 → 55 → 56 → 57**. These are verification checkpoints, not three product releases.

For each hop, install a deliberately selected stable Expo patch, run `expo install --fix`, review release notes and dependency changes, and run Expo Doctor and `expo install --check`. Update `jest-expo` with its SDK and keep React, React DOM, test renderer, types, Reanimated, Worklets, screens, gestures, and Expo modules aligned. Regenerate only after stage 1 preserves native customization; rebuild both platforms and run focused runtime checks before advancing.

Review [SDK 55 changes](https://expo.dev/changelog/sdk-55), [SDK 56 changes](https://expo.dev/changelog/sdk-56), and [SDK 57 changes](https://expo.dev/changelog/sdk-57). Pay particular attention to Router/navigation APIs, the SDK 56 fetch change affecting Appwrite uploads and weather, the increased iOS minimum, Babel animation transforms, and the newer Hermes runtime. Intermediate iOS checks can use the installed Xcode 26.4 / iOS 26.4 pair; validate the final scene-enabled stage on Xcode 27 / iOS 27.

Remove direct Metro packages if they have no genuine direct use; otherwise align them with Expo's supported bundler. Review direct React Navigation usage against the new Router architecture before removing it. SDK 57 prebuild cleans native directories by default, making stage 1 preservation essential.

Gate after each hop: TypeScript, focused ESLint, all impacted Jest flows, clean dependency checks, native builds, and maps/navigation/auth smoke tests pass. Freeze a checkpoint commit and logs.

### 3. Validate Xcode 27 and navigation integration

Build with `DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer` and target an existing iOS 27 UUID explicitly. Verify scene configuration, cold launch, deep links from terminated and running states, foreground/background transitions, Google key initialization, and Device Hub launch behavior. Diagnose tool launch errors separately from compilation and app lifecycle failures.

Investigate the GoogleNavigation 9.4.0 downgrade and compare every wrapper patch fix with upstream. If moving to 0.16.3, port only fixes still needed, review changed defaults/API behavior, and validate map padding, camera, marker selection, session cleanup, and repeated guidance cycles. Update the patch filename and the corresponding AGENTS/docs version contract together; until then the existing 0.14.2 patch remains authoritative. Do not claim compatibility from a permissive peer range alone.

If missing Android build dependencies are encountered, report the exact requirement before any additional tooling installation. Do not invoke Xcode platform downloads, `sdkmanager` image installation, AVD creation, or emulator resets.

Gate: final native development builds install and launch using existing devices, with Google browse and guidance transitions passing on both platforms.

### 4. Modernize tooling and resolve audited issues in separate changes

Migrate ESLint to the selected Expo config's supported flat configuration and compatible plugins, retaining existing rules and file coverage. Replace deprecated Jest Native setup with supported Testing Library matchers; remove redundant RN stub types. Select Jest/Testing Library versions compatible with `jest-expo`, updating mocks/test boundaries without weakening assertions. Review tests for noisy warnings with an unsilenced run.

Treat NativeWind 2 → a supported version as its own visual migration if compatibility or advisories require it. NativeWind, Tailwind, Babel, and Metro must move as a supported combination; do not independently install Tailwind's latest major. Verify custom button class handling, layouts, dynamic classes, sheets, and animations with screenshots. Preserve existing styling if it remains compatible while resolving security issues through supported dependency updates.

Audit Appwrite SDK upgrades separately against actual service calls, session persistence, error handling, permissions, and uploads. Preserve the backend data model and weather provider during modernization. Review optional tunneling dependencies and unused packages before carrying them forward.

Re-run full and production-only audits after the SDK graph settles. Address critical/high paths and obsolete overrides with compatible upgrades or narrowly documented patches. Never use `npm audit fix --force`: this audit suggests backward Expo/RN versions on some paths. Record each unavoidable transitive warning/advisory, exposure, upstream owner, and follow-up; warning suppression and a lower count are not acceptance criteria.

Remove bundled admin credentials and the password-based Dev Log mechanism in a separate security change while preserving normal email/password authentication. If credentials were distributed, include credential rotation in the deployment follow-up; do not change backend credentials during local migration without coordinating that action.

Gate: fresh installs succeed, the dependency graph is valid, tooling remains effective, and residual warnings/advisories have explicit dispositions. Unresolved critical/high issues need a concrete remediation or assessed exception before release.

### 5. Final validation and maintenance handoff

Run the full local quality gate after the final changes, fresh installation, native builds, runtime matrix below, and release-mode launch smoke tests to catch development-only assumptions. Validate the configured web export too; identify existing web failures separately if native-only code already prevents it. Add a modest CI gate for `npm ci`, type checking, lint, and Jest; update README, runtime requirements, architecture checklist, and patch rationale.

## Regression matrix

Use an existing iOS 27 phone and existing Android AVD as primary targets; repeat key flows on an existing iOS 26.4 device. Exercise both fresh-install and preserved-session scenarios without erasing emulator contents or touching production records indiscriminately. Use test accounts and recognizable test data.

| Flow                      | Required checks                                                                                                                                                                                                                             |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Startup / routing         | Cold/warm launch, splash/fonts, dev-client connect/reload, tabs/back, deep links, session restoration, login/logout/registration, duplicate/invalid credentials.                                                                            |
| Browse map                | Approved markers, tag filters/clear-all, marker selection/deselection, gallery/info window, live location/camera, preserved viewport, unavailable location/network.                                                                         |
| Guidance                  | Permission allowed/denied, browse MapView → NavigationView, startup timeout recovery, repeated start/stop, cancel confirmation both accepted and declined, returning markers/viewport, location updates without restart, background/resume. |
| Marker and profile flows  | Required-field validation, pending creation/moderation visibility, edit/delete permissions, photo pick/upload/failure, favorites, rating create/update and derived average, review/pagination/profile behavior.                             |
| Weather / external IO     | Existing provider, cache/failure recovery, request/response parsing, Appwrite session and Storage uploads after fetch/runtime changes.                                                                                                      |
| Layout / native lifecycle | Notch and system bars, keyboard, sheets/modals, action spacing, safe-area cancel button, Android edge-to-edge, gestures/animations, teardown without duplicate callbacks or crashes.                                                        |
| Performance               | Compare launch time, map responsiveness, guidance cycles, and memory before/after; use the same devices and conditions.                                                                                                                     |

Real-device checks are needed for GPS, camera, actual guidance/audio, background behavior, and power/session cleanup. If no device is available, record these as unverified; emulator success alone cannot close navigation release signoff.

## Rollback and completion

Keep each stage's manifest, lockfile, config/plugins, patches, tooling configuration, and native generation inputs together. Roll back the entire failed stage, reinstall its lockfile, regenerate from the preserved inputs, and rebuild the matching development binary. Retain the baseline native backup until regenerated projects are proven equivalent. Avoid backend/schema changes so SDK rollback does not require a data rollback.

Modernization is complete when a fresh checkout produces a valid dependency tree and working native builds on installed tooling, Device Hub behavior is documented and verified, baseline checks and runtime flows pass, credential exposure is addressed, support-policy changes are explicit, remaining advisories have assessed dispositions, and the next maintainer can repeat the process from tracked inputs.
