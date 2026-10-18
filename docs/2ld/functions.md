# Pasirinktos funkcijos

Automatiškai generuojama `npm run quality:metrics`. SIT sąsajos yra siūlomos pagal domeną, ne patvirtinta Jira istorija. CC: ESLint classic; Cognitive: SonarJS. Įdėtiniai callback turi atskiras ESLint metrikas; testavimo/mutacijų intervalas apima visą išorinę funkciją.

## Nojus: SIT-42 — retryTransientNativeCommand

Failas: `src/features/map/providers/google-native/googleMapSurface.utils.ts:83`; intervalas 83–105; CC **7**, Cognitive **6**.

Konstrukcijų eilutės: 91 (ForStatement), 94 (CatchClause), 96 (IfStatement).

```typescript
async <T>(
  command: () => Promise<T>,
  shouldRetry: (error: unknown) => boolean,
  attempts = NAVIGATION_VIEW_RETRY_ATTEMPTS,
  retryDelayMs = NAVIGATION_VIEW_RETRY_DELAY_MS,
) => {
  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await command();
    } catch (error) {
      lastError = error;
      if (!shouldRetry(error) || attempt === attempts - 1) {
        throw error;
      }

      await delay(retryDelayMs);
    }
  }

  throw lastError;
};
```

## Nojus: SIT-48 — syncLocationPermissionAndPosition

Failas: `src/features/map/hooks/useUserLocation.ts:12`; intervalas 12–50; CC **10**, Cognitive **11**.

Konstrukcijų eilutės: 14 (IfStatement), 18 (ConditionalExpression), 23 (IfStatement), 34 (CatchClause), 35 (IfStatement), 41 (CatchClause), 42 (IfStatement), 46 (IfStatement).

```typescript
async (options = { requestPermission: false }) => {
  try {
    if (options.requestPermission) {
      setPermissionState("loading");
    }

    const permissionResult = options.requestPermission
      ? await Location.requestForegroundPermissionsAsync()
      : await Location.getForegroundPermissionsAsync();
    const isGranted = String(permissionResult.status) === "granted";

    if (!isGranted) {
      setPermissionState("denied");
      setLocation(null);
      return;
    }

    setPermissionState("granted");

    try {
      const currentLocation = await Location.getCurrentPositionAsync({});
      setLocation(currentLocation);
    } catch (error) {
      if (__DEV__) {
        console.warn("Failed to fetch current location.", error);
      }

      setLocation(null);
    }
  } catch (error) {
    if (__DEV__) {
      console.warn("Failed to synchronize location permission.", error);
    }

    if (options.requestPermission) {
      setPermissionState("denied");
    }
  }
};
```

## Ugnius: SIT-40 — fetchOpenMeteoWeatherSnapshot

Failas: `src/services/weather/openMeteo.ts:246`; intervalas 246–271; CC **4**, Cognitive **4**.

Konstrukcijų eilutės: 252 (IfStatement), 264 (CatchClause), 265 (IfStatement).

```typescript
async (input: FetchWeatherSnapshotInput): Promise<MarkerWeatherSnapshot> => {
  try {
    const response = await fetchWithTimeout(buildOpenMeteoForecastUrl(input));

    if (!response.ok) {
      throw new WeatherProviderError(
        "Weather forecast is temporarily unavailable.",
        response.status,
      );
    }

    const data = (await response.json()) as OpenMeteoForecastResponse;
    return normalizeOpenMeteoWeather(data, {
      sourceLocationLabel: input.sourceLocationLabel,
      upcomingHours: input.upcomingHours,
    });
  } catch (error) {
    if (error instanceof WeatherProviderError) {
      throw error;
    }

    throw new WeatherProviderError("Weather forecast is temporarily unavailable.");
  }
};
```

## Ugnius: SIT-97 — getWeatherChangeMessage

Failas: `src/features/weather/utils/weatherChanges.ts:13`; intervalas 13–58; CC **15**, Cognitive **10**.

Konstrukcijų eilutės: 19 (IfStatement), 25 (ConditionalExpression), 33 (ConditionalExpression), 37 (IfStatement), 45 (IfStatement), 51 (IfStatement).

