import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import type { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';
import { ReactNativeMcpError } from '../errors';
import { hasGlobalWebSocket } from '../platform';

export interface WebSocketBridgeTransportOptions {
  url: string;

  token?: string;

  protocols?: string | string[];
}

const WS_OPEN = 1;

function buildUrl(url: string, token?: string): string {
  if (!token || url.includes('token=')) {
    return url;
  }
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}token=${encodeURIComponent(token)}`;
}

export class WebSocketBridgeTransport implements Transport {
  private readonly url: string;
  private readonly protocols?: string | string[];
  private socket?: WebSocket;

  onmessage?: (message: JSONRPCMessage) => void;
  onerror?: (error: Error) => void;
  onclose?: () => void;

  constructor(options: WebSocketBridgeTransportOptions) {
    this.url = buildUrl(options.url, options.token);
    this.protocols = options.protocols;
  }

  async start(): Promise<void> {
    if (!hasGlobalWebSocket()) {
      throw ReactNativeMcpError.unavailable(
        'WebSocket bridge',
        'no global WebSocket implementation is available in this runtime',
      );
    }

    const WebSocketImpl = globalThis.WebSocket as new (
      url: string,
      protocols?: string | string[],
    ) => WebSocket;

    await new Promise<void>((resolve, reject) => {
      const socket = this.protocols
        ? new WebSocketImpl(this.url, this.protocols)
        : new WebSocketImpl(this.url);

      this.socket = socket;
      let opened = false;

      socket.onopen = () => {
        opened = true;
        resolve();
      };

      socket.onerror = () => {
        const error = new Error(`WebSocket bridge error for ${this.url}.`);
        if (!opened) {
          reject(error);
        }
        this.onerror?.(error);
      };

      socket.onclose = () => {
        if (!opened) {
          reject(new Error(`WebSocket bridge closed before opening: ${this.url}`));
          return;
        }
        this.onclose?.();
      };

      socket.onmessage = (event) => {
        try {
          const raw =
            typeof event.data === 'string'
              ? event.data
              : new TextDecoder().decode(event.data as ArrayBuffer);
          this.onmessage?.(JSON.parse(raw) as JSONRPCMessage);
        } catch (error) {
          this.onerror?.(error instanceof Error ? error : new Error(String(error)));
        }
      };
    });
  }

  async send(message: JSONRPCMessage): Promise<void> {
    if (!this.socket || this.socket.readyState !== WS_OPEN) {
      throw new ReactNativeMcpError(
        'UNAVAILABLE',
        'WebSocket bridge is not connected.',
        'Reconnect the bridge transport before sending messages.',
      );
    }
    this.socket.send(JSON.stringify(message));
  }

  async close(): Promise<void> {
    this.socket?.close();
  }
}
