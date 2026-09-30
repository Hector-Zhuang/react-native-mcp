import { Platform } from 'react-native';
import { ReactNativeMcpError } from '@react-native-mcp/core';
import NativeShare from './NativeShare';

export function isShareAvailable(): boolean {
  return NativeShare != null;
}

export function getShareModule(): NonNullable<typeof NativeShare> {
  if (!NativeShare) {
    throw ReactNativeMcpError.unavailable(
      'Share',
      `the native Share TurboModule is not linked on ${Platform.OS}`,
    );
  }
  return NativeShare;
}

export function toMobileError(feature: string, error: unknown): ReactNativeMcpError {
  if (error instanceof ReactNativeMcpError) {
    return error;
  }
  const code = (error as { code?: unknown } | null | undefined)?.code;
  const message =
    error instanceof Error && error.message
      ? error.message
      : `${feature} failed with an unknown error.`;
  if (code === 'PERMISSION_DENIED') {
    return ReactNativeMcpError.permissionDenied(`${feature}: ${message}`);
  }
  if (code === 'CANCELLED') {
    return ReactNativeMcpError.cancelled(feature);
  }
  if (code === 'UNAVAILABLE') {
    return ReactNativeMcpError.unavailable(feature, message);
  }
  return new ReactNativeMcpError('INTERNAL', message);
}
