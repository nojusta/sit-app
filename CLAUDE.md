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

## Validation

For meaningful changes, run:

- `npm run type-check`
- focused `eslint`
- focused Jest

If a refactor changes behavior, fix the refactor rather than lowering the bar.
