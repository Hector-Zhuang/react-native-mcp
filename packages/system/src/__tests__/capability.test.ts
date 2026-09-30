jest.mock('react-native', () => ({
  Dimensions: { get: () => ({ width: 320, height: 640, scale: 2, fontScale: 1 }) },
  Linking: { openURL: jest.fn() },
  Platform: {
    OS: 'ios',
    Version: '19.0',
    constants: {},
  },
}));
jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn().mockResolvedValue({ type: 'wifi', isConnected: true }),
}));
jest.mock('react-native-device-info', () => ({
  getSystemVersion: () => '19.0',
  getSystemName: () => 'iOS',
  getModel: () => 'Test Device',
  getBrand: () => 'Test',
  getDeviceId: () => 'test-device',
  getApplicationName: () => 'Test App',
  getVersion: () => '1.0.0',
  getBuildNumber: () => '1',
  getBundleId: () => 'com.example.test',
}));
jest.mock(
  'react-native-system-setting',
  () => ({
    getBrightness: jest.fn().mockResolvedValue(0.5),
    setBrightnessForce: jest.fn().mockResolvedValue(true),
  }),
  { virtual: true },
);

import { createSystemCapability } from '../index';

function getTool(name: string) {
  const tool = createSystemCapability({
    getSystemInfo: () => ({ platform: 'ios', version: '19.0' }),
    getAppBaseInfo: () => ({ platform: 'ios', appVersion: '1.2.3' }),
    getNetworkInfo: () => ({ type: 'wifi', isConnected: true }),
    getScreenBrightness: () => 0.4,
    setScreenBrightness: (value) => {
      expect(value).toBe(0.8);
    },
    openUrl: (url) => {
      expect(url).toBe('tel:+15551234567');
    },
  }).tools.find((candidate) => candidate.name === name);

  if (!tool) throw new Error(`Missing tool: ${name}`);
  return tool;
}

describe('system capability', () => {
  it('uses adapters for system information', async () => {
    await expect(getTool('system_get_info').handler({}, {})).resolves.toEqual({
      kind: 'json',
      data: { platform: 'ios', version: '19.0' },
    });
  });

  it('reads network and screen brightness', async () => {
    await expect(getTool('system_get_network_type').handler({}, {})).resolves.toEqual({
      kind: 'json',
      data: { type: 'wifi', isConnected: true },
    });
    await expect(getTool('system_get_screen_brightness').handler({}, {})).resolves.toEqual({
      kind: 'json',
      data: { value: 0.4 },
    });
  });

  it('sets brightness and opens the phone dialer', async () => {
    await expect(
      getTool('system_set_screen_brightness').handler({ value: 0.8 }, {}),
    ).resolves.toEqual({ kind: 'text', text: 'Screen brightness updated.' });
    await expect(
      getTool('system_make_phone_call').handler({ phoneNumber: '+15551234567' }, {}),
    ).resolves.toEqual({ kind: 'text', text: 'Phone dialer opened.' });
  });

  it('uses the built-in network adapter when no override is provided', async () => {
    const tool = createSystemCapability().tools.find(
      (candidate) => candidate.name === 'system_get_network_type',
    );
    await expect(tool?.handler({}, {})).resolves.toEqual({
      kind: 'json',
      data: { type: 'wifi', isConnected: true, isInternetReachable: undefined },
    });
  });
});
