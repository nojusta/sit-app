# Google Native Map Migration

## Decision

Use Google as the single map and navigation provider, but do not make the beta React Native wrapper the long-term foundation.

The target stack for this repo is:

- official Google Maps SDK for Android
- official Google Maps SDK for iOS
- official Google Navigation SDK for Android
- official Google Navigation SDK for iOS
- a thin repo-owned Expo/native bridge that exposes only the map and navigation features this app needs

This means the current `react-native-maps` discovery layer and the experimental `@googlemaps/react-native-navigation-sdk` layer are transitional only.

## Why This Repo Should Migrate

The current screen in [home.tsx](/Users/nojukas123/Documents/vscode/sit-app/app/%28tabs%29/home.tsx) still mixes two map engines:

- `react-native-maps` and `react-native-map-clustering` for browsing markers
- Google Navigation SDK only after navigation starts

That architecture creates long-term problems:

- duplicated camera and lifecycle rules
- separate discovery and navigation rendering stacks
- provider-specific logic leaking into screen code
- harder testing and more platform-only bugs

The current state hook in [useMapInteractions.ts](/Users/nojukas123/Documents/vscode/sit-app/src/features/map/hooks/useMapInteractions.ts) is also carrying both domain state and SDK assumptions. That is fine for the existing prototype, but not for a map/navigation platform layer.

## Target Repo Architecture

### 1. Domain Layer

Create a provider-agnostic map session layer under:

```text
src/features/map/core/
  commands.ts
  session.ts
  selectors.ts
  types.ts
```

This layer owns:

- selected marker
- user location state
- permission state
- add-marker draft state
- active navigation session
- camera intents such as `focusMarker`, `centerOnUser`, `fitNavigation`, `resetBrowseView`

This layer must not import any SDK packages.

### 2. Google Provider Adapter

Create a JS adapter layer under:

```text
src/features/map/providers/google-native/
  GoogleMapSurface.tsx
  GoogleNavigationSurface.tsx
  GoogleMapEngine.ts
  index.ts
```

This layer translates domain commands into native map/navigation actions. It should be the only JS area that knows about the Google bridge API shape.

### 3. Native Bridge

Create a repo-owned Expo module under:

```text
modules/google-map-engine/
```

Responsibilities:

- render the browse map surface
- render native markers
- control camera
- expose user location state
- switch into navigation mode inside the same provider stack
- send marker press / camera / lifecycle events back to JS

This is the correct place for provider-specific clustering, camera fitting, and native SDK lifecycle behavior.

### 4. App UI Layer

Keep UI composition in React Native under the existing feature folders:

- [InfoWindow.tsx](/Users/nojukas123/Documents/vscode/sit-app/src/features/map/components/InfoWindow.tsx)
- [CircleButton.tsx](/Users/nojukas123/Documents/vscode/sit-app/src/features/map/components/CircleButton.tsx)
- [CustomButton.tsx](/Users/nojukas123/Documents/vscode/sit-app/src/shared/components/CustomButton.tsx)
- [NoticeBanner.tsx](/Users/nojukas123/Documents/vscode/sit-app/src/shared/components/NoticeBanner.tsx)

These components should stay UI-only and consume domain state, not provider APIs directly.

## Repo-Specific Refactor Plan

### Phase 0: Freeze the Current Mixed Stack

Do not add new map features to:

- [home.tsx](/Users/nojukas123/Documents/vscode/sit-app/app/%28tabs%29/home.tsx)
- [useMapInteractions.ts](/Users/nojukas123/Documents/vscode/sit-app/src/features/map/hooks/useMapInteractions.ts)

until the provider boundary exists.

### Phase 1: Extract Domain State

Move business state out of [useMapInteractions.ts](/Users/nojukas123/Documents/vscode/sit-app/src/features/map/hooks/useMapInteractions.ts):

- selected marker
- marker creation flow
- navigation session state
- permission gating rules
- browse vs navigation mode

Keep only orchestration in the screen and provider adapters.

Expected result:

- [home.tsx](/Users/nojukas123/Documents/vscode/sit-app/app/%28tabs%29/home.tsx) becomes a thin container
- map-specific rendering decisions stop living in the screen

### Phase 2: Build Browse Map Parity on the Native Google Stack

