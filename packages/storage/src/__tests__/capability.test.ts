jest.mock('react-native-mmkv', () => {
  const values = new Map<string, string>();
  return {
    createMMKV: () => ({
      getString: (key: string) => values.get(key),
      set: (key: string, value: string) => values.set(key, value),
      remove: (key: string) => values.delete(key),
      clearAll: () => values.clear(),
      getAllKeys: () => [...values.keys()],
      get byteSize() {
        return [...values.values()].reduce((size, value) => size + value.length, 0);
      },
    }),
  };
});

import { createStorageCapability } from '../index';

function createMemoryStorage() {
  const values = new Map<string, string>();
  return {
    adapter: {
      getString: (key: string) => values.get(key),
      setString: (key: string, value: string) => {
        values.set(key, value);
      },
      remove: (key: string) => {
        values.delete(key);
      },
      clear: () => {
        values.clear();
      },
      getAllKeys: () => [...values.keys()],
      getSize: () => [...values.values()].reduce((size, value) => size + value.length, 0),
    },
    values,
  };
}

describe('storage capability', () => {
  it('round-trips JSON values and reports storage info', async () => {
    const memory = createMemoryStorage();
    const capability = createStorageCapability(memory.adapter);
    const set = capability.tools.find((tool) => tool.name === 'storage_set');
    const get = capability.tools.find((tool) => tool.name === 'storage_get');
    const info = capability.tools.find((tool) => tool.name === 'storage_get_info');

    await set?.handler({ key: 'profile', data: { name: 'Ada' } }, {});
    await expect(get?.handler({ key: 'profile' }, {})).resolves.toEqual({
      kind: 'json',
      data: { key: 'profile', value: { name: 'Ada' } },
    });
    await expect(info?.handler({}, {})).resolves.toMatchObject({
      kind: 'json',
      data: { keys: ['profile'], limitSize: 10240 },
    });
  });

  it('uses MMKV when no adapter is configured', async () => {
    const capability = createStorageCapability();
    const set = capability.tools.find((tool) => tool.name === 'storage_set');
    const get = capability.tools.find((tool) => tool.name === 'storage_get');

    await set?.handler({ key: 'enabled', data: true }, {});
    await expect(get?.handler({ key: 'enabled' }, {})).resolves.toEqual({
      kind: 'json',
      data: { key: 'enabled', value: true },
    });
  });
});
