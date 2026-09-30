import { z } from 'zod';
import { ReactNativeMcpError, defineMobileTool, jsonResult } from '@react-native-mcp/core';
import type { ReactNativeMcpCapability } from '@react-native-mcp/core';

export interface FileAdapters {
  downloadFile?: (options: {
    url: string;
    header?: Record<string, string>;
    timeout?: number;
    filePath?: string;
  }) => Promise<{ tempFilePath: string; statusCode: number }>;
  uploadFile?: (options: {
    url: string;
    filePath: string;
    name: string;
    header?: Record<string, string>;
    formData?: Record<string, string>;
    timeout?: number;
  }) => Promise<{ data: string; statusCode: number }>;
  removeFile?: (filePath: string) => Promise<void>;
  getFileInfo?: (options: {
    filePath: string;
    digestAlgorithm?: 'md5' | 'sha1' | 'sha256';
  }) => Promise<{ size: number; digest: string }>;
}

function requireAdapter<T>(adapter: T | undefined, name: string): T {
  if (!adapter) {
    throw ReactNativeMcpError.unavailable(
      name,
      'Install a React Native file library such as react-native-fs and provide a FileAdapters implementation.',
    );
  }
  return adapter;
}

export function createFileCapability(adapters: FileAdapters = {}): ReactNativeMcpCapability {
  const downloadFile = defineMobileTool({
    name: 'file_download',
    description: 'Download a remote file to local device storage.',
    inputShape: {
      url: z.string().url(),
      header: z.record(z.string()).optional(),
      timeout: z.number().int().positive().optional(),
      filePath: z.string().optional(),
    },
    handler: async (input) =>
      jsonResult(await requireAdapter(adapters.downloadFile, 'File download')(input)),
  });
  const uploadFile = defineMobileTool({
    name: 'file_upload',
    description: 'Upload a local file to a remote HTTP endpoint.',
    inputShape: {
      url: z.string().url(),
      filePath: z.string().min(1),
      name: z.string().min(1),
      header: z.record(z.string()).optional(),
      formData: z.record(z.string()).optional(),
      timeout: z.number().int().positive().optional(),
    },
    handler: async (input) =>
      jsonResult(await requireAdapter(adapters.uploadFile, 'File upload')(input)),
  });
  const removeFile = defineMobileTool({
    name: 'file_remove',
    description: 'Delete a local file from device storage.',
    inputShape: { filePath: z.string().min(1) },
    annotations: { destructiveHint: true, idempotentHint: true },
    handler: async (input) => {
      await requireAdapter(adapters.removeFile, 'File deletion')(input.filePath);
      return jsonResult({ removed: true, filePath: input.filePath });
    },
  });
  const getFileInfo = defineMobileTool({
    name: 'file_get_info',
    description: 'Read local file size and an optional cryptographic digest.',
    inputShape: {
      filePath: z.string().min(1),
      digestAlgorithm: z.enum(['md5', 'sha1', 'sha256']).optional(),
    },
    annotations: { readOnlyHint: true },
    handler: async (input) =>
      jsonResult(await requireAdapter(adapters.getFileInfo, 'File metadata')(input)),
  });
  return {
    name: 'file',
    version: '0.1.0',
    tools: [downloadFile, uploadFile, removeFile, getFileInfo],
  };
}
