# SIT App Claude Context

## Architecture

- Keep route files in `app/` thin.
- Put feature logic in `src/features/*`.
- Put external IO in `src/services/*`.
- Put only real shared code in `src/shared/*`.

## Import style

- Use barrel imports across feature and shared boundaries.
- Prefer imports like:
  - `@/features/auth`
  - `@/features/map`
  - `@/features/markers`
  - `@/shared/components`
- Use relative imports within the same feature.
- Do not import your own feature through its barrel from inside that feature.

## Development guidelines

### Keep components dumb

Good component responsibilities:

- render data
- emit events
- own styling and layout

Bad component responsibilities:

- fetching data
- auth/session management
- Appwrite calls
- business rules
- large navigation side effects

### Push logic into hooks and services

Use hooks for:

- state orchestration
- effects
- screen behavior
- combining multiple dependencies

Use utils for:

- pure transforms
- formatting
- validation
- calculations

Use services for:

- Appwrite access
- third-party integrations
- external data access

### Prefer explicit boundaries

- route file wires features together
- hook owns behavior
- service owns IO
- component owns rendering

### Keep files close to their domain

- If it is only used by one feature, keep it in that feature.
- Do not promote one-feature UI to `src/shared` early.

### Refactoring rule

1. identify the owning feature
2. keep UI in that feature
3. move IO and orchestration down into hooks/utils/services
4. expose only the needed API through the feature barrel

## Map rules

- This repo uses Google’s native map/navigation stack via `@googlemaps/react-native-navigation-sdk`.
- Browse mode uses `MapView`.
- Guidance mode uses `NavigationView`.
- Keep `GoogleMapSurface.tsx` thin.
- Prefer feature-local hooks/utils/constants over one giant component.
- Persist native wrapper fixes in `patches/@googlemaps+react-native-navigation-sdk+0.14.2.patch`.
- Avoid `useSafeAreaInsets` by default.
- Keep `CircleButton` and `InfoWindow` inside the map feature until real reuse exists.

## Product and data guidance

Treat this as intended product/domain logic unless the user overrides it or the implemented code clearly differs. Some of this is still draft and should be treated as guidance, not assumed-live functionality.

### Appwrite schema concept

- Appwrite native auth owns email/password sessions.
- The core domain object is a sitting-place marker.
- Current intended collections:
  - `Markers`
  - `Ratings`
  - `Favorites`
- Marker documents are expected to conceptually include:
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
- Titles should be contextual and human, for example “Bench near Cathedral”, not just a road name.
- `imageUrl` should reference Appwrite Storage media.
- Marker `status` is strict business logic:
  - `pending_approval`
  - `approved`
  - `rejected`
- `averageRating` is derived from ratings data.
- `attributes` is a string-array filter surface.
- Ratings conceptually bind `userId`, `markerId`, and a `1-5` score.
- Favorites conceptually bind `userId` and `markerId`.

### Business rules

- Registration:
  - email/password flow
  - password length must be at least `8`
  - validate email format
  - prevent duplicate emails
  - successful signup should auto-login and redirect to the main map
- Login:
  - standard Appwrite session creation
- Marker creation:
  - available to authenticated users
  - title, description, and location are required
  - photo is optional but preferred
  - new markers must default to `pending_approval`
  - pending markers are not public
- Moderation:
  - admins should review pending markers and approve/reject them
- Seeded data:
  - expect at least `100` verified OpenStreetMap-derived markers
- Navigation:
  - browse map should show approved markers
  - start navigation requires location permission
  - start navigation transitions into the Google Navigation SDK view
  - cancel navigation must confirm before tearing guidance down and returning to browse mode
- Ratings:
  - authenticated users can rate markers from `1` to `5`
  - marker `averageRating` should be recalculated after rating submission
- Filters and weather:
  - filters operate on marker `attributes`
  - users can clear all filters
  - weather context is expected to use Meteo.lt to indicate whether sitting outside is favorable right now

## Validation

For meaningful changes, run:

- `npm run type-check`
- focused `eslint`
- focused Jest

If a refactor changes behavior, fix the refactor rather than lowering the bar.
