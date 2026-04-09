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

## Validation

For non-trivial changes, finish with the smallest meaningful checks:

- `npm run type-check`
- focused `eslint`
- focused Jest on touched flows

If a refactor breaks tests, fix the refactor or the test boundary. Do not weaken the behavior to get green checks.
