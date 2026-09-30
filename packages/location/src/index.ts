export { createLocationCapability, LOCATION_CAPABILITY_VERSION } from './capability';
export { getLocationModule, isLocationAvailable, toMobileError } from './native';
export { default as LocationNativeModule } from './NativeLocation';
export type {
  LocationAccuracy,
  LocationPosition,
  LocationPermissionResult,
  LocationPermissionStatus,
} from './types';
