import { z } from 'zod';
import {
  ReactNativeMcpError,
  defineMobileTool,
  emptyResult,
  jsonResult,
} from '@react-native-mcp/core';
import type { ReactNativeMcpCapability } from '@react-native-mcp/core';
import { createMMKV } from 'react-native-mmkv';

export interface StorageAdapter {
  getString(key: string): Promise<string | undefined> | string | undefined;
  setString(key: string, value: string): Promise<void> | void;
  remove(key: string): Promise<void> | void;
  clear(): Promise<void> | void;
  getAllKeys(): Promise<string[]> | string[];
  getSize(): Promise<number> | number;
}

function createMmkvStorageAdapter(): StorageAdapter {
  const storage = createMMKV();
  return {
    getString: (key) => storage.getString(key),
    setString: (key, value) => storage.set(key, value),
    remove: (key) => {
      storage.remove(key);
    },
    clear: () => storage.clearAll(),
    getAllKeys: () => storage.getAllKeys(),
    getSize: () => storage.byteSize,
  };
}

function serialize(value: unknown): string {
  const serialized = JSON.stringify(value);
  if (serialized === undefined) {
    throw ReactNativeMcpError.invalidParams('Storage data must be JSON serializable.');
  }
  return serialized;
}

export function createStorageCapability(
  adapter: StorageAdapter = createMmkvStorageAdapter(),
): ReactNativeMcpCapability {
  const getStorage = defineMobileTool({
    name: 'storage_get',
    description: 'Read and JSON-decode a value from persistent device storage.',
    inputShape: { key: z.string().min(1) },
    annotations: { readOnlyHint: true, idempotentHint: true },
    handler: async (input) => {
      const value = await adapter.getString(input.key);
      return jsonResult({ key: input.key, value: value === undefined ? null : JSON.parse(value) });
    },
  });
  const setStorage = defineMobileTool({
    name: 'storage_set',
    description: 'JSON-encode and persist a value on the device.',
    inputShape: { key: z.string().min(1), data: z.unknown() },
    handler: async (input) => {
      await adapter.setString(input.key, serialize(input.data));
      return emptyResult();
    },
  });
  const removeStorage = defineMobileTool({
    name: 'storage_remove',
    description: 'Remove one value from persistent device storage.',
    inputShape: { key: z.string().min(1) },
    annotations: { destructiveHint: true, idempotentHint: true },
    handler: async (input) => {
      await adapter.remove(input.key);
      return emptyResult();
    },
  });
  const clearStorage = defineMobileTool({
    name: 'storage_clear',
    description: 'Remove all values from persistent device storage.',
    inputShape: {},
    annotations: { destructiveHint: true, idempotentHint: true },
    handler: async () => {
      await adapter.clear();
      return emptyResult();
    },
  });
  const getStorageInfo = defineMobileTool({
    name: 'storage_get_info',
    description: 'List persistent storage keys and the current encoded size.',
    inputShape: {},
    annotations: { readOnlyHint: true, idempotentHint: true },
    handler: async () => {
      const [keys, currentSize] = await Promise.all([adapter.getAllKeys(), adapter.getSize()]);
      return jsonResult({ keys, currentSize, limitSize: 10240 });
    },
  });
  return {
    name: 'storage',
    version: '0.1.0',
    tools: [getStorage, setStorage, removeStorage, clearStorage, getStorageInfo],
  };
}
