export type MobileRuntime = 'react-native' | 'node' | 'unknown';

export function detectRuntime(): MobileRuntime {
  if (
    typeof navigator !== 'undefined' &&
    (navigator as { product?: string }).product === 'ReactNative'
  ) {
    return 'react-native';
  }

  if (
    typeof process !== 'undefined' &&
    (process as { versions?: { node?: string } }).versions?.node != null
  ) {
    return 'node';
  }

  return 'unknown';
}

export function hasGlobalWebSocket(): boolean {
  return typeof (globalThis as { WebSocket?: unknown }).WebSocket === 'function';
}
