export { createCalendarCapability, CALENDAR_CAPABILITY_VERSION } from './capability';
export { getCalendarModule, isCalendarAvailable } from './native';
export { default as CalendarNativeModule } from './NativeCalendar';
export type {
  CalendarInfo,
  CalendarEvent,
  EventMutationResult,
  EventDeletionResult,
  CalendarPermissionResult,
  CalendarPermissionStatus,
} from './types';
