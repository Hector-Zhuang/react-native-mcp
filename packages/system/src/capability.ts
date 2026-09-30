import { z } from 'zod';
import { Dimensions, Linking, Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import DeviceInfo from 'react-native-device-info';
import SystemSetting from 'react-native-system-setting';
import {
  ReactNativeMcpError,
  defineMobileTool,
  jsonResult,
  textResult,
} from '@react-native-mcp/core';
import type { ReactNativeMcpCapability } from '@react-native-mcp/core';

export interface SystemInfo {
  platform: string;
  version: string;
  system?: string;
  model?: string;
  brand?: string;
  deviceId?: string;
  screenWidth?: number;
  screenHeight?: number;
  scale?: number;
  fontScale?: number;
}

export interface AppBaseInfo {
  appName?: string;
  appVersion?: string;
  appBuild?: string;
  bundleId?: string;
  platform: string;
}

export interface NetworkInfo {
  type: string;
  isConnected?: boolean;
  isInternetReachable?: boolean;
}

export interface SystemCapabilityAdapters {
  getSystemInfo?: () => Promise<SystemInfo> | SystemInfo;
  getAppBaseInfo?: () => Promise<AppBaseInfo> | AppBaseInfo;
  getNetworkInfo?: () => Promise<NetworkInfo> | NetworkInfo;
  getScreenBrightness?: () => Promise<number> | number;
  setScreenBrightness?: (value: number) => Promise<void> | void;
  openUrl?: (url: string) => Promise<void> | void;
}

function defaultSystemInfo(): SystemInfo {
  const window = Dimensions.get('window');
  return {
    platform: Platform.OS,
    version: DeviceInfo.getSystemVersion(),
    system: DeviceInfo.getSystemName(),
    model: DeviceInfo.getModel(),
    brand: DeviceInfo.getBrand(),
    deviceId: DeviceInfo.getDeviceId(),
    screenWidth: window.width,
    screenHeight: window.height,
    scale: window.scale,
    fontScale: window.fontScale,
  };
}

function defaultAppBaseInfo(): AppBaseInfo {
  return {
    platform: Platform.OS,
    appName: DeviceInfo.getApplicationName(),
    appVersion: DeviceInfo.getVersion(),
    appBuild: DeviceInfo.getBuildNumber(),
    bundleId: DeviceInfo.getBundleId(),
  };
}

function defaultNetworkInfo(): Promise<NetworkInfo> {
  return NetInfo.fetch().then((state) => ({
    type: state.type,
    isConnected: state.isConnected ?? false,
    isInternetReachable: state.isInternetReachable ?? undefined,
  }));
}

function defaultScreenBrightness(): Promise<number> {
  return SystemSetting.getBrightness();
}

async function setDefaultScreenBrightness(value: number): Promise<void> {
  const changed = await SystemSetting.setBrightnessForce(value);
  if (!changed) {
    throw ReactNativeMcpError.permissionDenied(
      'Screen brightness permission was not granted.',
      'Grant write settings permission and retry.',
    );
  }
}

export function createSystemCapability(
  adapters: SystemCapabilityAdapters = {},
): ReactNativeMcpCapability {
  const resolvedAdapters = {
    getSystemInfo: defaultSystemInfo,
    getAppBaseInfo: defaultAppBaseInfo,
    getNetworkInfo: defaultNetworkInfo,
    getScreenBrightness: defaultScreenBrightness,
    setScreenBrightness: setDefaultScreenBrightness,
    ...adapters,
  };
  const getSystemInfo = defineMobileTool({
    name: 'system_get_info',
    description: 'Return platform, device and screen information for the current mobile device.',
    inputShape: {},
    annotations: { readOnlyHint: true, idempotentHint: true },
    handler: async () => jsonResult(await resolvedAdapters.getSystemInfo()),
  });
  const getAppBaseInfo = defineMobileTool({
    name: 'system_get_app_base_info',
    description: 'Return application identity and version information for the current mobile app.',
    inputShape: {},
    annotations: { readOnlyHint: true, idempotentHint: true },
    handler: async () => jsonResult(await resolvedAdapters.getAppBaseInfo()),
  });
  const getNetworkType = defineMobileTool({
    name: 'system_get_network_type',
    description: 'Return the current network connection type and reachability.',
    inputShape: {},
    annotations: { readOnlyHint: true },
    handler: async () => {
      return jsonResult(await resolvedAdapters.getNetworkInfo());
    },
  });
  const getScreenBrightness = defineMobileTool({
    name: 'system_get_screen_brightness',
    description: 'Return the current screen brightness as a value from 0 to 1.',
    inputShape: {},
    annotations: { readOnlyHint: true },
    handler: async () => {
      return jsonResult({ value: await resolvedAdapters.getScreenBrightness() });
    },
  });
  const setScreenBrightness = defineMobileTool({
    name: 'system_set_screen_brightness',
    description: 'Set the screen brightness to a value from 0 to 1.',
    inputShape: { value: z.number().min(0).max(1) },
    handler: async (input) => {
      await resolvedAdapters.setScreenBrightness(input.value);
      return textResult('Screen brightness updated.');
    },
  });
  const makePhoneCall = defineMobileTool({
    name: 'system_make_phone_call',
    description: 'Open the native phone dialer for a phone number after explicit user intent.',
    inputShape: { phoneNumber: z.string().min(1) },
    permission: { opensSystemUI: true, reason: 'Open the phone dialer.' },
    handler: async (input) => {
      const openUrl =
        adapters.openUrl ??
        (async (url: string) => {
          await Linking.openURL(url);
        });
      await openUrl(`tel:${input.phoneNumber}`);
      return textResult('Phone dialer opened.');
    },
  });
  return {
    name: 'system',
    version: '0.1.0',
    tools: [
      getSystemInfo,
      getAppBaseInfo,
      getNetworkType,
      getScreenBrightness,
      setScreenBrightness,
      makePhoneCall,
    ],
  };
}
