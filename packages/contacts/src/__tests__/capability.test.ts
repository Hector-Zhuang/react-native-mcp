jest.mock('react-native', () => {
  const requestPermission = jest.fn();
  const findContacts = jest.fn();
  const addContact = jest.fn();
  return {
    Platform: { OS: 'ios' },
    TurboModuleRegistry: {
      get: jest.fn(() => ({ requestPermission, findContacts, addContact })),
    },
    __contactsMocks: { requestPermission, findContacts, addContact },
  };
});

import { z } from 'zod';
import { ReactNativeMcpError } from '@react-native-mcp/core';
import { createContactsCapability } from '../capability';
import { getContactsModule, isContactsAvailable } from '../native';
import type { Contact, ContactsPermissionResult } from '../types';

const { __contactsMocks: mocks } = jest.requireMock('react-native') as {
  __contactsMocks: {
    requestPermission: jest.Mock;
    findContacts: jest.Mock;
    addContact: jest.Mock;
  };
};

const granted: ContactsPermissionResult = { granted: true, status: 'granted' };
const denied: ContactsPermissionResult = { granted: false, status: 'denied' };

const adaContact: Contact = {
  id: 'contact-1',
  givenName: 'Ada',
  familyName: 'Lovelace',
  displayName: 'Ada Lovelace',
  phoneNumbers: [{ label: 'mobile', number: '+15551234567' }],
  emails: [{ label: 'work', address: 'ada@example.com' }],
};

