import { z } from 'zod';
import { defineMobileTool, jsonResult } from '@react-native-mcp/core';
import { ensureCalendarPermission, getCalendarModule, toMobileError } from '../native';
import type { EventDeletionResult } from '../types';

export const deleteEventTool = defineMobileTool({
  name: 'calendar_delete_event',
  description:
    'Permanently delete a calendar event by its identifier. Returns { "deleted": false } when no event with the identifier exists.',
  inputShape: {
    eventId: z.string().min(1, 'eventId must not be empty'),
  },
  annotations: {
    destructiveHint: true,
    idempotentHint: true,
  },
  permission: {
    reason: 'Create or delete calendar events.',
    iosUsageKeys: ['NSCalendarsUsageDescription', 'NSCalendarsWriteOnlyUserUsageDescription'],
    androidPermissions: ['android.permission.WRITE_CALENDAR', 'android.permission.READ_CALENDAR'],
  },
  handler: async (input) => {
    await ensureCalendarPermission(true);
    try {
      const result = (await getCalendarModule().deleteEvent(input.eventId)) as EventDeletionResult;
      return jsonResult(result);
    } catch (error) {
      throw toMobileError('Calendar', error);
    }
  },
});
