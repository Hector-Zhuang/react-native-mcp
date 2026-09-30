import { z } from 'zod';
import { defineMobileTool, jsonResult, ReactNativeMcpError } from '@react-native-mcp/core';
import { getContactsModule, toMobileError } from '../native';
import type { AddContactResult, ContactsPermissionResult } from '../types';

const phoneNumberShape = z.object({
  label: z.string().max(50).optional(),
  number: z.string().min(1).max(50),
});

const emailShape = z.object({
  label: z.string().max(50).optional(),
  address: z.string().email().max(200),
});

export const addContactTool = defineMobileTool({
  name: 'contacts_add',
  description:
    'Create a new contact in the device address book. At least a name part, organization, one phone number or one email is required. Requires write permission.',
  inputShape: {
    givenName: z.string().min(1).max(100).nullable().optional(),
    familyName: z.string().min(1).max(100).nullable().optional(),
    organization: z.string().max(100).nullable().optional(),
    phoneNumbers: z.array(phoneNumberShape).max(10).default([]),
    emails: z.array(emailShape).max(10).default([]),
  },
  permission: {
    reason: 'Write to the address book to create a contact.',
    iosUsageKeys: ['NSContactsUsageDescription'],
    androidPermissions: ['android.permission.WRITE_CONTACTS', 'android.permission.READ_CONTACTS'],
  },
  handler: async (input) => {
    const givenName = input.givenName ?? null;
    const familyName = input.familyName ?? null;
    const organization = input.organization ?? null;
    const phoneNumbers = input.phoneNumbers;
    const emails = input.emails;

    const hasName = givenName !== null || familyName !== null;
    const hasOrganization = organization !== null && organization.trim().length > 0;
    const hasPhone = phoneNumbers.length > 0;
    const hasEmail = emails.length > 0;

    if (!hasName && !hasOrganization && !hasPhone && !hasEmail) {
      throw ReactNativeMcpError.invalidParams(
        'At least one of givenName, familyName, organization, phoneNumbers or emails is required.',
      );
    }

    try {
      const permission = (await getContactsModule().requestPermission(
        true,
      )) as ContactsPermissionResult;
      if (!permission.granted) {
        throw ReactNativeMcpError.permissionDenied('Contacts write permission was not granted.');
      }

      const result = (await getContactsModule().addContact(
        givenName,
        familyName,
        organization,
        phoneNumbers,
        emails,
      )) as AddContactResult;

      return jsonResult({ id: result.id });
    } catch (error) {
      throw toMobileError(error, 'add contact');
    }
  },
});
