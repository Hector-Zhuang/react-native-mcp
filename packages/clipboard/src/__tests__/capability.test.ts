jest.mock('@react-native-clipboard/clipboard', () => {
  const getString = jest.fn();
  const setString = jest.fn();
  return { getString, setString, __clipboardMocks: { getString, setString } };
});

import { z } from 'zod';
import { createClipboardCapability } from '../capability';
import { getClipboardModule, isClipboardAvailable } from '../native';

const { __clipboardMocks: mocks } = jest.requireMock('@react-native-clipboard/clipboard') as {
  __clipboardMocks: {
    getString: jest.Mock;
    setString: jest.Mock;
  };
};

describe('clipboard capability', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mocks.getString.mockResolvedValue('hello');
    mocks.setString.mockResolvedValue(true);
  });

  it('exposes the expected tools', () => {
    const cap = createClipboardCapability();
    expect(cap.name).toBe('clipboard');
    expect(cap.tools.map((t) => t.name)).toEqual(['clipboard_read_text', 'clipboard_write_text']);
  });

  it('validates write input with zod', () => {
    const tool = createClipboardCapability().tools[1]!;
    const shape = tool.inputShape as { text: z.ZodString };
    expect(shape.text.safeParse('ok').success).toBe(true);
    expect(shape.text.safeParse('').success).toBe(false);
  });

  it('reads text through the native module', async () => {
    const tool = createClipboardCapability().tools[0]!;
    const result = await tool.handler({}, {});
    expect(mocks.getString).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ kind: 'text', text: 'hello' });
  });

  it('writes text through the native module', async () => {
    const tool = createClipboardCapability().tools[1]!;
    const result = await tool.handler({ text: 'hi' }, {});
    expect(mocks.setString).toHaveBeenCalledWith('hi');
    expect(result).toEqual({ kind: 'empty' });
  });

  it('reports native availability', () => {
    expect(isClipboardAvailable()).toBe(true);
    expect(getClipboardModule()).toBeTruthy();
  });
});
