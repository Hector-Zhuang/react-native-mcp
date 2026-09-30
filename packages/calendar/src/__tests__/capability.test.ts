jest.mock('react-native', () => {
  const requestPermission = jest.fn();
  const listCalendars = jest.fn();
  const listEvents = jest.fn();
  const createEvent = jest.fn();
  const deleteEvent = jest.fn();
  return {
    Platform: { OS: 'ios' },
    TurboModuleRegistry: {
      get: jest.fn(() => ({
        requestPermission,
        listCalendars,
        listEvents,
        createEvent,
        deleteEvent,
      })),
    },
    __calendarMocks: {
      requestPermission,
      listCalendars,
      listEvents,
      createEvent,
      deleteEvent,
    },
  };
});

import { z, type ZodRawShape } from 'zod';
import { ReactNativeMcpError } from '@react-native-mcp/core';
import { createCalendarCapability } from '../capability';
import { getCalendarModule, isCalendarAvailable } from '../native';

const { __calendarMocks: mocks } = jest.requireMock('react-native') as {
  __calendarMocks: {
    requestPermission: jest.Mock;
    listCalendars: jest.Mock;
    listEvents: jest.Mock;
    createEvent: jest.Mock;
    deleteEvent: jest.Mock;
  };
};

const sampleCalendar = {
  id: 'cal-1',
  title: 'Personal',
  isPrimary: true,
  allowsModifications: true,
  color: '#FF8800',
};

const sampleEvent = {
  id: 'evt-1',
  calendarId: 'cal-1',
  title: 'Standup',
  notes: null,
  location: null,
  startDate: 100,
  endDate: 200,
  allDay: false,
};

