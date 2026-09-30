import { Platform } from 'react-native';
import { ReactNativeMcpError, type MobileErrorCode } from '@react-native-mcp/core';
import NativeLocation from './NativeLocation';

export function isLocationAvailable(): boolean {
  return NativeLocation != null;
}

export function getLocationModule(): NonNullable<typeof NativeLocation> {
  if (!NativeLocation) {
    throw ReactNativeMcpError.unavailable(
      'Location',
      `the native Location TurboModule is not linked on ${Platform.OS}`,
    );
  }
  return NativeLocation;
}

const NATIVE_ERROR_CODES = new Set<MobileErrorCode>([
  'PERMISSION_DENIED',
  'CANCELLED',
  'UNAVAILABLE',
]);

function readStringField(error: unknown, field: string): string | undefined {
  if (typeof error !== 'object' || error === null) {
    return undefined;
  }
  const record = error as Record<string, unknown>;
  const value = record[field];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

export function toMobileError(feature: string, error: unknown): ReactNativeMcpError {
  if (error instanceof ReactNativeMcpError) {
    return error;
  }

  const rawCode = readStringField(error, 'code');
  const code =
    rawCode !== undefined && NATIVE_ERROR_CODES.has(rawCode as MobileErrorCode)
      ? (rawCode as MobileErrorCode)
      : undefined;
  const message = readStringField(error, 'message') ?? `${feature} operation failed.`;

  switch (code) {
    case 'PERMISSION_DENIED':
      return ReactNativeMcpError.permissionDenied(message);
    case 'CANCELLED':
      return ReactNativeMcpError.cancelled(feature);
    case 'UNAVAILABLE':
      return ReactNativeMcpError.unavailable(feature, message);
    default:
      return new ReactNativeMcpError(
        'INTERNAL',
        message,
        'Retry the operation; if the problem persists, check location settings and device logs.',
      );
  }
}
