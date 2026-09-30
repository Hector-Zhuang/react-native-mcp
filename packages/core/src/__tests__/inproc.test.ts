import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { z } from 'zod';
import {
  createInProcessLink,
  createReactNativeMcpServer,
  defineMobileTool,
  InMemoryPolicyStore,
  jsonResult,
  ReactNativeMcpError,
  textResult,
  type ReactNativeMcpCapability,
} from '../index';

function buildCapability(): ReactNativeMcpCapability {
  return {
    name: 'test-capability',
    version: '0.1.0',
    tools: [
      defineMobileTool({
        name: 'demo_echo',
        description: 'Echo a message.',
        inputShape: { message: z.string() },
        annotations: { readOnlyHint: true },
        handler: async (input) => jsonResult({ echo: input.message }),
      }),
      defineMobileTool({
        name: 'demo_ping',
        description: 'Ping without parameters.',
        inputShape: {},
        handler: async () => textResult('pong'),
      }),
      defineMobileTool({
        name: 'secret_read',
        description: 'Read a secret.',
        inputShape: {},
        permission: {
          reason: 'Needed for tests',
          iosUsageKeys: ['NSContactsUsageDescription'],
        },
        handler: async () => textResult('secret'),
      }),
      defineMobileTool({
        name: 'broken_call',
        description: 'Always fails.',
        inputShape: {},
        handler: async () => {
          throw ReactNativeMcpError.unavailable('TestFeature');
        },
      }),
    ],
  };
}

describe('react native mcp server over in-process transport', () => {
  it('completes initialize, tools/list and tools/call round-trips', async () => {
    const store = new InMemoryPolicyStore();
    await store.set('secret_read', 'allow');

    const server = createReactNativeMcpServer({
      capabilities: [buildCapability()],
      policyStore: store,
    });
    const link = createInProcessLink();
    const client = new Client({ name: 'test-agent', version: '1.0.0' }, { capabilities: {} });

    await Promise.all([server.connect(link.serverTransport), client.connect(link.clientTransport)]);

    const listed = await client.listTools();
    const names = listed.tools.map((tool) => tool.name).sort();
    expect(names).toEqual(['broken_call', 'demo_echo', 'demo_ping', 'secret_read']);

    const echo = await client.callTool(
      { name: 'demo_echo', arguments: { message: 'hi' } },
      undefined,
    );
    expect(echo.isError).toBeUndefined();
    const echoText = (echo.content as Array<{ text: string }>)[0]!.text;
    expect(JSON.parse(echoText)).toEqual({ echo: 'hi' });

    const ping = await client.callTool({ name: 'demo_ping', arguments: {} }, undefined);
    expect((ping.content as Array<{ text: string }>)[0]!.text).toBe('pong');

    const secret = await client.callTool({ name: 'secret_read', arguments: {} }, undefined);
    expect(secret.isError).toBeUndefined();

    const broken = await client.callTool({ name: 'broken_call', arguments: {} }, undefined);
    expect(broken.isError).toBe(true);
    const brokenText = (broken.content as Array<{ text: string }>)[0]!.text;
    expect(JSON.parse(brokenText).error).toMatchObject({
      code: 'UNAVAILABLE',
    });

    const guarded = await client.callTool(
      { name: 'demo_echo', arguments: { message: 'x' } },
      undefined,
    );

    expect(guarded.isError).toBeUndefined();

    await client.close();
    await server.close();
  });

  it('denies calls blocked by policy without invoking native logic', async () => {
    const store = new InMemoryPolicyStore();
    await store.set('secret_read', 'deny');
    const server = createReactNativeMcpServer({
      capabilities: [buildCapability()],
      policyStore: store,
      permissionRequester: jest.fn(),
    });
    const link = createInProcessLink();
    const client = new Client({ name: 'test-agent', version: '1.0.0' }, { capabilities: {} });
    await Promise.all([server.connect(link.serverTransport), client.connect(link.clientTransport)]);

    const result = await client.callTool({ name: 'secret_read', arguments: {} }, undefined);
    expect(result.isError).toBe(true);

    await client.close();
    await server.close();
  });
});
