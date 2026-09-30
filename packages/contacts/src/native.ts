import { Platform } from 'react-native';
import { ReactNativeMcpError } from '@react-native-mcp/core';
import NativeContacts from './NativeContacts';

export function isContactsAvailable(): boolean {
  return NativeContacts != null;
}

export function getContactsModule(): NonNullable<typeof NativeContacts> {
  if (!NativeContacts) {
    throw ReactNativeMcpError.unavailable(
      'Contacts',
      `the native Contacts TurboModule is not linked on ${Platform.OS}`,
    );
  }
  return NativeContacts;
}

export function toMobileError(error: unknown, action: string): ReactNativeMcpError {
  if (error instanceof ReactNativeMcpError) {
    return error;
  }

  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code: unknown }).code)
      : undefined;
  const fallbackMessage = `Unable to ${action}.`;
  const message =
    error instanceof Error && error.message.length > 0 ? error.message : fallbackMessage;

  switch (code) {
    case 'PERMISSION_DENIED':
      return ReactNativeMcpError.permissionDenied(message);
    case 'CANCELLED':
      return ReactNativeMcpError.cancelled(`contacts ${action}`);
    case 'UNAVAILABLE':
      return ReactNativeMcpError.unavailable('Contacts', message);
    default:
      return new ReactNativeMcpError('INTERNAL', message);
  }
}