```typescript
(snapshot: MarkerWeatherSnapshot | null): string | null => {
  const current = snapshot?.current;
  const nextHour = snapshot?.upcoming[0];

  if (!current || !nextHour) {
    return null;
  }

  const rainProbability = nextHour.precipitationProbabilityPct;
  const temperatureDelta =
    current.temperatureC === null || nextHour.temperatureC === null
      ? null
      : Math.abs(nextHour.temperatureC - current.temperatureC);
  const hasRainChange =
    rainProbability !== null && rainProbability > RAIN_PROBABILITY_CHANGE_THRESHOLD;
  const hasTemperatureChange =
    temperatureDelta !== null && temperatureDelta > TEMPERATURE_CHANGE_THRESHOLD_C;
  const temperatureChangeLabel =
    current.temperatureC !== null && nextHour.temperatureC !== null
      ? getTemperatureChangeLabel(current.temperatureC, nextHour.temperatureC)
      : "changes";

  if (hasRainChange && hasTemperatureChange) {
    return `Weather change expected: ${Math.round(
      rainProbability,
    )}% rain chance and temperature ${temperatureChangeLabel} by ${formatTemperatureDelta(
      temperatureDelta,
    )} in the next hour.`;
  }

  if (hasRainChange) {
    return `Weather change expected: ${Math.round(
      rainProbability,
    )}% rain chance in the next hour.`;
  }

  if (hasTemperatureChange) {
    return `Weather change expected: temperature ${temperatureChangeLabel} by ${formatTemperatureDelta(
      temperatureDelta,
    )} in the next hour.`;
  }

  return null;
};
```

## Matas: SIT-27 — submitMarkerRating

Failas: `src/services/appwrite/ratings.ts:203`; intervalas 203–284; CC **13**, Cognitive **8**.

Konstrukcijų eilutės: 219 (IfStatement), 223 (IfStatement), 233 (ConditionalExpression), 265 (CatchClause), 266 (IfStatement), 270 (IfStatement).

```typescript
export async function submitMarkerRating({
  markerId,
  userId,
  authorName = "",
  score,
  comment = "",
}: SubmitMarkerRatingInput): Promise<SubmitMarkerRatingResult> {
  ensureRatingsReady();
  ensureMarkersReady();

  const normalizedMarkerId = markerId.trim();
  const normalizedUserId = userId.trim();
  const normalizedAuthorName = normalizeOptionalAuthorName(authorName);
  const normalizedScore = normalizeRatingScore(score);
  const normalizedComment = normalizeOptionalComment(comment);

  if (!normalizedMarkerId) {
    throw new Error("Marker ID is required.");
  }

  if (!normalizedUserId) {
    throw new Error("User ID is required.");
  }

  const timestamp = new Date().toISOString();
  const existingDocument = await findExistingMarkerRatingDocument(
    normalizedMarkerId,
    normalizedUserId,
  );

  const ratingDocument = existingDocument
    ? await getDatabasesClient().updateDocument(
        getDatabaseId(),
        getRatingsCollectionId(),
        existingDocument.$id,
        {
          author_name: normalizedAuthorName || null,
          score: normalizedScore,
          comment: normalizedComment || null,
          updated_at: timestamp,
        },
      )
    : await getDatabasesClient().createDocument(
        getDatabaseId(),
        getRatingsCollectionId(),
        ID.unique(),
        {
          marker_id: normalizedMarkerId,
          user_id: normalizedUserId,
          author_name: normalizedAuthorName || null,
          score: normalizedScore,
          comment: normalizedComment || null,
          created_at: timestamp,
          updated_at: timestamp,
        },
        buildRatingDocumentPermissions(normalizedUserId),
      );

  let averageRating: number | null;

  try {
    averageRating = await updateMarkerAverageRating(normalizedMarkerId);
  } catch (error) {
    if (!isAuthorizationError(error)) {
      throw error;
    }

    if (__DEV__) {
      console.warn(
        "Marker average rating could not be persisted from the current client session. Falling back to computed rating value.",
        error,
      );
    }

    averageRating = await getMarkerAverageRating(normalizedMarkerId);
  }

  return {
    rating: mapRatingDocument(ratingDocument as AppwriteRatingDocument),
    averageRating,
  };
}
```

## Matas: SIT-93 — listMarkerRatingsPage

Failas: `src/services/appwrite/ratings.ts:165`; intervalas 165–201; CC **6**, Cognitive **1**.

Konstrukcijų eilutės: 173 (IfStatement).

```typescript
export async function listMarkerRatingsPage(
  markerId: string,
  options?: { pageSize?: number; offset?: number },
): Promise<MarkerRatingPageResult> {
  ensureRatingsReady();

  const normalizedMarkerId = markerId.trim();

  if (!normalizedMarkerId) {
    throw new Error("Marker ID is required.");
  }

  const pageSize = Math.max(1, Math.min(options?.pageSize ?? 10, 50));
  const offset = Math.max(0, options?.offset ?? 0);
  const response = await getDatabasesClient().listDocuments(
    getDatabaseId(),
    getRatingsCollectionId(),
    [
      Query.equal("marker_id", normalizedMarkerId),
      Query.orderDesc("updated_at"),
      Query.limit(pageSize),
      Query.offset(offset),
    ],
  );

  const ratings = response.documents.map((document) =>
    mapRatingDocument(document as AppwriteRatingDocument),
  );

  return {
    ratings,
    total: response.total,
    offset,
    pageSize,
    hasMore: offset + ratings.length < response.total,
  };
}
```

## Marius: SIT-104 — createMarker

