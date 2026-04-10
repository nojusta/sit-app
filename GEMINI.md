# SIT App Gemini Context

## Current stack

- Expo SDK 54
- React Native 0.81 / React 19
- Expo Router
- TypeScript
- NativeWind
- Appwrite
- Google Maps + Navigation through `@googlemaps/react-native-navigation-sdk`

## Code organization

- `app/` contains route entrypoints only.
- `src/features/*` contains domain code.
- `src/shared/*` contains only truly reusable code.
- `src/services/*` contains external integrations and IO.
- `patches/*` contains persisted native wrapper fixes.

## Import rules

- Use barrels across module boundaries.
- Prefer:
  - `@/features/auth`
  - `@/features/map`
  - `@/features/markers`
  - `@/shared/components`
- Use relative imports inside the same feature.
- Do not import a file through its own feature barrel from within that feature.

## Development guidelines

### Components

Components should:

- render data
- emit events
- handle layout and styling

Components should not:

- fetch data
- call Appwrite directly
- own business rules
- hide large side-effect chains

### Hooks, utils, services

Use hooks for:

- state orchestration
- effects
- screen behavior
- combining multiple controllers or services

Use utils for:

- pure transforms
- calculations
- validation
- formatting

Use services for:

- Appwrite
- weather
- external systems

### Boundaries

- route file wires features together
- hook owns behavior
- service owns IO
- component owns rendering

### Refactoring

When adding or changing functionality:

1. identify the owning feature
2. keep UI in that feature
3. move external logic into hooks/utils/services
4. expose only the intended API through the feature barrel

## Map-specific constraints

- Preserve the current stable split:
  - browse surface = `MapView`
  - guidance surface = `NavigationView`
- Keep `GoogleMapSurface.tsx` thin.
- Extract helpers into feature-local hooks/utils/constants instead of growing one file.
- Persist native fixes in `patches/@googlemaps+react-native-navigation-sdk+0.14.2.patch`.
- Avoid speculative rewrites of camera, safe-area, or navigation-session behavior.
- Avoid `useSafeAreaInsets` unless it is truly necessary.
- Keep `CircleButton` and `InfoWindow` inside the map feature until actual reuse exists.

## Product and data draft

Use this as intended domain guidance unless implemented code or explicit user instructions say otherwise. This section is partially draft and should not be presented as fully shipped behavior without checking runtime code.

### Appwrite schema concept

- Appwrite native auth is the source of truth for user sessions and email/password auth.
- The main business object is a sitting-place marker.
- Current intended collections:
  - `Markers`
  - `Ratings`
  - `Favorites`
- Marker documents are expected to conceptually contain:
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
- Marker titles should be contextual and descriptive, not generic street labels.
- `imageUrl` is expected to come from Appwrite Storage.
- Marker status is core business logic:
  - `pending_approval`
  - `approved`
  - `rejected`
- `averageRating` is derived from ratings.
- `attributes` is a string-tag array used by filters, for example `shade`, `quiet`, `work_friendly`.
- Ratings conceptually store `ratingId`, `markerId`, `userId`, `score`.
- Favorites conceptually store `favoriteId`, `userId`, `markerId`.

### Business logic

- Registration:
  - email/password only
  - password length >= `8`
  - validate email format
  - block duplicate emails
  - auto-login after successful signup and redirect to main map
- Login:
  - standard Appwrite session flow
- Marker creation:
  - authenticated users can create markers
  - title, description, and location are required
  - photo is optional but encouraged
  - newly created markers must default to `pending_approval`
  - pending markers are not public
- Moderation:
  - admins should be able to review pending markers and mark them approved/rejected
- Seed data:
  - expect at least `100` pre-filled, verified OpenStreetMap-derived markers
- Navigation:
  - browse mode should show approved markers
  - start navigation requires GPS permission
  - navigation swaps from standard browse map into the Google Navigation SDK view
  - cancel navigation must confirm before teardown and return to browse mode
- Ratings:
  - authenticated users can rate markers from `1` to `5`
  - rating changes should trigger marker `averageRating` recomputation
- Filtering and weather:
  - filters should operate on marker `attributes`
  - users should be able to clear all filters
  - weather context is expected to use Meteo.lt to indicate whether outdoor sitting is favorable

## Validation

For non-trivial changes:

- run `npm run type-check`
- run focused `eslint`
- run focused Jest

If something fails after a refactor, restore behavior rather than hiding the failure.
