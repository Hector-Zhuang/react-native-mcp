import { z, type ZodRawShape } from 'zod';
import type { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';
import type { MobileErrorCode } from './errors';

export type { MobileErrorCode };

export interface PermissionRequirement {
  id?: string;

  reason?: string;

  iosUsageKeys?: string[];

  androidPermissions?: string[];

  opensSystemUI?: boolean;
}

export type MobileToolResult =
  | { kind: 'empty' }
  | { kind: 'text'; text: string }
  | { kind: 'json'; data: unknown }
  | {
      kind: 'media';
      mimeType: string;

      dataBase64: string;

      caption?: string;
    };

export interface MobileToolContext {
  signal?: AbortSignal;
}

export interface MobileTool<
  TShape extends ZodRawShape = ZodRawShape,
  TInput = z.infer<z.ZodObject<TShape>>,
> {
  name: string;

  description: string;

  inputShape: TShape;

  annotations?: ToolAnnotations;

  permission?: PermissionRequirement;

  handler: (input: TInput, ctx: MobileToolContext) => Promise<MobileToolResult>;
}

export type AnyMobileTool = MobileTool<ZodRawShape, any>;

export interface ReactNativeMcpCapability {
  name: string;

  version: string;
  tools: AnyMobileTool[];

  iosUsageDescriptions?: Record<string, string>;

  androidPermissions?: string[];
}
