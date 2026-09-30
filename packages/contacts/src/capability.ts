import type { ReactNativeMcpCapability } from '@react-native-mcp/core';
import { findContactsTool } from './tools/findContacts';
import { addContactTool } from './tools/addContact';

export const CONTACTS_CAPABILITY_VERSION = '0.1.0';

export function createContactsCapability(): ReactNativeMcpCapability {
  return {
    name: 'contacts',
    version: CONTACTS_CAPABILITY_VERSION,
    tools: [findContactsTool, addContactTool],
  };
}
