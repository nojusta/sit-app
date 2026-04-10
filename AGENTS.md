# SIT App Codex Context

## Project shape

- Keep route files in `app/` thin.
- Put domain logic in `src/features/*`.
- Put external integrations in `src/services/*`.
- Put only truly reusable UI in `src/shared/*`.
- Keep wrapper patches in `patches/*`.

## Import style

- For imports across feature or shared boundaries, prefer barrel exports.
- Examples:
  - `@/features/auth`
  - `@/features/map`
  - `@/features/markers`
  - `@/shared/components`
- For imports inside the same feature or module, prefer relative imports.
- Do not re-import a file through its own barrel from inside the same feature. That is how circular dependencies start.

## Development guidelines

### Keep components dumb

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

### Push logic down into hooks and services

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

### Avoid prop drilling

Do not pass state through many intermediate layers just to reach one child.

Prefer:

- feature-scoped hooks
- context only for app-wide or genuinely shared state
- composing smaller feature components close to where state is used

Do not introduce context for everything. Use it only when state is genuinely shared across distant parts of the tree.

### Prefer explicit boundaries

- route file wires features together
- hook owns behavior
- service owns external IO
- component owns rendering

### Keep files close to their domain

If a file is only used by one feature, place it inside that feature immediately.

Do not dump everything into a global `components/` folder.

### Refactoring rule

When adding new functionality:

1. decide which feature owns it
2. place UI in that feature
3. place API or external logic in a service
4. expose only the needed surface through the feature `index.ts`

## Map and navigation rules

- This repo uses Google’s native map/navigation stack through `@googlemaps/react-native-navigation-sdk`.
- Browse mode uses `MapView`.
- Active guidance uses `NavigationView`.
- Preserve working map behavior first, then improve structure.
- Keep `src/features/map/providers/google-native/GoogleMapSurface.tsx` thin by extracting feature-local hooks, utils, styles, and constants.
- Native wrapper fixes must be persisted in `patches/@googlemaps+react-native-navigation-sdk+0.14.2.patch`.
- Do not rely on ad hoc local changes inside ignored native folders as the source of truth.
- Avoid `useSafeAreaInsets` by default unless there is a concrete reason the native/layout approach cannot solve the problem.
- `CircleButton` and `InfoWindow` stay in the map feature until there is real cross-feature reuse.

## Native workflow

- Development builds are the expected runtime for map and navigation work.
- JS/TS-only changes usually need reloads.
- Native wrapper, manifest, plist, Pod, Gradle, or config changes require a rebuild of the touched platform.
- Real-device validation matters for map/navigation behavior.

## Product domain draft

Treat the following as the current intended product contract unless implemented code or an explicit user instruction says otherwise. This is partially draft business/domain guidance, not a guarantee that every collection or screen already exists in runtime today.

### Appwrite data model concept

- Appwrite native auth owns user sessions and email/password sign-in.
- Marker-like domain data should be modeled around sitting places, not generic map pins.
- Current draft collections:
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
- Marker `title` should be contextual and human, for example “Bench near Cathedral”, not just a street name.
- `imageUrl` is expected to point to Appwrite Storage-backed media.
- `status` is critical business logic and should be treated as an enum:
  - `pending_approval`
  - `approved`
  - `rejected`
- `averageRating` is derived data, not something to hand-wave in UI logic.
- `attributes` is a tag-like array used for filtering, for example `shade`, `quiet`, `work_friendly`.
- Ratings conceptually belong to a `(userId, markerId)` relationship with a `score` from `1` to `5`.
- Favorites conceptually belong to a `(userId, markerId)` relationship.

### Business rules

#### Authentication and profiles

- Registration uses email/password.
- Password must be at least `8` characters.
- Email format must be validated.
- Duplicate emails must be prevented.
- Successful registration should immediately create a session, log the user in, and redirect to the main map screen.
- Login uses normal Appwrite session creation.

#### Marker creation and moderation

- Any authenticated user can create a marker.
- Marker creation requires:
  - title
  - description
  - location
- Photo is optional but strongly encouraged.
- Newly created markers must default to `status = pending_approval`.
- Pending markers are not meant to be publicly visible.
- Admin moderation should be able to review pending markers and move them to approved/rejected states.
- Seeded data is expected to include at least `100` pre-filled OpenStreetMap-derived markers, treated as verified.

#### Navigation and map interactions

- Browse map should show approved markers.
- Starting navigation should require location permissions.
- Starting navigation should transition from standard browse map behavior into the Google Navigation SDK view.
- Canceling navigation must stay available inside the navigation experience.
- Canceling navigation must confirm with an “Are you sure?” style dialog before tearing down guidance and returning to browse mode.

#### Ratings and evaluation

- Authenticated users can rate markers from `1` to `5`.
- When a rating changes, the system should recalculate and persist the owning marker’s `averageRating`.

#### Filters and weather context

- Filters are attribute-driven and should update visible markers dynamically.
- Users should be able to clear all filters at once.
- Weather context is expected to use Meteo.lt data to help indicate whether outdoor sitting is favorable for the current place/time.

## Validation

For non-trivial changes, finish with the smallest meaningful checks:

- `npm run type-check`
- focused `eslint`
- focused Jest on touched flows

If a refactor breaks tests, fix the refactor or the test boundary. Do not weaken the behavior to get green checks.
