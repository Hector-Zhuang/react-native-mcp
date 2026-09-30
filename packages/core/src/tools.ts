import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { normalizeError } from './errors';
import type { MobileTool, MobileToolResult, PermissionRequirement } from './types';
import type { ZodRawShape } from 'zod';

export function defineMobileTool<TShape extends ZodRawShape>(
  tool: MobileTool<TShape>,
): MobileTool<TShape> {
  return tool;
}

export function permissionId(toolName: string, requirement?: PermissionRequirement): string {
  return requirement?.id ?? toolName;
}

export function emptyResult(): MobileToolResult {
  return { kind: 'empty' };
}

export function textResult(text: string): MobileToolResult {
  return { kind: 'text', text };
}

export function jsonResult(data: unknown): MobileToolResult {
  return { kind: 'json', data };
}

export function imageResult(
  dataBase64: string,
  mimeType: 'image/png' | 'image/jpeg' | 'image/webp' | (string & {}) = 'image/jpeg',
  caption?: string,
): MobileToolResult {
  return { kind: 'media', mimeType, dataBase64, ...(caption ? { caption } : {}) };
}

export function toCallToolResult(result: MobileToolResult): CallToolResult {
  switch (result.kind) {
    case 'empty':
      return { content: [] };
    case 'text':
      return { content: [{ type: 'text', text: result.text }] };
    case 'json':
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result.data, null, 2),
          },
        ],
      };
    case 'media':
      return {
        content: [
          {
            type: 'image',
            data: result.dataBase64,
            mimeType: result.mimeType,
          },
          ...(result.caption ? [{ type: 'text' as const, text: result.caption }] : []),
        ],
      };
  }
}

export function toErrorToolResult(error: unknown): CallToolResult {
  const payload = normalizeError(error);
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({ error: payload }, null, 2),
      },
    ],
    isError: true,
  };
}
