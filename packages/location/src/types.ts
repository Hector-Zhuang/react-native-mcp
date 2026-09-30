export type LocationAccuracy = 'best' | 'balanced' | 'low';

export interface LocationPosition {
  latitude: number;
  longitude: number;

  accuracy: number;
  altitude: number;

  altitudeAccuracy: number;

  heading: number;

  speed: number;

  timestamp: number;
}

export type LocationPermissionStatus = 'granted' | 'denied' | 'restricted' | 'unavailable';

export interface LocationPermissionResult {
  granted: boolean;
  status: LocationPermissionStatus;
}
