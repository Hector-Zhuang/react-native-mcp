import { z } from 'zod';
import { defineMobileTool, jsonResult, ReactNativeMcpError } from '@react-native-mcp/core';
import { ensureCalendarPermission, getCalendarModule, toMobileError } from '../native';
import type { EventMutationResult } from '../types';

export const createEventTool = defineMobileTool({
  name: 'calendar_create_event',
  description:
    'Create a new calendar event. When calendarId is omitted, the device default writable calendar is used. Returns the identifier of the created event.',
  inputShape: {
    calendarId: z
      .string()
      .min(1, 'calendarId must not be empty')
      .nullable()
      .optional()
      .describe('Identifier of the calendar to write to. Defaults to the primary calendar.'),
    title: z
      .string()
      .min(1, 'title must not be empty')
      .max(200, 'title must be at most 200 characters')
      .describe('Title of the event.'),
    notes: z
      .string()
      .max(4000, 'notes must be at most 4000 characters')
      .nullable()
      .optional()
      .describe('Optional notes or description for the event.'),
    location: z
      .string()
      .max(300, 'location must be at most 300 characters')
      .nullable()
      .optional()
      .describe('Optional location for the event.'),
    startDate: z.number().int().positive().describe('Event start as epoch milliseconds.'),
    endDate: z.number().int().positive().describe('Event end as epoch milliseconds.'),
    allDay: z.boolean().default(false).describe('Whether the event is an all-day event.'),
  },
  permission: {
    reason: 'Create or delete calendar events.',
    iosUsageKeys: ['NSCalendarsUsageDescription', 'NSCalendarsWriteOnlyUserUsageDescription'],
    androidPermissions: ['android.permission.WRITE_CALENDAR', 'android.permission.READ_CALENDAR'],
  },
  handler: async (input) => {
    if (input.endDate <= input.startDate) {
      throw ReactNativeMcpError.invalidParams('endDate must be greater than startDate');
    }

    await ensureCalendarPermission(true);
    try {
      const result = (await getCalendarModule().createEvent(
        input.calendarId ?? null,
        input.title,
        input.notes ?? null,
        input.location ?? null,
        input.startDate,
        input.endDate,
        input.allDay,
      )) as EventMutationResult;
      return jsonResult(result);
    } catch (error) {
      throw toMobileError('Calendar', error);
    }
  },
});
