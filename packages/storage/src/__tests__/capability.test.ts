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

  it('reads and writes multiple keys in one call', async () => {
    const memory = createMemoryStorage();
    const capability = createStorageCapability(memory.adapter);
    const setMany = capability.tools.find((tool) => tool.name === 'storage_set_many');
    const getMany = capability.tools.find((tool) => tool.name === 'storage_get_many');

    await setMany?.handler(
      {
        entries: {
          profile: { name: 'Ada' },
          flags: [true, 2],
        },
      },
      {},
    );
    await expect(getMany?.handler({ keys: ['profile', 'flags', 'missing'] }, {})).resolves.toEqual({
      kind: 'json',
      data: {
        values: {
          profile: { name: 'Ada' },
          flags: [true, 2],
          missing: null,
        },
      },
    });
  });

  it('reports key existence without decoding values', async () => {
    const memory = createMemoryStorage();
    const capability = createStorageCapability(memory.adapter);
    const set = capability.tools.find((tool) => tool.name === 'storage_set');
    const has = capability.tools.find((tool) => tool.name === 'storage_has');
    const remove = capability.tools.find((tool) => tool.name === 'storage_remove');

    await set?.handler({ key: 'profile', data: { name: 'Ada' } }, {});
    await expect(has?.handler({ key: 'profile' }, {})).resolves.toEqual({
      kind: 'json',
      data: { key: 'profile', exists: true },
    });
    await expect(has?.handler({ key: 'missing' }, {})).resolves.toEqual({
      kind: 'json',
      data: { key: 'missing', exists: false },
    });

    await remove?.handler({ key: 'profile' }, {});
    await expect(has?.handler({ key: 'profile' }, {})).resolves.toMatchObject({
      data: { key: 'profile', exists: false },
    });
  });

  it('rejects non-serializable values in storage_set_many without writing anything', async () => {
    const memory = createMemoryStorage();
    const capability = createStorageCapability(memory.adapter);
    const setMany = capability.tools.find((tool) => tool.name === 'storage_set_many');

    await expect(setMany?.handler({ entries: { ok: 1, bad: 2n } }, {})).rejects.toMatchObject({
      code: 'INVALID_PARAMS',
    });
    expect(memory.values.size).toBe(0);
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
