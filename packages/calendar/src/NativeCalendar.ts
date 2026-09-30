import { TurboModuleRegistry, type TurboModule } from 'react-native';

export interface Spec extends TurboModule {
  requestPermission(writeAccess: boolean): Promise<Object>;

  listCalendars(): Promise<Object[]>;

  listEvents(calendarIds: string[], startDate: number, endDate: number): Promise<Object[]>;

  createEvent(
    calendarId: string | null,
    title: string,
    notes: string | null,
    location: string | null,
    startDate: number,
    endDate: number,
    allDay: boolean,
  ): Promise<Object>;

  deleteEvent(eventId: string): Promise<Object>;
}

export default TurboModuleRegistry.get<Spec>('Calendar');
