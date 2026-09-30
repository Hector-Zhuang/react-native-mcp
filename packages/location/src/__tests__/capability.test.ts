jest.mock('react-native', () => {
  const requestPermission = jest.fn();
  const getCurrentPosition = jest.fn();
  return {
    Platform: { OS: 'ios' },
    TurboModuleRegistry: {
      get: jest.fn(() => ({ requestPermission, getCurrentPosition })),
    },
    __locationMocks: { requestPermission, getCurrentPosition },
  };
});

import { z } from 'zod';
import { ReactNativeMcpError } from '@react-native-mcp/core';
import { createLocationCapability } from '../capability';
import { getLocationModule, isLocationAvailable } from '../native';

const { __locationMocks: mocks } = jest.requireMock('react-native') as {
  __locationMocks: {
    requestPermission: jest.Mock;
    getCurrentPosition: jest.Mock;
  };
};

const position = {
  latitude: 37.7749,
  longitude: -122.4194,
  accuracy: 12.5,
  altitude: 10,
  altitudeAccuracy: 3.2,
  heading: -1,
  speed: -1,
  timestamp: 1750000000000,
};

const granted = { granted: true, status: 'granted' as const };

describe('location capability', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mocks.requestPermission.mockResolvedValue(granted);
    mocks.getCurrentPosition.mockResolvedValue(position);
  });

  it('exposes the expected tools', () => {
    const cap = createLocationCapability();
    expect(cap.name).toBe('location');
    expect(cap.tools.map((t) => t.name)).toEqual(['location_get_current']);
  });

  it('applies zod defaults for accuracy and timeout', () => {
    const tool = createLocationCapability().tools[0]!;
    const parsed = z.object(tool.inputShape).parse({});
    expect(parsed).toEqual({ accuracy: 'balanced', timeoutMs: 15000 });
  });

  it('accepts the accuracy enum values and rejects unknown ones', () => {
    const tool = createLocationCapability().tools[0]!;
    const shape = tool.inputShape as {
      accuracy: z.ZodDefault<z.ZodEnum<['best', 'balanced', 'low']>>;
    };
    expect(shape.accuracy.parse('best')).toBe('best');
    expect(shape.accuracy.parse('balanced')).toBe('balanced');
    expect(shape.accuracy.parse('low')).toBe('low');
    expect(shape.accuracy.parse(undefined)).toBe('balanced');
    expect(shape.accuracy.safeParse('gps').success).toBe(false);
  });

  it('rejects invalid timeout values with zod', () => {
    const tool = createLocationCapability().tools[0]!;
    const shape = tool.inputShape as { timeoutMs: z.ZodNumber };
    expect(shape.timeoutMs.safeParse(999).success).toBe(false);
    expect(shape.timeoutMs.safeParse(60001).success).toBe(false);
    expect(shape.timeoutMs.safeParse(1500.5).success).toBe(false);
    expect(shape.timeoutMs.safeParse(5000).success).toBe(true);
  });

  it('returns the current position through the native module', async () => {
    const tool = createLocationCapability().tools[0]!;
    const result = await tool.handler({ accuracy: 'balanced', timeoutMs: 15000 }, {});

    expect(mocks.requestPermission).toHaveBeenCalledTimes(1);
    expect(mocks.getCurrentPosition).toHaveBeenCalledWith('balanced', 15000);
    expect(result).toEqual({ kind: 'json', data: position });
  });

  it('throws PERMISSION_DENIED when the user denies the permission', async () => {
    mocks.requestPermission.mockResolvedValue({
      granted: false,
      status: 'denied',
    });
    const tool = createLocationCapability().tools[0]!;

    await expect(
      tool.handler({ accuracy: 'balanced', timeoutMs: 15000 }, {}),
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
    expect(mocks.getCurrentPosition).not.toHaveBeenCalled();
  });

  it('maps a native PERMISSION_DENIED from requestPermission', async () => {
    mocks.requestPermission.mockRejectedValue({
      code: 'PERMISSION_DENIED',
      message: 'Location permission was denied.',
    });
    const tool = createLocationCapability().tools[0]!;

    await expect(
      tool.handler({ accuracy: 'balanced', timeoutMs: 15000 }, {}),
    ).rejects.toBeInstanceOf(ReactNativeMcpError);
    await expect(
      tool.handler({ accuracy: 'balanced', timeoutMs: 15000 }, {}),
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });

  it('maps a native PERMISSION_DENIED from getCurrentPosition', async () => {
    mocks.getCurrentPosition.mockRejectedValue({
      code: 'PERMISSION_DENIED',
      message: 'Location permission was denied.',
    });
    const tool = createLocationCapability().tools[0]!;

    await expect(tool.handler({ accuracy: 'best', timeoutMs: 5000 }, {})).rejects.toBeInstanceOf(
      ReactNativeMcpError,
    );
    await expect(tool.handler({ accuracy: 'best', timeoutMs: 5000 }, {})).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
  });

  it('maps other native failures to INTERNAL', async () => {
    mocks.getCurrentPosition.mockRejectedValue({
      code: 'LOCATION_FAILED',
      message: 'Location request timed out.',
    });
    const tool = createLocationCapability().tools[0]!;

    await expect(tool.handler({ accuracy: 'low', timeoutMs: 5000 }, {})).rejects.toMatchObject({
      code: 'INTERNAL',
      message: 'Location request timed out.',
    });
  });

  it('reports native availability', () => {
    expect(isLocationAvailable()).toBe(true);
    expect(getLocationModule()).toBeTruthy();
  });
});
