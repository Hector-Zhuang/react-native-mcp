import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import type { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';

export class InProcessTransport implements Transport {
  private peer: InProcessTransport | undefined;
  private queue: JSONRPCMessage[] = [];
  private started = false;
  private closed = false;

  onmessage?: (message: JSONRPCMessage) => void;
  onerror?: (error: Error) => void;
  onclose?: () => void;

  static createLinkedPair(): [InProcessTransport, InProcessTransport] {
    const a = new InProcessTransport();
    const b = new InProcessTransport();
    a.peer = b;
    b.peer = a;
    return [a, b];
  }

  async start(): Promise<void> {
    if (this.closed) {
      throw new Error('Cannot start a closed in-process transport.');
    }
    this.started = true;
    this.drainQueue();
  }

  async send(message: JSONRPCMessage): Promise<void> {
    if (!this.peer || this.peer.closed) {
      throw new Error('Peer in-process transport is closed.');
    }
    this.peer.deliver(message);
  }

  async close(): Promise<void> {
    if (this.closed) {
      return;
    }
    this.closed = true;
    this.queue = [];
    if (this.peer && !this.peer.closed) {
      this.peer.closed = true;
      this.peer.onclose?.();
    }
    this.onclose?.();
  }

  private deliver(message: JSONRPCMessage): void {
    if (this.closed) {
      return;
    }
    this.queue.push(message);
    if (this.started) {
      this.drainQueue();
    }
  }

  private drainQueue(): void {
    const pending = this.queue;
    this.queue = [];
    for (const message of pending) {
      queueMicrotask(() => {
        if (!this.closed) {
          this.onmessage?.(message);
        }
      });
    }
  }
}

export function createInProcessLink(): {
  serverTransport: Transport;
  clientTransport: Transport;
} {
  const [serverTransport, clientTransport] = InProcessTransport.createLinkedPair();
  return { serverTransport, clientTransport };
}
