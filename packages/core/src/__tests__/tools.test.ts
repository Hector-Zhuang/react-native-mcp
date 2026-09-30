import {
  defineMobileTool,
  emptyResult,
  imageResult,
  jsonResult,
  ReactNativeMcpError,
  normalizeError,
  textResult,
  toCallToolResult,
  toErrorToolResult,
} from '../index';
import { z } from 'zod';

describe('result helpers', () => {
  it('maps empty results', () => {
    expect(toCallToolResult(emptyResult())).toEqual({ content: [] });
  });

  it('maps text results', () => {
    expect(toCallToolResult(textResult('hello'))).toEqual({
      content: [{ type: 'text', text: 'hello' }],
    });
  });

  it('maps json results as pretty-printed text', () => {
    const result = toCallToolResult(jsonResult({ a: 1 }));
    expect(result.content).toHaveLength(1);
    expect(result.content?.[0]).toMatchObject({ type: 'text' });
    expect(JSON.parse((result.content?.[0] as { text: string }).text)).toEqual({
      a: 1,
    });
  });

  it('maps image media with optional caption', () => {
    const result = toCallToolResult(imageResult('AAAA', 'image/png', 'shot'));
    expect(result.content).toEqual([
      { type: 'image', data: 'AAAA', mimeType: 'image/png' },
      { type: 'text', text: 'shot' },
    ]);
  });
});

describe('defineMobileTool', () => {
  it('returns the same definition with inferred handler input', () => {
    const tool = defineMobileTool({
      name: 'demo_echo',
      description: 'echo',
      inputShape: { message: z.string() },
      handler: async (input) => textResult(input.message),
    });
    expect(tool.name).toBe('demo_echo');
  });
});

describe('error mapping', () => {
  it('preserves ReactNativeMcpError codes and hints', () => {
    const payload = normalizeError(ReactNativeMcpError.unavailable('Camera'));
    expect(payload.code).toBe('UNAVAILABLE');
    expect(payload.recoveryHint).toBeTruthy();
  });

  it('normalizes unknown errors to INTERNAL', () => {
    expect(normalizeError('boom').code).toBe('INTERNAL');
    expect(normalizeError(new Error('x')).message).toBe('x');
  });

  it('produces an isError MCP result with structured payload', () => {
    const result = toErrorToolResult(ReactNativeMcpError.permissionDenied('blocked'));
    expect(result.isError).toBe(true);
    const text = (result.content?.[0] as { text: string }).text;
    expect(JSON.parse(text).error).toMatchObject({
      code: 'PERMISSION_DENIED',
      message: 'blocked',
    });
  });
});
