import type { ReactNativeMcpCapability } from '@react-native-mcp/core';
import { shareTool } from './tools/share';

export const SHARE_CAPABILITY_VERSION = '0.1.0';

export function createShareCapability(): ReactNativeMcpCapability {
  return {
    name: 'share',
    version: SHARE_CAPABILITY_VERSION,
    tools: [shareTool],
  };
}