Implement the same browse-mode behavior on the Google-native bridge:

- initial camera
- current location display
- marker rendering
- marker selection
- marker details handoff to JS bottom sheet
- add-marker camera positioning

At this phase the app should still support:

- opening marker info
- centering on user
- opening the add-marker flow

but should no longer depend on `react-native-maps`.

### Phase 3: Navigation Mode on the Same Provider Stack

Navigation should not swap to a separate provider anymore.

Required behavior:

- same map provider before and after navigation starts
- `Start Navigation` changes the active mode, not the SDK
- navigation route, camera, and guidance all remain inside the Google-native surface
- the add-marker action stays hidden while navigation is active

This phase replaces the temporary [GoogleNavigationView.tsx](/Users/nojukas123/Documents/vscode/sit-app/src/features/map/components/GoogleNavigationView.tsx) approach.

### Phase 4: Remove Legacy Dependencies

Remove these once browse and navigation parity are complete:

- `react-native-maps`
- `react-native-map-clustering`
- `@googlemaps/react-native-navigation-sdk`

This should also delete any provider-mixed test setup that mocks those packages directly.

### Phase 5: Production Hardening

Add these before shipping the final stack:

- platform-specific API keys
- per-environment keys for debug and release
- billing budget guardrail
- native crash and navigation failure logging
- device smoke tests for permission, browse, and navigation flows
- Google attribution / licensing copy where required

## Config Standards

Use separate keys and identifiers. Do not use one unrestricted key across both platforms.

Required env shape for this repo:

- `GOOGLE_CLOUD_PROJECT_ID`
- `GOOGLE_CLOUD_BILLING_ACCOUNT_ID`
- `GOOGLE_MAPS_ANDROID_API_KEY`
- `GOOGLE_MAPS_IOS_API_KEY`
- `GOOGLE_MAPS_ANDROID_PACKAGE_NAME`
- `GOOGLE_MAPS_IOS_BUNDLE_ID`
- `GOOGLE_MAPS_ANDROID_DEBUG_SHA1`
- `GOOGLE_MAPS_ANDROID_RELEASE_SHA1`
- `GOOGLE_MAPS_MONTHLY_BUDGET_AMOUNT`

Recommended:

- `GOOGLE_MAPS_ANDROID_MAP_ID`
- `GOOGLE_MAPS_IOS_MAP_ID`

## Cost Guardrails

Use Google budgets and restricted keys from day one.

Practical notes for this app:

- Navigation billing is the main cost-sensitive path.
- Google documents the first `1,000` destinations per month as free for Navigation SDK.
- Guidance, traffic updates, and reroutes after a destination has already been fetched are not billed as separate navigation starts.
- Discovery map usage should still use restricted mobile keys and budget alerts.

## MCP Automation Strategy

This repo should keep Google setup automation local and repo-scoped, just like the Appwrite MCP server.

The local Google setup MCP server should handle:

- checking local Google Cloud setup state
- listing billing accounts
- linking a project to billing
- enabling required mobile map services
- creating Android and iOS restricted API keys
- creating a project budget guardrail

It should not own runtime map behavior. It is setup tooling only.

## Recommended Next Implementation Steps

1. Build `src/features/map/core/` and move session state out of [useMapInteractions.ts](/Users/nojukas123/Documents/vscode/sit-app/src/features/map/hooks/useMapInteractions.ts).
2. Create `modules/google-map-engine/` as the long-term bridge target.
3. Rebuild browse mode first, then navigation mode.
4. Delete the mixed `react-native-maps` path only after browse parity is complete.

## Sources

- Google Navigation SDK Android setup overview: https://developers.google.com/maps/documentation/navigation/android-sdk/setup-overview
- Google React Native Navigation SDK repo: https://github.com/googlemaps/react-native-navigation-sdk
- Navigation SDK Android pricing: https://developers.google.com/maps/documentation/navigation/android-sdk/pricing
- Navigation SDK iOS pricing: https://developers.google.com/maps/documentation/navigation/ios-sdk/pricing
- Google Maps Platform billing overview: https://developers.google.com/maps/billing-and-pricing/overview
- Google Maps API key security best practices: https://developers.google.com/maps/api-security-best-practices
