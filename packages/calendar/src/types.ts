export interface CalendarInfo {
  id: string;
  title: string;
  isPrimary: boolean;
  allowsModifications: boolean;

  color: string | null;
}

export interface CalendarEvent {
  id: string;
  calendarId: string;
  title: string | null;
  notes: string | null;
  location: string | null;

  startDate: number;

  endDate: number;
  allDay: boolean;
}

export interface EventMutationResult {
  id: string;
}

export interface EventDeletionResult {
  deleted: boolean;
}

export type CalendarPermissionStatus =
  'granted' | 'writeOnly' | 'denied' | 'restricted' | 'unavailable';

export interface CalendarPermissionResult {
  granted: boolean;
  status: CalendarPermissionStatus;
}
