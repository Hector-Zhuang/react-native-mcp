import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import {
  PermissionManager,
  type PermissionRequester,
  type PolicyStore,
  type ToolPolicy,
} from './permissions';
import { toCallToolResult, toErrorToolResult } from './tools';
import type { AnyMobileTool, ReactNativeMcpCapability, MobileToolContext } from './types';

export interface ReactNativeMcpServerOptions {
  name?: string;
  version?: string;
  capabilities?: ReactNativeMcpCapability[];
  permissionRequester?: PermissionRequester;
  policyStore?: PolicyStore;
  defaultPolicy?: ToolPolicy;
  instructions?: string;
}

export interface ReactNativeMcpServer {
  mcp: McpServer;
  permissions: PermissionManager;
  capabilities: ReactNativeMcpCapability[];
  connect(transport: Transport): Promise<void>;
  close(): Promise<void>;
}

function buildInstructions(capabilities: ReactNativeMcpCapability[]): string {
  const lines = capabilities.map(
    (cap) => `- ${cap.name} (${cap.version}): ${cap.tools.map((tool) => tool.name).join(', ')}`,
  );
  return [
    'React Native MCP server exposing native device capabilities as tools.',
    'Every call may surface an isError result with a structured { error: { code, message, recoveryHint } } payload.',
    ...(lines.length > 0 ? ['Available capabilities:', ...lines] : []),
  ].join('\n');
}

function registerTool(mcp: McpServer, permissions: PermissionManager, tool: AnyMobileTool): void {
  const annotations = {
    ...(tool.permission?.opensSystemUI ? { openWorldHint: true as const } : {}),
    ...tool.annotations,
  };

  mcp.registerTool(
    tool.name,
    {
      description: tool.description,
      inputSchema: tool.inputShape,
      annotations,
    },
    async (input, extra) => {
      try {
        await permissions.ensure(tool);
        const ctx: MobileToolContext = {
          signal: (extra as { signal?: AbortSignal } | undefined)?.signal,
        };
        const result = await tool.handler(input as never, ctx);
        return toCallToolResult(result);
      } catch (error) {
        return toErrorToolResult(error);
      }
    },
  );
}

export function createReactNativeMcpServer(
  options: ReactNativeMcpServerOptions = {},
): ReactNativeMcpServer {
  const capabilities = options.capabilities ?? [];
  const mcp = new McpServer(
    {
      name: options.name ?? 'react-native-mcp',
      version: options.version ?? '0.1.0',
    },
    {
      instructions: options.instructions ?? buildInstructions(capabilities),
    },
  );

  const permissions = new PermissionManager({
    requester: options.permissionRequester,
    store: options.policyStore,
    defaultPolicy: options.defaultPolicy,
  });

  for (const capability of capabilities) {
    for (const tool of capability.tools) {
      registerTool(mcp, permissions, tool);
    }
  }

  return {
    mcp,
    permissions,
    capabilities,
    connect: (transport: Transport) => mcp.connect(transport),
    close: () => mcp.close(),
  };
}

export function aggregateUsageDescriptions(
  capabilities: ReactNativeMcpCapability[],
): Record<string, string> {
  const merged: Record<string, string> = {};
  for (const capability of capabilities) {
    for (const [key, value] of Object.entries(capability.iosUsageDescriptions ?? {})) {
      if (merged[key] && merged[key] !== value) {
        throw new Error(`Conflicting iOS usage descriptions for "${key}" across capabilities.`);
      }
      merged[key] = value;
    }
  }
  return merged;
}

export function aggregateAndroidPermissions(capabilities: ReactNativeMcpCapability[]): string[] {
  const set = new Set<string>();
  for (const capability of capabilities) {
    for (const permission of capability.androidPermissions ?? []) {
      set.add(permission);
    }
  }
  return [...set].sort();
}
