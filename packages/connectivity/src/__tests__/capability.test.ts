jest.mock('react-native', () => {
  const setFlashlight = jest.fn();
  return {
    TurboModuleRegistry: {
      get: jest.fn(() => ({ setFlashlight })),
    },
    __connectivityMocks: { setFlashlight },
  };
});
jest.mock('react-native-torch', () => ({ switchState: jest.fn() }), { virtual: true });
jest.mock('react-native-wifi-reborn', () => ({ getCurrentWifiSSID: jest.fn() }));
jest.mock('react-native-ble-plx', () => ({ BleManager: jest.fn() }));

import { createConnectivityCapability } from '../index';

describe('connectivity capability', () => {
  it('controls the flashlight through the adapter', async () => {
    const setFlashlight = jest.fn();
    const capability = createConnectivityCapability({ setFlashlight });
    const tool = capability.tools.find((candidate) => candidate.name === 'flashlight_set');

    await expect(tool?.handler({ enabled: true }, {})).resolves.toEqual({
      kind: 'text',
      text: 'Flashlight turned on.',
    });
    expect(setFlashlight).toHaveBeenCalledWith(true);
  });

  it('returns WiFi information and Bluetooth state', async () => {
    const capability = createConnectivityCapability({
      getWifiInfo: () => ({ ssid: 'Office', isConnected: true }),
      getBluetoothState: () => 'poweredOn',
    });
    const wifi = capability.tools.find((candidate) => candidate.name === 'wifi_get_info');
    const bluetooth = capability.tools.find(
      (candidate) => candidate.name === 'bluetooth_get_state',
    );

    await expect(wifi?.handler({}, {})).resolves.toEqual({
      kind: 'json',
      data: { ssid: 'Office', isConnected: true },
    });
    await expect(bluetooth?.handler({}, {})).resolves.toEqual({
      kind: 'json',
      data: { state: 'poweredOn' },
    });
  });

  it('bounds Bluetooth scans and supports stopping them', async () => {
    const scanBluetooth = jest.fn(async (options) => [{ id: `device-${options.timeoutMs}` }]);
    const stopBluetoothScan = jest.fn();
    const capability = createConnectivityCapability({
      scanBluetooth,
      stopBluetoothScan,
    });
    const scan = capability.tools.find((tool) => tool.name === 'bluetooth_scan');
    const stop = capability.tools.find((tool) => tool.name === 'bluetooth_stop_scan');

    await expect(scan?.handler({ timeoutMs: 5000, serviceUUIDs: ['180D'] }, {})).resolves.toEqual({
      kind: 'json',
      data: [{ id: 'device-5000' }],
    });
    await stop?.handler({}, {});
    expect(scanBluetooth).toHaveBeenCalledWith({
      timeoutMs: 5000,
      serviceUUIDs: ['180D'],
    });
    expect(stopBluetoothScan).toHaveBeenCalledTimes(1);
  });

  it('uses the built-in WiFi adapter when no override is provided', async () => {
    const tool = createConnectivityCapability().tools.find(
      (candidate) => candidate.name === 'wifi_get_info',
    );
    await expect(tool?.handler({}, {})).resolves.toEqual({
      kind: 'json',
      data: { isConnected: true, ssid: undefined },
    });
  });
});
