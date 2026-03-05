# SIT App

React Native / Expo application for discovering, creating, and rating sitting spots.

## Stack

- Expo SDK 54
- React Native 0.81
- Expo Router
- TypeScript
- Appwrite

## Running the app

This project should be run in development build mode, not as a long-term Expo Go workflow.

### Prerequisites

- Node.js and npm
- Xcode for iOS development builds
- Android Studio for Android development builds
- Expo CLI via `npx`

### Setup

1. Install dependencies:

```bash
npm install
```

2. Create your local env file:

```bash
cp .env.example .env
```

3. Fill in the required Appwrite values in `.env`.

4. If native dependencies changed, regenerate native projects:

```bash
npx expo prebuild
```

### Start Metro for a development build

```bash
npx expo start --dev-client
```

### Launch a native development build

iOS:

```bash
npx expo run:ios
```

Android:

```bash
npx expo run:android
```

### Web

Web is supported only for the parts of the app that have web-safe implementations.

```bash
npx expo start --web
```

## Quality checks

Lint:

```bash
npm run lint
```

Auto-fix lint issues:

```bash
npm run lint:fix
```

Format:

```bash
npm run format
```

`npm run format` runs Prettier across the repository using the script defined in `package.json`:

```bash
prettier --write .
```

Type-check:

```bash
npx tsc --noEmit
```

## Project structure

Route files stay in `app/`. Business logic and reusable modules live in `src/`.

```text
app/
  ...route entrypoints only

src/
  features/
    auth/
    map/
    markers/
  services/
    appwrite/
    weather/
  shared/
    components/
    constants/
    hooks/
```

## Folder rules

### `app/`

- Expo Router entrypoints only
- Keep screens thin
- Compose feature modules here, do not build business logic here

### `src/features/<feature>`

Use a feature folder when code belongs to one domain.

Examples:

- `auth`
- `map`
- `markers`

A feature can contain:

- `components/`
- `hooks/`
- `types/`
- `utils/`
- `services/`
- `index.ts`

### `src/shared`

Put only truly reusable code here.

Examples:

- generic buttons
- form fields
- loaders
- shared constants
- generic hooks

If something is used by only one feature, it should not live in `shared`.

### `src/services`

Use this for integrations and cross-cutting data modules.

Examples:

- Appwrite client/auth/storage
- weather API integration

## Import style

Prefer barrel exports from each feature or shared module.

Examples:

```ts
import { useAuthContext } from "@/features/auth";
import { CircleButton, useMapInteractions } from "@/features/map";
import { CustomButton, FormField } from "@/shared/components";
import { icons, images } from "@/shared/constants";
```

Internal files inside the same module should prefer relative imports instead of re-importing through their own barrel. This avoids circular dependencies.

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
- context only for app-wide/shared state
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
3. place API/external logic in a service
4. expose only the needed surface through the feature `index.ts`

## Notes

- Development builds are the expected native workflow.
- Expo Go may be useful for quick checks, but it should not be treated as the main runtime target for this project.
