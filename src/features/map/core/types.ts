export type MapCoordinate = {
  latitude: number;
  longitude: number;
};

export type MapCameraSnapshot = {
  target: MapCoordinate;
  zoom?: number;
  bearing?: number;
  tilt?: number;
};

export interface MapInteractionController {
  captureBrowseCamera: () => Promise<MapCameraSnapshot | null>;
  focusCoordinate: (coordinate: MapCoordinate) => void;
  restoreBrowseCamera: (camera: MapCameraSnapshot) => void;
  centerOnCoordinate: (coordinate: MapCoordinate) => void;
  centerOnUserLocation: () => Promise<boolean>;
}

export type MarkerData = {
  id: string;
  coordinate: MapCoordinate;
  title: string;
  description: string;
  location: string;
  status: "pending_approval" | "approved" | "rejected";
  authorId: string;
  createdAt: string;
  photoUrl?: string | null;
  photoUrls?: string[];
};

export type MarkerDraftFields = {
  name: string;
  info: string;
};

export type MapSessionState = {
  selectedMarker: MarkerData | null;
  browseCamera: MapCameraSnapshot | null;
  draftMarker: MapCoordinate | null;
  markerDraftFields: MarkerDraftFields;
  isMarkerInputVisible: boolean;
  navigationDestination: MarkerData | null;
};

export type MapSessionAction =
  | { type: "captureBrowseCamera"; payload: MapCameraSnapshot }
  | { type: "selectMarker"; payload: MarkerData }
  | { type: "dismissTransientUi" }
  | { type: "setDraftMarker"; payload: MapCoordinate }
  | { type: "setMarkerInputVisible"; payload: boolean }
  | { type: "setMarkerDraftName"; payload: string }
  | { type: "setMarkerDraftInfo"; payload: string }
  | { type: "startNavigation"; payload: MarkerData }
  | { type: "stopNavigation" };
