import { z } from 'zod';
import WifiManager from 'react-native-wifi-reborn';
import { BleManager } from 'react-native-ble-plx';
import NativeConnectivity from './NativeConnectivity';
import {
  ReactNativeMcpError,
  defineMobileTool,
  emptyResult,
  jsonResult,
  textResult,
} from '@react-native-mcp/core';
import type { ReactNativeMcpCapability } from '@react-native-mcp/core';

export interface WifiInfo {
  ssid?: string;
  bssid?: string;
  ipAddress?: string;
  subnet?: string;
  frequency?: number;
  linkSpeed?: number;
  signalStrength?: number;
  isConnected: boolean;
  error?: string;
}
export type BluetoothState =
  'unknown' | 'resetting' | 'unsupported' | 'unauthorized' | 'poweredOff' | 'poweredOn';
export interface BluetoothDevice {
  id: string;
  name?: string;
  localName?: string;
  rssi?: number;
  serviceUUIDs?: string[];
}
export interface ConnectivityAdapters {
  setFlashlight?: (enabled: boolean) => Promise<void> | void;
  getWifiInfo?: () => Promise<WifiInfo> | WifiInfo;
  getBluetoothState?: () => Promise<BluetoothState> | BluetoothState;
  scanBluetooth?: (options: {
    timeoutMs: number;
    serviceUUIDs?: string[];
  }) => Promise<BluetoothDevice[]>;
  stopBluetoothScan?: () => Promise<void> | void;
}

let bleManager: BleManager | undefined;

function getDefaultAdapters(): ConnectivityAdapters {
  return {
    setFlashlight: async (enabled) => {
      if (!NativeConnectivity) {
        throw ReactNativeMcpError.unavailable(
          'Flashlight',
          'the native Connectivity TurboModule is not linked',
        );
      }
      await NativeConnectivity.setFlashlight(enabled);
    },
    getWifiInfo: async () => {
      try {
        const ssid = await WifiManager.getCurrentWifiSSID();
        return { ssid, isConnected: true };
      } catch (error) {
        return {
          isConnected: false,
          error:
            error instanceof Error
              ? error.message
              : 'The connected Wi-Fi network name could not be read. Check Location permission.',
        };
      }
    },
    getBluetoothState: async () => {
      if (!bleManager) {
        bleManager = new BleManager();
      }
      const state = await bleManager.state();
      return state.toLowerCase() as BluetoothState;
    },
    scanBluetooth: async ({ timeoutMs, serviceUUIDs }) => {
      if (!bleManager) {
        bleManager = new BleManager();
      }
      const devices = new Map<string, BluetoothDevice>();
      await bleManager.startDeviceScan(serviceUUIDs ?? null, null, (error, device) => {
        if (error || !device) return;
        devices.set(device.id, {
          id: device.id,
          ...(device.name ? { name: device.name } : {}),
          ...(device.localName ? { localName: device.localName } : {}),
          ...(device.rssi !== null ? { rssi: device.rssi } : {}),
          ...(device.serviceUUIDs ? { serviceUUIDs: device.serviceUUIDs } : {}),
        });
      });
      await new Promise((resolve) => setTimeout(resolve, timeoutMs));
      await bleManager.stopDeviceScan();
      return [...devices.values()];
    },
    stopBluetoothScan: async () => {
      if (bleManager) await bleManager.stopDeviceScan();
    },
  };
}
function requireAdapter<T>(adapter: T | undefined, name: string): T {
  if (!adapter)
    throw ReactNativeMcpError.unavailable(
      name,
      'Install a compatible React Native community module and provide a ConnectivityAdapters implementation.',
    );
  return adapter;
}
export function createConnectivityCapability(
  adapters: ConnectivityAdapters = {},
): ReactNativeMcpCapability {
  const resolvedAdapters = { ...getDefaultAdapters(), ...adapters };
  const setFlashlight = defineMobileTool({
    name: 'flashlight_set',
    description: 'Turn the device flashlight on or off.',
    inputShape: { enabled: z.boolean() },
    permission: {
      reason: 'Control the device flashlight.',
      iosUsageKeys: ['NSCameraUsageDescription'],
      androidPermissions: ['android.permission.CAMERA'],
    },
    handler: async (input) => {
      await requireAdapter(resolvedAdapters.setFlashlight, 'Flashlight')(input.enabled);
      return textResult(input.enabled ? 'Flashlight turned on.' : 'Flashlight turned off.');
    },
  });
  const getWifiInfo = defineMobileTool({
    name: 'wifi_get_info',
    description: 'Return the current WiFi connection details available to the operating system.',
    inputShape: {},
    annotations: { readOnlyHint: true, idempotentHint: true },
    permission: {
      reason: 'Read the current WiFi connection information.',
      iosUsageKeys: ['NSLocationWhenInUseUsageDescription'],
      androidPermissions: ['android.permission.ACCESS_FINE_LOCATION'],
    },
    handler: async () =>
      jsonResult(await requireAdapter(resolvedAdapters.getWifiInfo, 'WiFi information')()),
  });
  const getBluetoothState = defineMobileTool({
    name: 'bluetooth_get_state',
    description: 'Return the current Bluetooth adapter state.',
    inputShape: {},
    annotations: { readOnlyHint: true, idempotentHint: true },
    handler: async () =>
      jsonResult({
        state: await requireAdapter(resolvedAdapters.getBluetoothState, 'Bluetooth')(),
      }),
  });
  const scanBluetooth = defineMobileTool({
    name: 'bluetooth_scan',
    description: 'Scan for nearby Bluetooth Low Energy devices for a bounded period.',
    inputShape: {
      timeoutMs: z.number().int().min(1000).max(60000).default(10000),
      serviceUUIDs: z.array(z.string().min(1)).optional(),
    },
    permission: {
      reason: 'Scan for nearby Bluetooth devices.',
      iosUsageKeys: ['NSBluetoothAlwaysUsageDescription'],
      androidPermissions: [
        'android.permission.BLUETOOTH_SCAN',
        'android.permission.BLUETOOTH_CONNECT',
      ],
    },
    handler: async (input) =>
      jsonResult(
        await requireAdapter(
          resolvedAdapters.scanBluetooth,
          'Bluetooth scan',
        )({ timeoutMs: input.timeoutMs, serviceUUIDs: input.serviceUUIDs }),
      ),
  });
  const stopBluetoothScan = defineMobileTool({
    name: 'bluetooth_stop_scan',
    description: 'Stop an active Bluetooth Low Energy scan.',
    inputShape: {},
    annotations: { idempotentHint: true },
    handler: async () => {
      await requireAdapter(resolvedAdapters.stopBluetoothScan, 'Bluetooth scan')();
      return emptyResult();
    },
  });
  return {
    name: 'connectivity',
    version: '0.1.0',
    tools: [setFlashlight, getWifiInfo, getBluetoothState, scanBluetooth, stopBluetoothScan],
  };
}
