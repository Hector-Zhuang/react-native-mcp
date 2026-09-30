import type { ReactNativeMcpCapability } from '@react-native-mcp/core';
import { getCurrentPositionTool } from './tools/getCurrentPosition';

export const LOCATION_CAPABILITY_VERSION = '0.1.0';

export function createLocationCapability(): ReactNativeMcpCapability {
  return {
    name: 'location',
    version: LOCATION_CAPABILITY_VERSION,
    tools: [getCurrentPositionTool],
  };
}
