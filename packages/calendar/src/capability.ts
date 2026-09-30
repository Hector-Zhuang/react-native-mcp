import type { ReactNativeMcpCapability } from '@react-native-mcp/core';
import { listCalendarsTool } from './tools/listCalendars';
import { listEventsTool } from './tools/listEvents';
import { createEventTool } from './tools/createEvent';
import { deleteEventTool } from './tools/deleteEvent';

export const CALENDAR_CAPABILITY_VERSION = '0.1.0';

export function createCalendarCapability(): ReactNativeMcpCapability {
  return {
    name: 'calendar',
    version: CALENDAR_CAPABILITY_VERSION,
    tools: [listCalendarsTool, listEventsTool, createEventTool, deleteEventTool],
  };
}
