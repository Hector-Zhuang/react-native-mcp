import { ReactNativeMcpError } from '../errors';
import { permissionId } from '../tools';
import type { MobileTool, PermissionRequirement } from '../types';

export type ToolPolicy = 'allow' | 'ask' | 'deny';

export interface PolicyStore {
  get(id: string): ToolPolicy | undefined | Promise<ToolPolicy | undefined>;
  set(id: string, policy: ToolPolicy): void | Promise<void>;
}

export class InMemoryPolicyStore implements PolicyStore {
  private readonly policies = new Map<string, ToolPolicy>();

  get(id: string): ToolPolicy | undefined {
    return this.policies.get(id);
  }

  set(id: string, policy: ToolPolicy): void {
    this.policies.set(id, policy);
  }
}

export interface PermissionRequest {
  toolName: string;
  description: string;
  reason?: string;
  opensSystemUI?: boolean;
  iosUsageKeys?: string[];
  androidPermissions?: string[];
}

export interface PermissionDecision {
  granted: boolean;

  remember?: 'always' | 'session';
}

export type PermissionRequester = (
  request: PermissionRequest,
) => PermissionDecision | Promise<PermissionDecision>;

export interface PermissionManagerOptions {
  requester?: PermissionRequester;
  store?: PolicyStore;

  defaultPolicy?: ToolPolicy;
}

export class PermissionManager {
  private readonly requester?: PermissionRequester;
  private readonly store: PolicyStore;
  private readonly defaultPolicy: ToolPolicy;
  private readonly sessionGrants = new Set<string>();
  private readonly sessionDenials = new Set<string>();

  constructor(options: PermissionManagerOptions = {}) {
    this.requester = options.requester;
    this.store = options.store ?? new InMemoryPolicyStore();
    this.defaultPolicy = options.defaultPolicy ?? 'ask';
  }

  async setPolicy(tool: MobileTool | string, policy: ToolPolicy): Promise<void> {
    const name = typeof tool === 'string' ? tool : tool.name;
    await this.store.set(name, policy);
  }

  async getPolicy(id: string): Promise<ToolPolicy | undefined> {
    return this.store.get(id);
  }

  async ensure(tool: MobileTool): Promise<void> {
    const requirement: PermissionRequirement | undefined = tool.permission;

    if (!requirement) {
      return;
    }
    const id = permissionId(tool.name, requirement);

    if (this.sessionGrants.has(id)) {
      return;
    }
    if (this.sessionDenials.has(id)) {
      throw ReactNativeMcpError.permissionDenied(
        `The user denied permission for "${tool.name}" in this session.`,
      );
    }

    const persisted = await this.store.get(id);
    const policy = persisted ?? this.defaultPolicy;

    if (policy === 'allow') {
      return;
    }
    if (policy === 'deny') {
      throw ReactNativeMcpError.permissionDenied(
        `Permission for "${tool.name}" is blocked by policy.`,
        'Update the tool permission policy if this call should be allowed.',
      );
    }

    const decision = await this.invokeRequester(tool, requirement);
    if (!decision.granted) {
      if (decision.remember === 'session') {
        this.sessionDenials.add(id);
      }
      throw ReactNativeMcpError.permissionDenied(
        `The user did not grant permission for "${tool.name}".`,
      );
    }

    if (decision.remember === 'always') {
      await this.store.set(id, 'allow');
    } else if (decision.remember === 'session') {
      this.sessionGrants.add(id);
    }
  }

  private invokeRequester(
    tool: MobileTool,
    requirement?: PermissionRequirement,
  ): Promise<PermissionDecision> | PermissionDecision {
    if (!this.requester) {
      throw ReactNativeMcpError.permissionDenied(
        `No permission requester is configured for "${tool.name}".`,
        'Pass a permissionRequester to createReactNativeMcpServer, or set an "allow" policy for this tool.',
      );
    }

    return this.requester({
      toolName: tool.name,
      description: tool.description,
      reason: requirement?.reason,
      opensSystemUI: requirement?.opensSystemUI,
      iosUsageKeys: requirement?.iosUsageKeys,
      androidPermissions: requirement?.androidPermissions,
    });
  }
}
