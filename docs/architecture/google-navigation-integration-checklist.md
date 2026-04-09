# Google Navigation Integration Checklist

This checklist reflects the current SIT app integration against:

- Google Navigation SDK for iOS route guide
- Google Navigation for React Native package README

Date checked: 2026-04-05

## Core SDK setup

- [x] Google Navigation SDK package installed
- [x] `NavigationProvider` wired around the map surface
- [x] Google Maps API key provided to iOS native startup
- [x] iOS deployment target raised to 16.0
- [x] App uses the Google map surface for both browse and navigation modes
- [x] Active navigation hides the bottom tab bar
- [x] Navigation stop action is safe-area anchored

## Current runtime behavior

- [x] Browse map renders through Google `MapView`
- [x] Active guidance mode renders through Google `NavigationView`
- [x] Browse mode uses default local markers from `src/features/map/core/defaultMarkers.ts`
- [x] Marker sync falls back to default pins if the custom marker image cannot be loaded
- [x] Current-location camera movement is animated instead of snapping immediately
- [x] Navigation startup has a timeout and cleanup path instead of an endless loader
- [x] iOS simulator startup can fall back to SDK location simulation in development builds

## Still missing for production readiness

- [ ] Real markers are not loaded from Appwrite yet
- [ ] Marker clustering is not implemented on the Google browse map yet
- [ ] iOS navigation flow still requests foreground location only; Google docs/examples expect "always" location for full navigation use
- [ ] iOS background notification authorization for guidance is not requested yet
- [ ] Idle timer is not disabled during active navigation
- [ ] Attribution/licensing UI for Google Navigation is not added yet
- [ ] Real-device validation is still missing for both iOS and Android
- [ ] Android architecture/config should be rechecked against the current package docs before Android QA

## Simulator-specific notes

- [x] iOS simulator is usable for browse-map testing
- [x] iOS simulator route startup now has a development fallback using the SDK location simulator
- [ ] Simulator behavior is not enough to sign off production navigation reliability

## Known risks

- The React Native Google Navigation package is still beta.
- The official repo has open iOS session attachment/detachment work upstream, so native lifecycle bugs remain a real risk.
- The integration currently mixes stable app state with a still-evolving native package surface, so release signoff should require real-device testing.

## Immediate next steps

1. Validate the new startup flow again on the iOS simulator after a JS reload.
2. Test the same flow on a real Android device if available.
3. Wire Appwrite marker loading so browse mode uses real backend data.
4. Add clustering back on the browse map once real markers are loaded.
5. Upgrade iOS permission handling from foreground-only to a navigation-specific permission flow.
