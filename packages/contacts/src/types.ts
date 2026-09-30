export interface ContactPhone {
  label: string;
  number: string;
}

export interface ContactEmail {
  label: string;
  address: string;
}

export interface Contact {
  id: string;
  givenName: string | null;
  familyName: string | null;
  displayName: string;
  phoneNumbers: ContactPhone[];
  emails: ContactEmail[];
}

export interface AddContactResult {
  id: string;
}

export type ContactsPermissionStatus = 'granted' | 'denied' | 'restricted' | 'unavailable';

export interface ContactsPermissionResult {
  granted: boolean;
  status: ContactsPermissionStatus;
}
