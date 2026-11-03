import { useEffect, useMemo, useRef, useState } from "react";
import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Location from "expo-location";
import { useAuthContext } from "@/features/auth";
import useUserLocation, {
  type LocationSource,
} from "@/features/map/hooks/useUserLocation";
import { retryTransientNativeCommand } from "@/features/map/providers/google-native/googleMapSurface.utils";
import useMarkerRating from "@/features/markers/hooks/useMarkerRating";
import { type MarkerWeatherState } from "@/features/weather/hooks/useMarkerWeather";
import {
  clearWeatherCache,
  getWeatherCacheEntry,
  getWeatherCacheKey,
  isWeatherCacheFresh,
  setWeatherCacheEntry,
} from "@/features/weather/utils/weatherCache";
import {
  createMarker,
  submitMarkerRating,
  type MarkerRecord,
  type MarkerTagId,
} from "@/services/appwrite";
import {
  normalizeOpenMeteoWeather,
  fetchOpenMeteoWeatherSnapshot,
} from "@/services/weather";
type Task = {
  id: string;
  kind: string;
  metric?: string;
  scenario?: string;
  repeats?: number;
  count?: number;
  delayMs?: number;
};
export type Bootstrap = {
  user: { id: string; jwt: string };
  markerId: string;
  fixture: object;
  runId: string;
};
export type WeatherTarget = {
  id: string;
  title: string;
  coordinate: { latitude: number; longitude: number };
};
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const coordinate = { latitude: 54.6858, longitude: 25.287 };
const extra = Constants.expoConfig?.extra ?? {};
const url = String(extra.SIT_3LD_URL || "");
const token = String(extra.SIT_3LD_TOKEN || "");
const ratingWriteTrace: { atMs: number; method: string; status?: number }[] = [];
let realWeatherOnce = false;
async function controller(path: string, body?: object) {
  const response = await fetch(url + path, {
    method: body ? "POST" : "GET",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) throw new Error(`3LD controller ${path}: ${response.status}`);
  return response.json();
}
export function useQualityLabSession(boot: Bootstrap) {
  const { setUser, setIsLogged } = useAuthContext();
  const mode = useRef({ kind: "immediate", delayMs: 0 });
  const source = useMemo<LocationSource>(() => {
    const permission: LocationSource["getForegroundPermissionsAsync"] = async () => {
      if (mode.current.kind === "os") return Location.getForegroundPermissionsAsync();
      const granted = mode.current.kind !== "denied";
      return {
        status: granted
          ? Location.PermissionStatus.GRANTED
          : Location.PermissionStatus.DENIED,
        granted,
        canAskAgain: true,
        expires: "never",
      };
    };
    return {
      getForegroundPermissionsAsync: permission,
      requestForegroundPermissionsAsync: permission,
      getCurrentPositionAsync: async (options) => {
        if (mode.current.kind === "os") return Location.getCurrentPositionAsync(options);
        if (mode.current.delayMs) await wait(mode.current.delayMs);
        if (mode.current.kind === "gps-error")
          throw new Error("3LD controlled GPS failure");
        return {
          coords: {
            ...coordinate,
            altitude: 0,
            accuracy: 5,
            altitudeAccuracy: 5,
            heading: 0,
            speed: 0,
          },
          timestamp: Date.now(),
        };
      },
    };
  }, []);
  const location = useUserLocation(source);
  const currentLocation = useRef(location);
  currentLocation.current = location;
  const rating = useMarkerRating({ markerId: boot.markerId });
  const currentRating = useRef(rating);
  currentRating.current = rating;
  const [screen, setScreen] = useState("dashboard");
  const [status, setStatus] = useState("Ready");
  const [last, setLast] = useState("Waiting for a measurement command");
  const [title, setTitle] = useState("3LD sitting place");
  const [description, setDescription] = useState("Synthetic laboratory description");
  const [attributes, setAttributes] = useState<MarkerTagId[]>([]);
  const [targets, setTargets] = useState<WeatherTarget[]>([]);
  const weatherStates = useRef(new Map<string, MarkerWeatherState>());
  const onWeatherState = useMemo(
    () => (id: string, state: MarkerWeatherState) => {
      weatherStates.current.set(id, state);
    },
    [],
  );
  const actions = useRef<string[]>([]);
  const marker: MarkerRecord = {
    id: boot.markerId,
    title,
    description,
    coordinate,
    location: "Vilnius",
    status: "pending_approval",
    authorId: boot.user.id,
    createdAt: new Date().toISOString(),
    photoUrl: null,
    photoUrls: [],
    attributes: [],
  };

  useEffect(() => {
    let active = true;
    async function weatherWave(count: number, prefix: string) {
      setTargets([]);
      weatherStates.current.clear();
      await wait(50);
      const markers = Array.from({ length: count }, (_, i) => ({
        id: `${prefix}-${i}`,
        title: "3LD weather fixture",
        coordinate,
      }));
      const start = performance.now();
      setTargets(markers);
      const completions: { id: string; elapsedMs: number; success: boolean }[] = [];
      const completed = new Set<string>();
      while (completed.size < count && performance.now() - start < 10000) {
        for (const m of markers) {
          const state = weatherStates.current.get(m.id);
          if (
            !completed.has(m.id) &&
            state &&
            !state.isLoading &&
            (state.snapshot || state.errorMessage)
          ) {
            completed.add(m.id);
            completions.push({
              id: m.id,
              elapsedMs: performance.now() - start,
              success: Boolean(state.snapshot),
            });
          }
        }
        await wait(10);
      }
      return { completions, elapsedMs: performance.now() - start, requested: count };
    }
    async function execute(task: Task): Promise<object> {
      const repeats = task.repeats ?? 10;
      if (task.kind === "location") {
        const samples = [];
        for (let i = 0; i < repeats; i++) {
          mode.current = {
            kind: task.scenario || "immediate",
            delayMs: task.delayMs || 0,
          };
          const start = performance.now();
          await currentLocation.current.refreshLocation({ requestPermission: false });
          const durationMs = performance.now() - start;
          await wait(30);
          const actual = currentLocation.current;
          samples.push({
            durationMs,
            permission: actual.permissionState,
            hasPosition: Boolean(actual.location),
            passed:
              task.scenario === "denied"
                ? actual.permissionState === "denied" && actual.location === null
                : task.scenario === "gps-error"
                  ? actual.permissionState === "granted" && actual.location === null
                  : actual.permissionState === "granted" && actual.location !== null,
          });
        }
        return {
          samples,
          source:
            task.scenario === "os"
              ? "Expo Location / simulator OS"
              : "controlled LocationSource; actual production hook",
        };
      }
      if (task.kind === "os-permission") {
        const samples = [];
        for (let i = 0; i < repeats; i++) {
          const permission = await Location.getForegroundPermissionsAsync();
          samples.push({
            status: permission.status,
            granted: permission.granted,
            passed: task.scenario === "allow" ? permission.granted : !permission.granted,
          });
        }
        return { samples, source: "actual Expo Location permission API / simulator OS" };
      }
      if (task.kind === "backend-summary")
        return controller(`/backend-summary?metric=${task.metric || ""}`);
      if (task.kind === "retry") {
        const samples = [];
        for (let i = 0; i < repeats; i++) {
          let attempts = 0;
          let outcome = "success";
          const start = performance.now();
          try {
            await retryTransientNativeCommand(
              async () => {
                attempts++;
                if (task.scenario === "permanent" || attempts === 1)
                  throw new Error("3LD transient native error");
                return "ok";
              },
              () => true,
            );
          } catch {
            outcome = "error";
          }
          samples.push({
            durationMs: performance.now() - start,
            attempts,
            outcome,
            passed:
              task.scenario === "permanent"
                ? attempts === 4 && outcome === "error"
                : attempts === 2 && outcome === "success",
          });
        }
        return {
          samples,
          source: "production retry function; controlled native command errors",
        };
      }
      if (task.kind === "weather") {
        clearWeatherCache();
        return weatherWave(task.count || 1, task.id);
      }
      if (task.kind === "reset-weather") {
        setTargets([]);
        weatherStates.current.clear();
        clearWeatherCache();
        setLast("Weather baseline reset");
        return { reset: true };
      }
      if (task.kind === "cache-network") {
        clearWeatherCache();
        const snapshot = normalizeOpenMeteoWeather(boot.fixture);
        const id = task.id;
        setWeatherCacheEntry(
          getWeatherCacheKey(`${id}-0`, coordinate),
          snapshot,
          Date.now() - (task.scenario === "fresh" ? 29 : 31) * 60000,
        );
        const before = await controller("/stats");
        for (let n = 0; n < 10; n++) await weatherWave(1, id);
        const after = await controller("/stats");
        return {
          requests: after.weatherRequests - before.weatherRequests,
          opens: 10,
          ageMinutes: task.scenario === "fresh" ? 29 : 31,
        };
      }
      if (task.kind === "cache-capacity") {
        clearWeatherCache();
        const count = task.count || 1;
        const snapshot = normalizeOpenMeteoWeather(boot.fixture);
        for (let i = 0; i < count; i++) setWeatherCacheEntry(`${task.id}-${i}`, snapshot);
        let retained = 0;
        for (let i = 0; i < count; i++) {
          const entry = getWeatherCacheEntry(`${task.id}-${i}`);
          if (entry && isWeatherCacheFresh(entry) && entry.snapshot === snapshot)
            retained++;
        }
        return { inserted: count, retained };
      }
      if (task.kind === "invalid-rating") {
        const samples = [];
        for (let i = 0; i < repeats; i++) {
          let message = "";
          try {
            await submitMarkerRating({
              markerId: boot.markerId,
              userId: boot.user.id,
              score: task.count ?? 0,
            });
          } catch (error) {
            message = error instanceof Error ? error.message : String(error);
          }
          samples.push({
            score: task.count,
            message,
            passed: message === "Rating must be an integer between 1 and 5.",
          });
        }
        return { samples };
      }
      if (task.kind === "create-marker") {
        const samples = [];
        for (let i = 0; i < repeats; i++) {
          try {
            const created = await createMarker({
              title: `3LD normal marker ${i}`,
              description: "3LD fixture",
              coordinate: {
                ...coordinate,
                latitude: coordinate.latitude + (i + 1) / 100000,
              },
              authorId: boot.user.id,
            });
            samples.push({
              id: created.id,
              status: created.status,
              passed: created.status === "pending_approval",
            });
            await controller("/delete-test-marker", { id: created.id });
          } catch (error) {
            samples.push({
              passed: false,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }
        return {
          samples,
          source: "production createMarker with isolated Appwrite collection",
        };
      }
      if (task.kind === "show-form") {
        actions.current = [];
        setAttributes([]);
        setScreen(task.scenario || "dashboard");
        return { shown: task.scenario };
      }
      if (task.kind === "actions") return { actions: actions.current };
      if (task.kind === "show-rating") {
        await controller("/reset-ratings", {});
        ratingWriteTrace.length = 0;
        setUser({
          $id: boot.user.id,
          accountID: boot.user.id,
          email: "3ld@example.invalid",
          username: "SIT 3LD",
        });
        setIsLogged(true);
        currentRating.current.handleScoreChange(4);
        currentRating.current.handleCommentChange("3LD double-submit test");
        setScreen("rating");
        return { ready: true };
      }
      if (task.kind === "rating-result")
        return { ...(await controller("/rating-count")), writes: [...ratingWriteTrace] };
      if (task.kind === "open-meteo-smoke") {
        realWeatherOnce = true;
        try {
          const snapshot = await fetchOpenMeteoWeatherSnapshot({
            coordinate,
            sourceLocationLabel: "3LD real integration",
            upcomingHours: 4,
          });
          return {
            hasTemperature: typeof snapshot.current?.temperatureC === "number",
            forecastHours: snapshot.upcoming.length,
            source: "production provider, real device fetch to Open-Meteo, no fixture",
          };
        } finally {
          realWeatherOnce = false;
        }
      }
      throw new Error(`Unknown measurement: ${task.kind}`);
    }
    async function poll() {
      while (active) {
        try {
          const task: Task | null = await controller(`/next?platform=${Platform.OS}`);
          if (task) {
            setStatus(
              `${task.metric || task.kind} / ${task.scenario || task.count || ""}`,
            );
            let result: object;
            try {
              result = await execute(task);
            } catch (error) {
              result = { error: error instanceof Error ? error.message : String(error) };
            }
            setLast(JSON.stringify(result, null, 2));
            await controller("/result", { id: task.id, result });
            setStatus("Ready");
          }
        } catch (error) {
          setStatus(error instanceof Error ? error.message : String(error));
        }
        await wait(300);
      }
    }
    void controller("/register", {
      platform: Platform.OS,
      osVersion: Platform.Version,
      appVersion: Constants.expoConfig?.version,
      development: __DEV__,
      jsEngine: "Hermes",
      runId: boot.runId,
    }).catch((error) => setStatus(String(error)));
    void poll();
    return () => {
      active = false;
    };
  }, [boot, setIsLogged, setUser]);

  const recordAction = (name: string) => {
    actions.current.push(name);
  };
  return {
    screen,
    setScreen,
    status,
    last,
    title,
    setTitle,
    description,
    setDescription,
    attributes,
    setAttributes,
    targets,
    onWeatherState,
    rating,
    marker,
    recordAction,
  };
}
export function useQualityLabBootstrap() {
  const [boot, setBoot] = useState<Bootstrap | null>(null);
  const [error, setError] = useState("Preparing isolated 3LD session");
  const { setUser, setIsLogged } = useAuthContext();
  useEffect(() => {
    const originalFetch = globalThis.fetch;
    let active = true;
    let jwt = "";
    globalThis.fetch = async (input, init) => {
      const target =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;
      if (target.startsWith("https://api.open-meteo.com/")) {
        if (realWeatherOnce) {
          realWeatherOnce = false;
          return originalFetch(input, init);
        }
        return originalFetch(`${url}/weather`, {
          ...init,
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      if (jwt && target.startsWith(String(extra.APPWRITE_ENDPOINT))) {
        const headers = new Headers(init?.headers);
        headers.set("X-Appwrite-JWT", jwt);
        headers.delete("Cookie");
        headers.delete("X-Fallback-Cookies");
        if (init?.method === "POST" && target.includes("/documents")) await wait(700);
        const isRatingWrite =
          ["POST", "PATCH"].includes(init?.method || "") &&
          target.includes(
            `/collections/${String(extra.APPWRITE_RATINGS_COLLECTION_ID)}/documents`,
          );
        const write = isRatingWrite
          ? {
              atMs: Date.now(),
              method: init?.method || "POST",
              status: undefined as number | undefined,
            }
          : null;
        if (write) ratingWriteTrace.push(write);
        const response = await originalFetch(input, {
          ...init,
          credentials: "omit",
          headers,
        });
        if (write) write.status = response.status;
        return response;
      }
      return originalFetch(input, init);
    };
    void controller("/bootstrap")
      .then((data: Bootstrap) => {
        if (!active) return;
        jwt = data.user.jwt;
        setUser({
          $id: data.user.id,
          accountID: data.user.id,
          email: "3ld@example.invalid",
          username: "SIT 3LD",
        });
        setIsLogged(true);
        setBoot(data);
      })
      .catch((e) => setError(String(e)));
    const renewal = setInterval(
      () => {
        void controller("/bootstrap")
          .then((data: Bootstrap) => {
            jwt = data.user.jwt;
          })
          .catch((e) => setError(String(e)));
      },
      10 * 60 * 1000,
    );
    return () => {
      active = false;
      clearInterval(renewal);
      globalThis.fetch = originalFetch;
    };
  }, [setIsLogged, setUser]);
  return { boot, error };
}
