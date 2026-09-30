import { z } from 'zod';
import { defineMobileTool, jsonResult, ReactNativeMcpError } from '@react-native-mcp/core';
import { getContactsModule, toMobileError } from '../native';
import type { Contact, ContactsPermissionResult } from '../types';

export const findContactsTool = defineMobileTool({
  name: 'contacts_find',
  description:
    'Search the device contacts by display name (case-insensitive substring); omit query to list all. Returns paginated contacts with normalized phone numbers and emails. Requires contacts permission.',
  inputShape: {
    query: z
      .string()
      .trim()
      .min(1)
      .max(100)
      .nullable()
      .optional()
      .describe(
        'Case-insensitive substring matched against the contact display name. Omit to list all contacts.',
      ),
    limit: z.number().int().min(1).max(100).default(20),
    offset: z.number().int().min(0).max(10000).default(0),
  },
  annotations: {
    readOnlyHint: true,
    idempotentHint: true,
  },
  permission: {
    reason: 'Read the address book to find contacts.',
    iosUsageKeys: ['NSContactsUsageDescription'],
    androidPermissions: ['android.permission.READ_CONTACTS'],
  },
  handler: async (input) => {
    try {
      const permission = (await getContactsModule().requestPermission(
        false,
      )) as ContactsPermissionResult;
      if (!permission.granted) {
        throw ReactNativeMcpError.permissionDenied('Contacts permission was not granted.');
      }

      const contacts = (await getContactsModule().findContacts(
        input.query ?? null,
        input.limit,
        input.offset,
      )) as Contact[];

      return jsonResult({ contacts, limit: input.limit, offset: input.offset });
    } catch (error) {
      throw toMobileError(error, 'find contacts');
    }
  },
});
