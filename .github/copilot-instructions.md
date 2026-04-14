# SIT App Copilot Instructions

## Architecture

- Keep screens and routes in `app/` thin.
- Put business logic in `src/features/*`.
- Put integrations and external IO in `src/services/*`.
- Put only genuinely reusable UI and helpers in `src/shared/*`.

## Import rules

- Use barrel exports when importing across features or from shared modules.
- Good examples:
  - `@/features/auth`
  - `@/features/map`
  - `@/features/markers`
  - `@/shared/components`
- Inside the same feature, prefer relative imports.
- Do not import from your own feature barrel inside that same feature.

## Development guidelines

### Keep components dumb

Components should:

- render data
- emit events
- own layout and styling

Components should not:

- fetch data
- call Appwrite directly
- own auth/session rules
- hide business logic in UI files
- accumulate navigation side effects

### Push logic down

Use hooks for:

- state orchestration
- effects
- screen behavior
- combining data and controller flows

Use utils for:

- pure transforms
- formatting
- validation
- calculations

Use services for:

- Appwrite access
- weather or third-party data
- external system integrations

### Prefer explicit boundaries

- route file wires features together
- hook owns behavior
- service owns IO
- component owns rendering

### Keep files close to the owning domain

- If code is used by one feature, keep it in that feature.
- Do not move one-feature components into `src/shared` just to make the tree look flatter.

### Refactoring rule

When changing a feature:

1. identify the owning feature
2. keep UI in that feature
3. push external logic into services or feature-local utils/hooks
4. expose only the intended surface through the feature `index.ts`

## Map / navigation rules

- This repo uses Google’s native map/navigation stack via `@googlemaps/react-native-navigation-sdk`.
- Browse mode uses `MapView`.
- Active guidance uses `NavigationView`.
- Keep `GoogleMapSurface.tsx` thin by extracting feature-local hooks, utils, constants, and styles.
- Persist native wrapper fixes in `patches/@googlemaps+react-native-navigation-sdk+0.14.2.patch`.
- Do not casually rewrite stable map flows.
- Avoid `useSafeAreaInsets` by default unless there is a proven need.
- Keep `CircleButton` and `InfoWindow` feature-local until there is actual reuse elsewhere.

## Product and data guidance

Treat this section as intended business/domain behavior unless current implementation or explicit user direction says otherwise. Some of this is still draft product guidance and should not be overclaimed as already complete in runtime.

### Appwrite domain model

- Appwrite native auth owns sessions and email/password authentication.
- The main business entity is a sitting-place marker, not a generic map POI.
- Planned/expected collections:
  - `Markers`
  - `Ratings`
  - `Favorites`
- Marker documents conceptually include:
  - `markerId`
  - `title`
  - `description`
  - `latitude`
  - `longitude`
  - `imageUrl`
  - `authorId`
  - `status`
  - `averageRating`
  - `attributes`
  - `createdAt`
- Marker titles should be contextual, not just street names.
- `imageUrl` should point to Appwrite Storage-backed assets.
- Marker `status` is core business logic and should be treated as:
  - `pending_approval`
  - `approved`
  - `rejected`
- `averageRating` is derived from ratings data.
- `attributes` is a string-array filter surface, for example `shade`, `quiet`, `work_friendly`.
- Ratings conceptually map `userId + markerId + score`.
- Favorites conceptually map `userId + markerId`.

### Business rules

- Registration:
  - email/password flow
  - password length at least `8`
  - valid email required
  - duplicate emails blocked
  - successful registration should auto-login and redirect to the main map
- Marker creation:
  - authenticated users can create markers
  - title, description, and location are required
  - photo is optional but preferred
  - new markers default to `pending_approval`
  - pending markers should not be public
- Moderation:
  - admin review flow should approve or reject pending markers
- Seed data:
  - expect at least `100` prefilled verified markers sourced from OpenStreetMap
- Navigation:
  - approved markers are the browse-map source of truth
  - start navigation requires location permission
  - start navigation swaps standard browse behavior into Google Navigation SDK guidance
  - cancel navigation must confirm before returning to browse mode
- Ratings:
  - authenticated users can submit `1-5` ratings
  - rating writes should trigger marker `averageRating` recomputation
- Filtering and weather:
  - filters operate on marker `attributes`
  - users should be able to clear all filters
  - weather context is expected to come from Meteo.lt and help indicate whether sitting outside is favorable

## Validation

Always end meaningful changes with:

- `npm run type-check`
- focused `eslint`
- focused Jest

If a refactor breaks tests, fix the refactor or fix the test boundary. Do not weaken behavior for green checks.
