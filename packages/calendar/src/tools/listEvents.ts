import { z } from 'zod';
import { defineMobileTool, jsonResult, ReactNativeMcpError } from '@react-native-mcp/core';
import { ensureCalendarPermission, getCalendarModule, toMobileError } from '../native';
import type { CalendarEvent } from '../types';

export const listEventsTool = defineMobileTool({
  name: 'calendar_list_events',
  description:
    'List calendar events inside a time window. Events are returned sorted by start time. When calendarIds is omitted, events from every readable calendar are returned.',
  inputShape: {
    calendarIds: z
      .array(z.string().min(1, 'calendarIds must not contain empty values'))
      .max(50, 'calendarIds must contain at most 50 entries')
      .optional()
      .describe('Optional calendar identifiers to filter by. Defaults to all calendars.'),
    startDate: z
      .number()
      .int()
      .positive()
      .describe('Start of the query window as epoch milliseconds (inclusive).'),
    endDate: z
      .number()
      .int()
      .positive()
      .describe('End of the query window as epoch milliseconds (exclusive).'),
  },
  annotations: {
    readOnlyHint: true,
  },
  permission: {
    reason: 'Read calendars and events.',
    iosUsageKeys: ['NSCalendarsUsageDescription'],
    androidPermissions: ['android.permission.READ_CALENDAR'],
  },
  handler: async (input) => {
    if (input.endDate <= input.startDate) {
      throw ReactNativeMcpError.invalidParams('endDate must be greater than startDate');
    }

    await ensureCalendarPermission(false);
    try {
      const events = (await getCalendarModule().listEvents(
        input.calendarIds ?? [],
        input.startDate,
        input.endDate,
      )) as CalendarEvent[];
      return jsonResult(events);
    } catch (error) {
      throw toMobileError('Calendar', error);
    }
  },
});
