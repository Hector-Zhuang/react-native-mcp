import {
  InMemoryPolicyStore,
  PermissionManager,
  type PermissionRequester,
  defineMobileTool,
  ReactNativeMcpError,
} from '../index';

const tool = defineMobileTool({
  name: 'contacts_read',
  description: 'read contacts',
  inputShape: {},
  permission: { reason: 'unit test', androidPermissions: ['READ_CONTACTS'] },
  handler: async () => ({ kind: 'empty' as const }),
});

describe('PermissionManager', () => {
  it('fails closed without a requester under the default ask policy', async () => {
    const manager = new PermissionManager();
    await expect(manager.ensure(tool)).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
  });

  it('allows when policy is allow without invoking requester', async () => {
    const requester = jest.fn();
    const manager = new PermissionManager({ requester });
    await manager.setPolicy(tool, 'allow');
    await manager.ensure(tool);
    expect(requester).not.toHaveBeenCalled();
  });

  it('denies when policy is deny', async () => {
    const manager = new PermissionManager();
    await manager.setPolicy(tool, 'deny');
    await expect(manager.ensure(tool)).rejects.toBeInstanceOf(ReactNativeMcpError);
  });

  it('asks and remembers "always" via the store', async () => {
    const store = new InMemoryPolicyStore();
    const requester: PermissionRequester = jest
      .fn()
      .mockResolvedValue({ granted: true, remember: 'always' });
    const manager = new PermissionManager({ requester, store });

    await manager.ensure(tool);
    await manager.ensure(tool);

    expect(requester).toHaveBeenCalledTimes(1);
    expect(store.get('contacts_read')).toBe('allow');
  });

  it('remembers grants and denials for the session only', async () => {
    const grant: PermissionRequester = jest
      .fn()
      .mockResolvedValueOnce({ granted: true, remember: 'session' });
    const manager = new PermissionManager({ requester: grant });
    await manager.ensure(tool);
    await manager.ensure(tool);
    expect(grant).toHaveBeenCalledTimes(1);

    const deny: PermissionRequester = jest
      .fn()
      .mockResolvedValueOnce({ granted: false, remember: 'session' });
    const manager2 = new PermissionManager({ requester: deny });
    await expect(manager2.ensure(tool)).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
    await expect(manager2.ensure(tool)).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
    expect(deny).toHaveBeenCalledTimes(1);
  });
});
