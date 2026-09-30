import { defineMobileTool, jsonResult } from '@react-native-mcp/core';
import { ensureCalendarPermission, getCalendarModule, toMobileError } from '../native';
import type { CalendarInfo } from '../types';

export const listCalendarsTool = defineMobileTool({
  name: 'calendar_list_calendars',
  description:
    'List the calendars available on the device, including their identifiers, titles, colors and whether the app can modify events in each calendar.',
  inputShape: {},
  annotations: {
    readOnlyHint: true,
    idempotentHint: true,
  },
  permission: {
    reason: 'Read calendars and events.',
    iosUsageKeys: ['NSCalendarsUsageDescription'],
    androidPermissions: ['android.permission.READ_CALENDAR'],
  },
  handler: async () => {
    await ensureCalendarPermission(false);
    try {
      const calendars = (await getCalendarModule().listCalendars()) as CalendarInfo[];
      return jsonResult(calendars);
    } catch (error) {
      throw toMobileError('Calendar', error);
    }
  },
});
