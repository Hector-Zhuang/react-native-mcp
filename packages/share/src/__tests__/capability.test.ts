jest.mock('react-native', () => {
  const share = jest.fn();
  return {
    Platform: { OS: 'ios' },
    TurboModuleRegistry: {
      get: jest.fn(() => ({ share })),
    },
    __shareMocks: { share },
  };
});

import { z } from 'zod';
import { ReactNativeMcpError } from '@react-native-mcp/core';
import { createShareCapability } from '../capability';
import { getShareModule, isShareAvailable } from '../native';

const { __shareMocks: mocks } = jest.requireMock('react-native') as {
  __shareMocks: {
    share: jest.Mock;
  };
};

describe('share capability', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mocks.share.mockResolvedValue({ status: 'shared' });
  });

  it('exposes the expected tools', () => {
    const cap = createShareCapability();
    expect(cap.name).toBe('share');
    expect(cap.tools.map((t) => t.name)).toEqual(['share_share']);
  });

  it('validates input with zod', () => {
    const tool = createShareCapability().tools[0]!;
    const shape = tool.inputShape as {
      text: z.ZodOptional<z.ZodNullable<z.ZodString>>;
      url: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    };
    expect(shape.text.safeParse('ok').success).toBe(true);
    expect(shape.text.safeParse('').success).toBe(false);
    expect(shape.url.safeParse('https://example.com').success).toBe(true);
    expect(shape.url.safeParse('not-a-url').success).toBe(false);
  });

  it('rejects an all-empty payload at the handler level', async () => {
    const tool = createShareCapability().tools[0]!;
    await expect(tool.handler({}, {})).rejects.toMatchObject({
      code: 'INVALID_PARAMS',
    });
    expect(mocks.share).not.toHaveBeenCalled();
  });

  it('shares text and a url through the native module', async () => {
    const tool = createShareCapability().tools[0]!;
    const result = await tool.handler(
      { text: 'hi', url: 'https://example.com', imageUri: null, subject: null },
      {},
    );
    expect(mocks.share).toHaveBeenCalledWith('hi', 'https://example.com', null, null);
    expect(result).toEqual({ kind: 'json', data: { status: 'shared' } });
  });

  it('covers the Android launch path through the same handler', async () => {
    const tool = createShareCapability().tools[0]!;
    mocks.share.mockResolvedValueOnce({ status: 'launched' });
    const result = await tool.handler({ imageUri: 'file:///tmp/photo.png' }, {});
    expect(mocks.share).toHaveBeenCalledWith(null, null, 'file:///tmp/photo.png', null);
    expect(result).toEqual({ kind: 'json', data: { status: 'launched' } });
  });

  it('maps native error codes to ReactNativeMcpError codes', async () => {
    const tool = createShareCapability().tools[0]!;
    mocks.share.mockRejectedValueOnce(
      Object.assign(new Error('no presenting view controller'), {
        code: 'UNAVAILABLE',
      }),
    );
    const error = await tool.handler({ text: 'hi' }, {}).catch((e) => e);
    expect(error).toBeInstanceOf(ReactNativeMcpError);
    expect(error).toMatchObject({ code: 'UNAVAILABLE' });
  });

  it('reports native availability', () => {
    expect(isShareAvailable()).toBe(true);
    expect(getShareModule()).toBeTruthy();
  });
});
