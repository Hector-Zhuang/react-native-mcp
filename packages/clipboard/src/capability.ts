import type { ReactNativeMcpCapability } from '@react-native-mcp/core';
import { readTextTool } from './tools/readText';
import { writeTextTool } from './tools/writeText';

export const CLIPBOARD_CAPABILITY_VERSION = '0.1.0';

export function createClipboardCapability(): ReactNativeMcpCapability {
  return {
    name: 'clipboard',
    version: CLIPBOARD_CAPABILITY_VERSION,
    tools: [readTextTool, writeTextTool],
  };
}
