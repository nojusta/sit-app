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

## Validation

For non-trivial changes:

- run `npm run type-check`
- run focused `eslint`
- run focused Jest

If something fails after a refactor, restore behavior rather than hiding the failure.
