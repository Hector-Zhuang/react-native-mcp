export { createContactsCapability, CONTACTS_CAPABILITY_VERSION } from './capability';
export { getContactsModule, isContactsAvailable } from './native';
export { default as ContactsNativeModule } from './NativeContacts';
export type {
  Contact,
  ContactPhone,
  ContactEmail,
  AddContactResult,
  ContactsPermissionResult,
  ContactsPermissionStatus,
} from './types';