describe('contacts capability', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mocks.requestPermission.mockResolvedValue(granted);
    mocks.findContacts.mockResolvedValue([adaContact]);
    mocks.addContact.mockResolvedValue({ id: 'contact-42' });
  });

  it('exposes the expected tools in registration order', () => {
    const cap = createContactsCapability();
    expect(cap.name).toBe('contacts');
    expect(cap.version).toBe('0.1.0');
    expect(cap.tools.map((t) => t.name)).toEqual(['contacts_find', 'contacts_add']);
  });

  it('declares permission requirements per tool', () => {
    const [findTool, addTool] = createContactsCapability().tools;
    expect(findTool!.permission?.androidPermissions).toEqual(['android.permission.READ_CONTACTS']);
    expect(addTool!.permission?.androidPermissions).toEqual([
      'android.permission.WRITE_CONTACTS',
      'android.permission.READ_CONTACTS',
    ]);
  });

  it('validates find input with zod', () => {
    const shape = createContactsCapability().tools[0]!.inputShape as {
      query: z.ZodTypeAny;
      limit: z.ZodTypeAny;
      offset: z.ZodTypeAny;
    };

    expect(shape.query.safeParse('Ada').success).toBe(true);
    expect(shape.query.safeParse(null).success).toBe(true);
    expect(shape.query.safeParse(undefined).success).toBe(true);
    expect(shape.query.safeParse('   ').success).toBe(false);
    expect(shape.query.safeParse('a'.repeat(101)).success).toBe(false);

    expect(shape.limit.parse(undefined)).toBe(20);
    expect(shape.limit.safeParse(0).success).toBe(false);
    expect(shape.limit.safeParse(101).success).toBe(false);
    expect(shape.offset.parse(undefined)).toBe(0);
    expect(shape.offset.safeParse(-1).success).toBe(false);
  });

  it('validates add input with zod', () => {
    const shape = createContactsCapability().tools[1]!.inputShape as {
      givenName: z.ZodTypeAny;
      familyName: z.ZodTypeAny;
      organization: z.ZodTypeAny;
      phoneNumbers: z.ZodTypeAny;
      emails: z.ZodTypeAny;
    };

    expect(shape.phoneNumbers.parse(undefined)).toEqual([]);
    expect(shape.emails.parse(undefined)).toEqual([]);
    expect(shape.emails.safeParse([{ label: 'work', address: 'ada@example.com' }]).success).toBe(
      true,
    );
    expect(shape.emails.safeParse([{ address: 'not-an-email' }]).success).toBe(false);
    expect(shape.phoneNumbers.safeParse([{ number: '' }]).success).toBe(false);
    expect(shape.phoneNumbers.safeParse('x'.repeat(0)).success).toBe(false);
    expect(
      shape.phoneNumbers.safeParse(Array.from({ length: 11 }, () => ({ number: '123' }))).success,
    ).toBe(false);
  });

  it('lists contacts through the native module with default pagination', async () => {
    const tool = createContactsCapability().tools[0]!;
    const result = await tool.handler({ query: null, limit: 20, offset: 0 }, {});

    expect(mocks.requestPermission).toHaveBeenCalledTimes(1);
    expect(mocks.requestPermission).toHaveBeenCalledWith(false);
    expect(mocks.findContacts).toHaveBeenCalledWith(null, 20, 0);
    expect(result).toEqual({
      kind: 'json',
      data: { contacts: [adaContact], limit: 20, offset: 0 },
    });
  });

  it('forwards the search query and pagination window', async () => {
    const tool = createContactsCapability().tools[0]!;
    mocks.findContacts.mockResolvedValueOnce([]);

    await tool.handler({ query: 'ada', limit: 10, offset: 5 }, {});

    expect(mocks.findContacts).toHaveBeenCalledWith('ada', 10, 5);
  });

  it('fails with PERMISSION_DENIED when read access is not granted', async () => {
    mocks.requestPermission.mockResolvedValueOnce(denied);
    const tool = createContactsCapability().tools[0]!;

    await expect(tool.handler({ query: null, limit: 20, offset: 0 }, {})).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
    expect(mocks.findContacts).not.toHaveBeenCalled();
  });

  it('requires at least one identifying field before adding a contact', async () => {
    const tool = createContactsCapability().tools[1]!;

    await expect(
      tool.handler(
        {
          givenName: null,
          familyName: null,
          organization: null,
          phoneNumbers: [],
          emails: [],
        },
        {},
      ),
    ).rejects.toBeInstanceOf(ReactNativeMcpError);
    await expect(
      tool.handler(
        {
          givenName: null,
          familyName: null,
          organization: null,
          phoneNumbers: [],
          emails: [],
        },
        {},
      ),
    ).rejects.toMatchObject({ code: 'INVALID_PARAMS' });
    expect(mocks.requestPermission).not.toHaveBeenCalled();
    expect(mocks.addContact).not.toHaveBeenCalled();
  });

  it('creates a contact through the native module', async () => {
    const tool = createContactsCapability().tools[1]!;
    const phoneNumbers = [{ label: 'work', number: '+1 555 0100' }];
    const result = await tool.handler(
      {
        givenName: 'Grace',
        familyName: 'Hopper',
        organization: 'US Navy',
        phoneNumbers,
        emails: [],
      },
      {},
    );

    expect(mocks.requestPermission).toHaveBeenCalledWith(true);
    expect(mocks.addContact).toHaveBeenCalledWith('Grace', 'Hopper', 'US Navy', phoneNumbers, []);
    expect(result).toEqual({ kind: 'json', data: { id: 'contact-42' } });
  });

  it('fails with PERMISSION_DENIED when write access is not granted', async () => {
    mocks.requestPermission.mockResolvedValueOnce(denied);
    const tool = createContactsCapability().tools[1]!;

    await expect(
      tool.handler(
        {
          givenName: 'Grace',
          familyName: null,
          organization: null,
          phoneNumbers: [],
          emails: [{ address: 'grace@example.com' }],
        },
        {},
      ),
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
    expect(mocks.addContact).not.toHaveBeenCalled();
  });

  it('maps native rejection codes to ReactNativeMcpError', async () => {
    mocks.requestPermission.mockRejectedValueOnce({
      code: 'PERMISSION_DENIED',
      message: 'user denied',
    });
    const tool = createContactsCapability().tools[0]!;

    await expect(tool.handler({ query: null, limit: 20, offset: 0 }, {})).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
  });

  it('maps unknown native errors to INTERNAL', async () => {
    mocks.findContacts.mockRejectedValueOnce(new Error('boom'));
    const tool = createContactsCapability().tools[0]!;

    await expect(tool.handler({ query: null, limit: 20, offset: 0 }, {})).rejects.toMatchObject({
      code: 'INTERNAL',
      message: 'boom',
    });
  });

  it('reports native availability', () => {
    expect(isContactsAvailable()).toBe(true);
    expect(getContactsModule()).toBeTruthy();
  });
});
