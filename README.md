# SIT

<p align="center">
  Mobile app for discovering, creating, and navigating to sitting spots.
</p>

<p align="center">
  <img alt="Expo SDK 54" src="https://img.shields.io/badge/Expo%20SDK-54-111827?style=for-the-badge&logo=expo&logoColor=white" />
  <img alt="React Native 0.81" src="https://img.shields.io/badge/React%20Native-0.81-0891B2?style=for-the-badge&logo=react&logoColor=white" />
  <img alt="Google Maps" src="https://img.shields.io/badge/Google%20Maps-Native%20Navigation-16A34A?style=for-the-badge&logo=googlemaps&logoColor=white" />
  <img alt="Appwrite" src="https://img.shields.io/badge/Appwrite-Backend-F02E65?style=for-the-badge&logo=appwrite&logoColor=white" />
</p>

SIT runs on Expo development builds, uses Appwrite for backend services, and relies on Google’s native map/navigation stack through `@googlemaps/react-native-navigation-sdk` plus tracked wrapper patches.

## Stack

- Expo SDK 54
- React Native 0.81 / React 19
- Expo Router
- TypeScript
- NativeWind
- Appwrite
- Google Cloud Maps Platform + Google Navigation SDK
- Jest, ESLint, Husky, patch-package

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Create your local env:

```bash
cp .env.example .env
```

3. Fill in the required Appwrite and Google Maps values.

4. Start Metro for a development build:

```bash
npx expo start --dev-client
```

5. Install a native dev build:

```bash
npx expo run:ios
npx expo run:android
```

## Quality Gate

```bash
npm run type-check
npm run lint
npm run test:ci
```

Or run the full local gate:

```bash
npm run check
```

## AI Context

These files are intentionally checked in so AI coding tools start with the same architectural context:

- Codex: [AGENTS.md](./AGENTS.md)
- GitHub Copilot: [.copilot-instructions.md](./.github/copilot-instructions.md)
- Gemini: [GEMINI.md](./GEMINI.md)
- Claude: [CLAUDE.md](./CLAUDE.md)

Keep them aligned whenever the stack, feature boundaries, or workflow expectations change.

## Project Shape

- `app/`: Expo Router entrypoints only
- `src/features/`: domain code
- `src/shared/`: truly reusable UI and utilities
- `src/services/`: external integrations
- `patches/`: persisted native wrapper fixes

Current map architecture is documented in:

- [Google Native Map Migration](./docs/architecture/google-native-map-migration.md)
- [Google Navigation Integration Checklist](./docs/architecture/google-navigation-integration-checklist.md)

<details>
<summary>Development Workflows</summary>

### Runtime expectations

- Use development builds for maps and navigation.
- Expo Go is not the long-term runtime target for this repo.
- JS/TS-only changes usually need reloads.
- Native wrapper, Pods, Gradle, manifest, plist, or config changes require rebuilds.

### Useful commands

```bash
npm run ios
npm run android
npm run web
```

If native dependencies or config changed:

```bash
npx expo prebuild
```

### Real-device testing

- Prefer real-device validation for map and navigation behavior.
- Simulator/emulator runs are useful, but not enough for final confidence.

### Development guidelines

#### Keep components dumb

Components should be UI-focused.

Good component responsibilities:

- render data
- emit events
- handle styling and layout

Bad component responsibilities:

- fetching data
- auth/session management
- Appwrite calls
- business rules
- navigation branching with lots of side effects

#### Push logic down into hooks and services

Use hooks for:

- state orchestration
- effects
- screen behavior
- combining multiple services

Use utils for:

- pure transformations
- formatting
- validation
- calculation helpers

Use services for:

- Appwrite access
- weather fetching
- external integrations

#### Avoid prop drilling

Do not pass state through many intermediate layers just to reach one child.

Prefer:

- feature-scoped hooks
- context only for app-wide or genuinely shared state
- composing smaller feature components close to where state is used

Do not introduce context for everything. Use it only when state is genuinely shared across distant parts of the tree.

#### Prefer explicit boundaries

- route file wires features together
- hook owns behavior
- service owns external IO
- component owns rendering

#### Keep files close to their domain

If a file is only used by one feature, place it inside that feature immediately.

Do not dump everything into a global `components/` folder.

#### Refactoring rule

When adding new functionality:

1. decide which feature owns it
2. place UI in that feature
3. place API or external logic in a service
4. expose only the needed surface through the feature `index.ts`

#### Import style

- Use barrel imports across feature and shared boundaries.
- Good examples:
  - `@/features/auth`
  - `@/features/map`
  - `@/features/markers`
  - `@/shared/components`
- Use relative imports inside the same feature.
- Do not import your own feature through its barrel from inside that feature.

</details>

<details>
<summary>Environment Notes</summary>

Key local values usually needed in `.env`:

```bash
APPWRITE_ENDPOINT=https://<region>.cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=<your-project-id>
APPWRITE_API_KEY=<server-api-key>

GOOGLE_CLOUD_PROJECT_ID=<your-gcp-project-id>
GOOGLE_CLOUD_BILLING_ACCOUNT_ID=<your-billing-account-id>
GOOGLE_MAPS_ANDROID_API_KEY=<android-key>
GOOGLE_MAPS_IOS_API_KEY=<ios-key>
GOOGLE_MAPS_ANDROID_PACKAGE_NAME=com.sitapp
GOOGLE_MAPS_IOS_BUNDLE_ID=com.sitapp
GOOGLE_MAPS_ANDROID_DEBUG_SHA1=<debug-sha1>
```

</details>

<details>
<summary>MCP Setup</summary>

This repo ships local MCP servers for infrastructure automation:

- Appwrite MCP: `npm run mcp:appwrite`
- Google Maps / Google Cloud MCP: `npm run mcp:google-maps`

They are meant for setup and admin workflows, not for runtime map rendering.

</details>

## Notes

- Git hooks are installed via `npm install`.
- `patch-package` runs on `postinstall`, so wrapper fixes are reapplied automatically.
