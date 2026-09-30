import { TurboModuleRegistry, type TurboModule } from 'react-native';

export interface Spec extends TurboModule {
  requestPermission(writeAccess: boolean): Promise<Object>;

  findContacts(query: string | null, limit: number, offset: number): Promise<Object[]>;

  addContact(
    givenName: string | null,
    familyName: string | null,
    organization: string | null,
    phoneNumbers: Object[],
    emails: Object[],
  ): Promise<Object>;
}

export default TurboModuleRegistry.get<Spec>('Contacts');
