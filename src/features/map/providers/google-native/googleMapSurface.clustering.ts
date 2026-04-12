import { Platform } from "react-native";
import type { MarkerData, MapCoordinate } from "../../core";

export const CLUSTER_MARKER_IMAGE_PREFIX = "__cluster__:";
const CLUSTER_CELL_SIZE = 104;
const CLUSTER_BREAKPOINT_ZOOM = Platform.select({
  ios: 15,
  android: 15,
  default: 15,
});

export interface ClusterMarkerRenderable {
  id: string;
  kind: "cluster";
  coordinate: MapCoordinate;
  count: number;
  imgPath: string;
}

export type BrowseMarkerRenderable = MarkerData | ClusterMarkerRenderable;

const toWorldPoint = (coordinate: MapCoordinate, zoom: number) => {
  const scale = 256 * Math.pow(2, zoom);
  const x = ((coordinate.longitude + 180) / 360) * scale;
  const sinLatitude = Math.sin((coordinate.latitude * Math.PI) / 180);
  const y =
    (0.5 - Math.log((1 + sinLatitude) / (1 - sinLatitude)) / (4 * Math.PI)) * scale;

  return { x, y };
};

const averageCoordinate = (coordinates: MapCoordinate[]): MapCoordinate => {
  const totals = coordinates.reduce(
    (accumulator, coordinate) => ({
      latitude: accumulator.latitude + coordinate.latitude,
      longitude: accumulator.longitude + coordinate.longitude,
    }),
    { latitude: 0, longitude: 0 },
  );

  return {
    latitude: totals.latitude / coordinates.length,
    longitude: totals.longitude / coordinates.length,
  };
};

const formatClusterCount = (count: number) => (count > 99 ? "99+" : String(count));

export const isClusterMarkerRenderable = (
  marker: BrowseMarkerRenderable,
): marker is ClusterMarkerRenderable => "kind" in marker && marker.kind === "cluster";

export const clusterBrowseMarkers = (
  markers: MarkerData[],
  zoom: number,
): BrowseMarkerRenderable[] => {
  if (markers.length <= 1 || zoom >= (CLUSTER_BREAKPOINT_ZOOM ?? 15)) {
    return markers;
  }

  const buckets = new Map<string, MarkerData[]>();

  markers.forEach((marker) => {
    const point = toWorldPoint(marker.coordinate, zoom);
    const bucketX = Math.floor(point.x / CLUSTER_CELL_SIZE);
    const bucketY = Math.floor(point.y / CLUSTER_CELL_SIZE);
    const key = `${bucketX}:${bucketY}`;
    const bucket = buckets.get(key) ?? [];

    bucket.push(marker);
    buckets.set(key, bucket);
  });

  const results: BrowseMarkerRenderable[] = [];

  Array.from(buckets.entries()).forEach(([key, bucket]) => {
    if (bucket.length === 1) {
      results.push(bucket[0]);
      return;
    }

    const coordinate = averageCoordinate(bucket.map((marker) => marker.coordinate));
    const countLabel = formatClusterCount(bucket.length);

    results.push({
      id: `cluster-${zoom.toFixed(1)}-${key}`,
      kind: "cluster",
      coordinate,
      count: bucket.length,
      imgPath: `${CLUSTER_MARKER_IMAGE_PREFIX}${countLabel}`,
    });
  });

  return results;
};
