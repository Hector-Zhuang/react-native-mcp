import { Platform } from 'react-native';
import { ReactNativeMcpError } from '@react-native-mcp/core';
import NativeCalendar from './NativeCalendar';
import type { CalendarPermissionResult } from './types';

export function isCalendarAvailable(): boolean {
  return NativeCalendar != null;
}

export function getCalendarModule(): NonNullable<typeof NativeCalendar> {
  if (!NativeCalendar) {
    throw ReactNativeMcpError.unavailable(
      'Calendar',
      `the native Calendar TurboModule is not linked on ${Platform.OS}`,
    );
  }
  return NativeCalendar;
}

export function toMobileError(feature: string, error: unknown): ReactNativeMcpError {
  if (error instanceof ReactNativeMcpError) {
    return error;
  }

  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? (error as { code?: unknown }).code
      : undefined;
  const message =
    error instanceof Error && error.message.length > 0
      ? error.message
      : `${feature} operation failed.`;

  if (typeof code === 'string') {
    switch (code) {
      case 'PERMISSION_DENIED':
        return ReactNativeMcpError.permissionDenied(message);
      case 'CANCELLED':
        return ReactNativeMcpError.cancelled(feature);
      case 'UNAVAILABLE':
        return ReactNativeMcpError.unavailable(feature, message);
      default:
        break;
    }
  }

  return new ReactNativeMcpError('INTERNAL', message);
}

export async function ensureCalendarPermission(
  writeAccess: boolean,
): Promise<CalendarPermissionResult> {
  try {
    const result = (await getCalendarModule().requestPermission(
      writeAccess,
    )) as CalendarPermissionResult;
    if (!result.granted) {
      throw ReactNativeMcpError.permissionDenied(
        `Calendar permission was not granted (status: ${result.status}).`,
      );
    }
    return result;
  } catch (error) {
    throw toMobileError('Calendar', error);
  }
}
