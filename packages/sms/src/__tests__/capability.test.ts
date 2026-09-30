jest.mock('react-native', () => ({
  Linking: { openURL: jest.fn() },
  Platform: { OS: 'android' },
}));

import { createSmsCapability } from '../capability';

describe('sms capability', () => {
  it('opens the native SMS composer with an encoded body', async () => {
    const openSmsComposer = jest.fn();
    const tool = createSmsCapability({ openSmsComposer }).tools[0]!;

    await expect(
      tool.handler({ phoneNumber: '+15551234567', body: 'Hello world' }, {}),
    ).resolves.toEqual({
      kind: 'json',
      data: { status: 'composer_opened', phoneNumber: '+15551234567' },
    });
    expect(openSmsComposer).toHaveBeenCalledWith('sms:+15551234567?body=Hello%20world');
  });

  it('returns a structured unavailable error when the composer cannot open', async () => {
    const tool = createSmsCapability({
      openSmsComposer: () => Promise.reject(new Error('no sms app')),
    }).tools[0]!;

    await expect(tool.handler({ phoneNumber: '+15551234567' }, {})).rejects.toMatchObject({
      code: 'UNAVAILABLE',
    });
  });
});