Failas: `src/services/appwrite/markers.ts:240`; intervalas 240–305; CC **11**, Cognitive **8**.

Konstrukcijų eilutės: 254 (IfStatement), 258 (IfStatement), 266 (ConditionalExpression), 277 (ConditionalExpression), 282 (IfStatement), 296 (CatchClause), 297 (IfStatement).

```typescript
export async function createMarker({
  title,
  description,
  coordinate,
  authorId,
  photo = null,
  attributes = [],
}: CreateMarkerInput): Promise<MarkerRecord> {
  ensureMarkersReady();

  const normalizedTitle = title.trim();
  const normalizedDescription = description.trim();
  const normalizedAttributes = normalizeMarkerAttributesForWrite(attributes);

  if (!normalizedTitle) {
    throw new Error("Marker title is required.");
  }

  if (!normalizedDescription) {
    throw new Error("Marker description is required.");
  }

  await assertCanCreateMarker(authorId);

  const status: MarkerStatus = "pending_approval";
  const createdAt = new Date().toISOString();
  const [photoUrl = null] = photo
    ? await uploadMarkerPhotos([photo], status, authorId)
    : [];
  const createPayload: Record<string, unknown> = {
    title: normalizedTitle,
    description: normalizedDescription,
    location: formatMarkerLocation(coordinate),
    status,
    author_id: authorId,
    created_at: createdAt,
    photo_url: photoUrl,
    photo_urls: photoUrl ? [photoUrl] : [],
    latitude: coordinate.latitude,
    longitude: coordinate.longitude,
  };

  if (normalizedAttributes.length > 0) {
    createPayload.attributes = normalizedAttributes;
  }

  let document: Models.Document;

  try {
    document = await getDatabasesClient().createDocument(
      getDatabaseId(),
      getMarkersCollectionId(),
      ID.unique(),
      createPayload,
      buildMarkerDocumentPermissions(status, authorId),
    );
  } catch (error) {
    if (isMissingMarkerAttributesSchemaError(error)) {
      throw toMarkerAttributesSchemaError();
    }

    throw error;
  }

  return mapMarkerDocument(document as AppwriteMarkerDocument);
}
```

## Marius: SIT-110 — updateMarker

Failas: `src/services/appwrite/markers.ts:367`; intervalas 367–420; CC **8**, Cognitive **5**.

Konstrukcijų eilutės: 379 (IfStatement), 397 (IfStatement), 411 (CatchClause), 412 (IfStatement).

```typescript
export async function updateMarker({
  markerId,
  authorId,
  description,
  existingPhotoUrls = [],
  newPhotos = [],
  attributes,
}: UpdateMarkerInput): Promise<MarkerRecord> {
  ensureMarkersReady();

  const normalizedDescription = description.trim();

  if (!normalizedDescription) {
    throw new Error("Marker description is required.");
  }

  const status: MarkerStatus = "pending_approval";
  const uploadedPhotoUrls = await uploadMarkerPhotos(newPhotos, status, authorId);
  const mergedPhotoUrls = [...existingPhotoUrls, ...uploadedPhotoUrls].filter(
    (value, index, values): value is string =>
      typeof value === "string" && value.length > 0 && values.indexOf(value) === index,
  );
  const primaryPhotoUrl = mergedPhotoUrls[0] ?? null;
  const updatePayload: Record<string, unknown> = {
    description: normalizedDescription,
    status,
    photo_url: primaryPhotoUrl,
    photo_urls: mergedPhotoUrls,
  };

  if (attributes !== undefined) {
    updatePayload.attributes = normalizeMarkerAttributesForWrite(attributes);
  }

  let document: Models.Document;

  try {
    document = await getDatabasesClient().updateDocument(
      getDatabaseId(),
      getMarkersCollectionId(),
      markerId,
      updatePayload,
      buildMarkerDocumentPermissions(status, authorId),
    );
  } catch (error) {
    if (isMissingMarkerAttributesSchemaError(error)) {
      throw toMarkerAttributesSchemaError();
    }

    throw error;
  }

  return mapMarkerDocument(document as AppwriteMarkerDocument);
}
```

## Failų metrikos

| Failas                                                             | MI (lexical TS) | CBO (importai) | Funkcinis LCOM4 |
| ------------------------------------------------------------------ | --------------: | -------------: | --------------: |
| src/features/map/providers/google-native/googleMapSurface.utils.ts |           17.18 |              4 |               5 |
| src/features/map/hooks/useUserLocation.ts                          |           34.37 |              3 |               1 |
| src/services/weather/openMeteo.ts                                  |           11.04 |              1 |               1 |
| src/features/weather/utils/weatherChanges.ts                       |           38.46 |              1 |               1 |
| src/services/appwrite/ratings.ts                                   |           13.31 |              5 |               1 |
| src/services/appwrite/markers.ts                                   |            4.43 |              8 |               2 |