describe('calendar capability', () => {
  const tools = () => createCalendarCapability().tools;

  beforeEach(() => {
    jest.clearAllMocks();
    mocks.requestPermission.mockResolvedValue({ granted: true, status: 'granted' });
    mocks.listCalendars.mockResolvedValue([sampleCalendar]);
    mocks.listEvents.mockResolvedValue([sampleEvent]);
    mocks.createEvent.mockResolvedValue({ id: 'evt-9' });
    mocks.deleteEvent.mockResolvedValue({ deleted: true });
  });

  it('exposes the expected tools in registration order', () => {
    const cap = createCalendarCapability();
    expect(cap.name).toBe('calendar');
    expect(cap.version).toBe('0.1.0');
    expect(cap.tools.map((t) => t.name)).toEqual([
      'calendar_list_calendars',
      'calendar_list_events',
      'calendar_create_event',
      'calendar_delete_event',
    ]);
  });

  it('declares the expected annotations and permissions', () => {
    const [listCalendars, listEvents, createEvent, deleteEvent] = tools();
    expect(listCalendars!.annotations).toEqual({
      readOnlyHint: true,
      idempotentHint: true,
    });
    expect(listEvents!.annotations).toEqual({ readOnlyHint: true });
    expect(createEvent!.annotations).toBeUndefined();
    expect(deleteEvent!.annotations).toEqual({
      destructiveHint: true,
      idempotentHint: true,
    });

    expect(listCalendars!.permission?.androidPermissions).toEqual([
      'android.permission.READ_CALENDAR',
    ]);
    expect(createEvent!.permission?.androidPermissions).toEqual([
      'android.permission.WRITE_CALENDAR',
      'android.permission.READ_CALENDAR',
    ]);
    expect(createEvent!.permission?.iosUsageKeys).toEqual([
      'NSCalendarsUsageDescription',
      'NSCalendarsWriteOnlyUserUsageDescription',
    ]);
  });

  it('validates input with zod and applies the allDay default', () => {
    const createShape = z.object(tools()[2]!.inputShape as ZodRawShape);
    const parsed = createShape.safeParse({
      title: 'Meeting',
      startDate: 1,
      endDate: 2,
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.allDay).toBe(false);
    }
    expect(createShape.safeParse({ startDate: 1, endDate: 2 }).success).toBe(false);
    expect(
      createShape.safeParse({
        title: 'x'.repeat(201),
        startDate: 1,
        endDate: 2,
      }).success,
    ).toBe(false);

    const listShape = z.object(tools()[1]!.inputShape as ZodRawShape);
    expect(listShape.safeParse({ startDate: 1, endDate: 2 }).success).toBe(true);
    expect(
      listShape.safeParse({
        calendarIds: ['a', ''],
        startDate: 1,
        endDate: 2,
      }).success,
    ).toBe(false);
  });

  it('lists calendars through the native module', async () => {
    const tool = tools()[0]!;
    const result = await tool.handler({}, {});
    expect(mocks.requestPermission).toHaveBeenCalledWith(false);
    expect(mocks.listCalendars).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ kind: 'json', data: [sampleCalendar] });
  });

  it('lists events through the native module', async () => {
    const tool = tools()[1]!;
    const result = await tool.handler({ calendarIds: ['cal-1'], startDate: 100, endDate: 200 }, {});
    expect(mocks.requestPermission).toHaveBeenCalledWith(false);
    expect(mocks.listEvents).toHaveBeenCalledWith(['cal-1'], 100, 200);
    expect(result).toEqual({ kind: 'json', data: [sampleEvent] });
  });

  it('lists events from all calendars when calendarIds is omitted', async () => {
    const tool = tools()[1]!;
    await tool.handler({ startDate: 100, endDate: 200 }, {});
    expect(mocks.listEvents).toHaveBeenCalledWith([], 100, 200);
  });

  it('creates an event through the native module', async () => {
    const tool = tools()[2]!;
    const result = await tool.handler(
      { title: 'Standup', startDate: 100, endDate: 200, allDay: false },
      {},
    );
    expect(mocks.requestPermission).toHaveBeenCalledWith(true);
    expect(mocks.createEvent).toHaveBeenCalledWith(null, 'Standup', null, null, 100, 200, false);
    expect(result).toEqual({ kind: 'json', data: { id: 'evt-9' } });
  });

  it('deletes an event through the native module', async () => {
    const tool = tools()[3]!;
    const result = await tool.handler({ eventId: 'evt-1' }, {});
    expect(mocks.requestPermission).toHaveBeenCalledWith(true);
    expect(mocks.deleteEvent).toHaveBeenCalledWith('evt-1');
    expect(result).toEqual({ kind: 'json', data: { deleted: true } });
  });

  it('throws permission denied when access is not granted', async () => {
    mocks.requestPermission.mockResolvedValueOnce({
      granted: false,
      status: 'denied',
    });
    await expect(tools()[0]!.handler({}, {})).rejects.toMatchObject({
      name: 'ReactNativeMcpError',
      code: 'PERMISSION_DENIED',
    });
    expect(mocks.listCalendars).not.toHaveBeenCalled();
  });

  it('treats write-only authorization as denied for read tools', async () => {
    mocks.requestPermission.mockResolvedValueOnce({
      granted: false,
      status: 'writeOnly',
    });
    await expect(tools()[1]!.handler({ startDate: 1, endDate: 2 }, {})).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
    expect(mocks.requestPermission).toHaveBeenCalledWith(false);
    expect(mocks.listEvents).not.toHaveBeenCalled();
  });

  it('rejects an inverted listEvents window without calling native code', async () => {
    await expect(tools()[1]!.handler({ startDate: 200, endDate: 100 }, {})).rejects.toMatchObject({
      code: 'INVALID_PARAMS',
    });
    expect(mocks.requestPermission).not.toHaveBeenCalled();
    expect(mocks.listEvents).not.toHaveBeenCalled();
  });

  it('rejects an inverted createEvent window without calling native code', async () => {
    await expect(
      tools()[2]!.handler(
        {
          title: 'Bad',
          startDate: 200,
          endDate: 100,
          allDay: false,
        },
        {},
      ),
    ).rejects.toBeInstanceOf(ReactNativeMcpError);
    expect(mocks.requestPermission).not.toHaveBeenCalled();
    expect(mocks.createEvent).not.toHaveBeenCalled();
  });

  it('maps native error codes to ReactNativeMcpError codes', async () => {
    mocks.listCalendars.mockRejectedValueOnce(
      Object.assign(new Error('not allowed'), { code: 'PERMISSION_DENIED' }),
    );
    await expect(tools()[0]!.handler({}, {})).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });

    mocks.listEvents.mockRejectedValueOnce(new Error('boom'));
    await expect(tools()[1]!.handler({ startDate: 1, endDate: 2 }, {})).rejects.toMatchObject({
      code: 'INTERNAL',
      message: 'boom',
    });

    mocks.deleteEvent.mockRejectedValueOnce(
      Object.assign(new Error('cancelled'), { code: 'CANCELLED' }),
    );
    await expect(tools()[3]!.handler({ eventId: 'evt-1' }, {})).rejects.toMatchObject({
      code: 'CANCELLED',
    });
  });

  it('reports native availability', () => {
    expect(isCalendarAvailable()).toBe(true);
    expect(getCalendarModule()).toBeTruthy();
  });
});
