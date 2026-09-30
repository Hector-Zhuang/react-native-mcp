import { createFileCapability } from '../index';

describe('file capability', () => {
  it('maps file operations and reports unavailable adapters', async () => {
    const capability = createFileCapability({
      removeFile: async () => undefined,
      getFileInfo: async (options) => ({
        size: options.filePath.length,
        digest: 'digest',
      }),
    });
    const info = capability.tools.find((tool) => tool.name === 'file_get_info');
    await expect(
      info?.handler({ filePath: '/tmp/a.txt', digestAlgorithm: 'sha256' }, {}),
    ).resolves.toEqual({
      kind: 'json',
      data: { size: 10, digest: 'digest' },
    });

    const missing = createFileCapability().tools.find((tool) => tool.name === 'file_upload');
    await expect(
      missing?.handler({ url: 'https://example.com/upload', filePath: '/tmp/a', name: 'file' }, {}),
    ).rejects.toMatchObject({ code: 'UNAVAILABLE' });
  });
});
